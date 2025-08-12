const tcb = require('@cloudbase/node-sdk');
const multipart = require('parse-multipart');
const { extractProductInfo } = require('./ocrUtils');
const { analyzeIngredients } = require('./ingredientAnalysisUtils');

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function isHttp(event) {
  return !!event && typeof event === 'object' && 'httpMethod' in event;
}

function json(obj) {
  return JSON.stringify(obj);
}

function response(statusCode, bodyObj, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
      ...headers
    },
    body: json(bodyObj)
  };
}

function guessContentTypeByExt(ext) {
  const e = (ext || '').toLowerCase();
  if (e === 'png') return 'image/png';
  return 'image/jpeg';
}

async function getUid(app) {
  try {
    const info = await app.auth().getUserInfo();
    return info?.uid || '';
  } catch (_) {
    return '';
  }
}

function getHeader(headers, key) {
  if (!headers) return undefined;
  const k = Object.keys(headers).find(h => h.toLowerCase() === key.toLowerCase());
  return k ? headers[k] : undefined;
}

function parseMultipart(event) {
  const contentType = getHeader(event.headers || {}, 'content-type') || '';
  const boundary = multipart.getBoundary(contentType);
  const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
  const parts = multipart.Parse(bodyBuffer, boundary) || [];
  const filePart = parts.find(p => p.filename) || parts[0];
  if (!filePart) return null;
  return {
    buffer: Buffer.from(filePart.data),
    filename: filePart.filename || 'upload.jpg',
    contentType: filePart.type || 'image/jpeg'
  };
}

function parseJsonBody(event) {
  try {
    const bodyStr = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
    return JSON.parse(bodyStr || '{}');
  } catch (_) {
    return {};
  }
}

async function parseIncomingFile(event) {
  // 1) 优先 multipart/form-data
  const ct = getHeader(event.headers || {}, 'content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const mp = parseMultipart(event);
    if (!mp) throw new Error('未检测到上传文件');
    return { fileBuffer: mp.buffer, filename: mp.filename, contentType: mp.contentType };
    }

  // 2) application/json with base64 or imageUrl
  let payload = {};
  if (ct.includes('application/json') || !isHttp(event)) {
    payload = isHttp(event) ? parseJsonBody(event) : (event || {});
  }

  if (payload.imageBase64) {
    const fileBuffer = Buffer.from(payload.imageBase64, 'base64');
    const ext = (payload.fileExtension || 'jpg').toLowerCase();
    const contentType = guessContentTypeByExt(ext);
    return { fileBuffer, filename: `upload.${ext}`, contentType };
  }

  if (payload.imageUrl) {
    return { imageUrl: payload.imageUrl };
  }

  throw new Error('请求体无文件内容或 imageUrl');
}

async function uploadToStorage(app, uid, fileBuffer, filename) {
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const cloudPath = `productpicture/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // 使用 app.uploadFile，直接传 Buffer
  const uploadRes = await app.uploadFile({ cloudPath, fileContent: fileBuffer });
  const fileID = uploadRes.fileID || uploadRes.fileId || cloudPath;

  // 获取临时 URL（用于 OCR/分析用）
  const tmpRes = await app.getTempFileURL({ fileList: [fileID] });
  let tempUrl = '';
  const list = tmpRes?.fileList || tmpRes?.data || tmpRes || [];
  if (Array.isArray(list) && list[0]) {
    tempUrl = list[0].tempFileURL || list[0].tempUrl || list[0].url || '';
  }

  return { fileID, tempUrl, cloudPath };
}

async function ensureTypeAndSize(fileBuffer, contentType) {
  if (!fileBuffer || !fileBuffer.length) throw new Error('空文件');
  if (fileBuffer.length > MAX_SIZE) throw new Error('文件过大，限制 5MB');
  const ct = (contentType || '').toLowerCase();
  if (!ALLOWED_TYPES.some(t => ct.includes(t.split('/')[1]))) {
    throw new Error('仅支持 jpg/jpeg/png');
  }
}

exports.main = async (event) => {
  // 显式指定 env，避免误用默认环境
  const app = tcb.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE });
  const http = isHttp(event);

  try {
    if (http && event.httpMethod === 'OPTIONS') {
      return response(200, { success: true });
    }

    // 身份校验
    const uid = await getUid(app);
    if (!uid) {
      const err = { success: false, message: '未认证用户' };
      return http ? response(401, err) : err;
    }

    // 解析输入
    const parsed = await parseIncomingFile(event);

    let fileID = '';
    let imageUrl = parsed.imageUrl || '';
    let cloudPath = '';

    if (!imageUrl) {
      await ensureTypeAndSize(parsed.fileBuffer, parsed.contentType);
      const uploaded = await uploadToStorage(app, uid, parsed.fileBuffer, parsed.filename);
      fileID = uploaded.fileID;
      imageUrl = uploaded.tempUrl;
      cloudPath = uploaded.cloudPath;
      console.log('上传成功:', { fileID, cloudPath, hasTempUrl: !!imageUrl });
    }

    if (!imageUrl) {
      const err = { success: false, message: '无法获取图片 URL', fileId: fileID || null, cloudPath: cloudPath || null };
      return http ? response(500, err) : err;
    }

    // OCR 提取
    const ocr = await extractProductInfo(imageUrl);
    if (!ocr.success) {
      const err = { success: false, message: 'OCR 提取失败', error: ocr.error, fileId: fileID || null, cloudPath: cloudPath || null };
      return http ? response(502, err) : err;
    }

    // 成分分析
    const analysis = await analyzeIngredients(ocr.productName || '', ocr.ingredients || []);
    if (!analysis.success) {
      const err = { success: false, message: '成分分析失败', error: analysis.error, fileId: fileID || null, cloudPath: cloudPath || null };
      return http ? response(502, err) : err;
    }

    // 入库
    const db = app.database();
    const record = {
      uid,
      fileId: fileID || null,
      imageUrl: imageUrl || null, // 临时 URL，可选
      productName: ocr.productName || '',
      ingredients: Array.isArray(ocr.ingredients) ? ocr.ingredients : [],
      analysis: analysis.analysisResult,
      createdAt: new Date()
    };
    const addRes = await db.collection('product_ingredient_analysis').add(record);

    const resBody = {
      success: true,
      data: {
        recordId: addRes?.id || addRes?._id || addRes?.ids?.[0] || null,
        fileId: fileID || null,
        imageTempUrl: imageUrl || null,
        productName: record.productName,
        ingredients: record.ingredients,
        analysis: record.analysis
      }
    };

    return http ? response(200, resBody) : resBody;
  } catch (error) {
    const body = { success: false, message: error.message || '服务器错误' };
    return http ? response(500, body) : body;
  }
}; 
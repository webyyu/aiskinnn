const cloudbase = require('@cloudbase/node-sdk')
const axios = require('axios')

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function toStringArray(value) {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean)
  return []
}

function normalizeAnalysisRecord(rec) {
  if (!rec || typeof rec !== 'object') return {}
  return {
    _id: rec._id || rec.id || null,
    uid: rec.uid || '',
    productName: typeof rec.productName === 'string' ? rec.productName : '',
    ingredients: Array.isArray(rec.ingredients) ? rec.ingredients : [],
    analysis: rec.analysis || rec.analysisJson || null,
    imageUrl: rec.imageUrl || null,
    fileId: rec.fileId || null,
    createdAt: rec.createdAt || null
  }
}

async function getCurrentUid(app, event) {
  try {
    const auth = app.auth()
    const info = await auth.getUserInfo()
    if (info && isNonEmptyString(info.uid)) return info.uid
  } catch (e) {
    // fallthrough to event
  }
  if (event && isNonEmptyString(event.uid)) return event.uid.trim()
  return ''
}

function buildPrompt(products) {
  const productInfo = products.map((p, i) => `产品${i + 1}: ${p.productName}\n成分: ${p.ingredients.join(', ')}`).join('\n\n')
  return `作为一名专业的护肤品成分分析专家，请分析以下${products.length}个护肤品的成分是否存在使用冲突。\n\n产品信息：\n${productInfo}\n\n请以JSON格式输出分析结果，包括以下字段：\n{\n  "conflicts": [\n    {\n      "components": ["成分1", "成分2"],\n      "severity": "高/中/低",\n      "description": "冲突描述",\n      "effects": ["可能影响1", "可能影响2"]\n    }\n  ],\n  "safeCombo": [\n    {\n      "components": ["成分1", "成分2"],\n      "description": "这些成分可以安全组合使用的原因"\n    }\n  ],\n  "recommendations": {\n    "productPairings": {\n      "cannotUseTogether": [\n        {\n          "products": ["产品名称1", "产品名称2"],\n          "reason": "不能一起使用的原因"\n        }\n      ],\n      "canUseTogether": [\n        {\n          "products": ["产品名称1", "产品名称2"],\n          "reason": "可以一起使用的原因"\n        }\n      ]\n    },\n    "routines": {\n      "morning": ["建议的早晨使用顺序，例如：产品1 → 产品2"],\n      "evening": ["建议的晚间使用顺序，例如：产品1 → 产品3"]\n    }\n  }\n}\n\n请确保输出符合标准JSON格式，不要添加任何额外的格式化、注释或说明。分析必须科学严谨，基于成分的实际相互作用情况。`
}

exports.main = async (event) => {
  const app = cloudbase.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE })
  const db = app.database()
  const _ = db.command

  try {
    const uid = await getCurrentUid(app, event)
    if (!isNonEmptyString(uid)) {
      return { code: -1, message: '未获取到用户身份，请先登录' }
    }

    const productRecordIds = toStringArray(event && event.productRecordIds)
    if (!Array.isArray(productRecordIds) || productRecordIds.length < 2) {
      return { code: -1, message: '至少选择两个已分析的产品记录' }
    }

    // 拉取产品成分分析记录（只允许查询当前用户的数据）
    const coll = db.collection('product_ingredient_analysis')
    const { data: rawList } = await coll
      .where({ uid, _id: _.in(productRecordIds) })
      .limit(100)
      .get()

    const records = Array.isArray(rawList) ? rawList.map(normalizeAnalysisRecord) : []

    if (records.length !== productRecordIds.length) {
      return { code: -1, message: '部分产品记录不存在或不属于当前用户' }
    }

    const productsForPrompt = records.map(r => ({ productName: r.productName || '未命名产品', ingredients: r.ingredients }))

    const prompt = buildPrompt(productsForPrompt)

    const API_KEY = process.env.DASHSCOPE_API_KEY || process.env.API_KEY || 'sk-2938e1c1dba34d96bf4c30e3001de499'

    // 调用通义千问
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-turbo-latest',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 60000
      }
    )

    let analysis
    try {
      const content = response && response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content
      analysis = JSON.parse(content)
    } catch (err) {
      return { code: -1, message: 'AI返回结果解析失败' }
    }

    const productsPayload = records.map(r => ({
      _id: r._id,
      name: r.productName || '未命名产品',
      imageUrl: r.imageUrl || null,
      fileId: r.fileId || null,
      description: (r.analysis && (r.analysis.summary || r.analysis.desc)) || ''
    }))

    const toSave = {
      uid,
      productRecordIds,
      productNames: productsPayload.map(p => p.name),
      result: {
        products: productsPayload,
        conflicts: Array.isArray(analysis.conflicts) ? analysis.conflicts : [],
        safeCombo: Array.isArray(analysis.safeCombo) ? analysis.safeCombo : [],
        recommendations: analysis.recommendations || {}
      },
      createdAt: db.serverDate()
    }

    const saveRes = await db.collection('product_conflicts').add(toSave)
    const conflictId = (saveRes && (saveRes.id || saveRes._id)) || ''

    return {
      code: 0,
      message: 'OK',
      data: {
        conflictId,
        products: toSave.result.products,
        conflicts: toSave.result.conflicts,
        safeCombo: toSave.result.safeCombo,
        recommendations: toSave.result.recommendations
      }
    }
  } catch (e) {
    return { code: -1, message: e && e.message ? e.message : 'analyze failed' }
  }
} 
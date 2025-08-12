const cloudbase = require('@cloudbase/node-sdk')
const axios = require('axios')

// 默认密钥（仅当前环境使用）。生产环境建议配置为函数环境变量 API_KEY。
const DEFAULT_API_KEY = 'sk-2938e1c1dba34d96bf4c30e3001de499'

const analysisPrompt = `
请详细分析这张面部照片中的皮肤状态，我需要专业的护肤分析报告。请按照以下格式严格返回JSON格式的分析结果：

{
  "skinType": {
    "type": "油性皮肤|干性皮肤|中性皮肤|混合性皮肤",
    "subtype": "混油性|混干性|正常",
    "basis": "详细说明判断依据，如T区或U区的光泽度、毛孔大小、皮肤纹理等"
  },
  "moisture": 0-100,
  "glossiness": 0-100,
  "elasticity": 0-100,
  "problemAreaScore": 0-100,
  "blackheads": {
    "exists": true|false,
    "severity": "无|少量|中度|大量",
    "distribution": ["T区", "鼻翼", "下巴等具体区域"]
  },
  "acne": {
    "exists": true|false,
    "count": "无|少量|中度|大量",
    "types": ["粉刺", "丘疹", "囊肿性痤疮等类型"],
    "activity": "不活跃|轻度活跃|中度活跃|高度活跃",
    "distribution": ["额头", "脸颊", "下巴等具体区域"]
  },
  "pores": {
    "enlarged": true|false,
    "severity": "正常|轻度|中度|严重",
    "distribution": ["T区", "脸颊等具体区域"]
  },
  "otherIssues": {
    "redness": {"exists": true|false, "severity": "轻度|中度|严重", "distribution": ["具体区域"]},
    "hyperpigmentation": {"exists": true|false, "types": ["晒斑", "痘印", "色素沉着等"], "distribution": ["具体区域"]},
    "fineLines": {"exists": true|false, "severity": "轻度|中度|严重", "distribution": ["眼部", "额头等区域"]},
    "sensitivity": {"exists": true|false, "signs": ["泛红", "干燥", "紧绷等迹象"]},
    "skinToneEvenness": {"score": 1-10, "description": "肤色均匀度描述"}
  },
  "overallAssessment": {
    "healthScore": 0-100,
    "summary": "整体皮肤健康状况总结",
    "recommendations": ["护肤建议1", "护肤建议2", "护肤建议3"],
    "skinCondition": "优秀|良好|一般|需要改善|需要专业护理"
  }
}

严格要求：
- 必须包含 overallAssessment.healthScore，并按以下公式计算且返回整数：healthScore = round(0.4*moisture + 0.3*elasticity + 0.2*glossiness + 0.1*(100 - problemAreaScore))。
- 若任一输入项缺失，请先基于图像合理估计再计算分数，确保 healthScore 在 0-100 之间。
- 仅返回 JSON 数据，不要包含任何额外文字或注释。`;

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)) }
function toNumber(n, def = 0) { const x = Number(n); return Number.isFinite(x) ? x : def }
function ensureHealthScore(analysis) {
  if (!analysis) return analysis
  const oa = analysis.overallAssessment || {}
  if (!Number.isFinite(oa.healthScore)) {
    const moisture = clamp(toNumber(analysis.moisture, 60), 0, 100)
    const elasticity = clamp(toNumber(analysis.elasticity, 60), 0, 100)
    const glossiness = clamp(toNumber(analysis.glossiness, 60), 0, 100)
    const problemAreaScore = clamp(toNumber(analysis.problemAreaScore, 40), 0, 100)
    const computed = 0.4 * moisture + 0.3 * elasticity + 0.2 * glossiness + 0.1 * (100 - problemAreaScore)
    if (!analysis.overallAssessment) analysis.overallAssessment = {}
    analysis.overallAssessment.healthScore = Math.round(clamp(computed, 0, 100))
  }
  return analysis
}

exports.main = async (event) => {
  const app = cloudbase.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE })
  const db = app.database()
  const { uid, apiKey, fileId } = event || {}
  if (!uid) return { code: -1, message: 'Missing uid' }

  const API_KEY = apiKey || process.env.API_KEY || DEFAULT_API_KEY

  try {
    let targetFileId = fileId

    if (!targetFileId) {
      // 获取最近一次上传记录
      const coll = db.collection('peoplepicture_uploads')
      const { data } = await coll.where({ uid }).orderBy('createdAt', 'desc').limit(1).get()
      if (!data || data.length === 0) return { code: -1, message: 'No upload found' }
      targetFileId = data[0].fileId
    }

    // 生成临时URL
    const temp = await app.getTempFileURL({ fileList: [{ fileID: targetFileId, maxAge: 600 }] })
    const urlEntry = (temp && temp.fileList && temp.fileList[0]) || {}
    if (!urlEntry.tempFileURL) return { code: -1, message: 'Failed to get temp url' }
    const imageUrl = urlEntry.tempFileURL

    const t0 = Date.now()
    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen2.5-vl-72b-instruct',
        messages: [
          { role: 'user', content: [ { type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: analysisPrompt } ] }
        ],
        max_tokens: 4096,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } }
    )

    const content = resp?.data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim().startsWith('{')) {
      return { code: -2, message: 'Model returned non-JSON content', raw: content || resp?.data }
    }

    let analysis
    try { analysis = JSON.parse(content) } catch (e) {
      return { code: -2, message: 'JSON parse failed', raw: content }
    }

    analysis = ensureHealthScore(analysis)

    const now = Date.now()
    await db.collection('skin_analyses').add({ uid, imageFileId: targetFileId, imageUrl, analysis, createdAt: now, processingTime: now - t0, model: 'qwen2.5-vl-72b-instruct' })

    return { code: 0, message: 'OK', data: { imageUrl, analysis } }
  } catch (e) {
    return { code: -1, message: e.message || 'analyze failed' }
  }
} 
const cloudbase = require('@cloudbase/node-sdk')
const axios = require('axios')

function isNonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0 }
function toStringArray(value) { return Array.isArray(value) ? value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean) : [] }

async function getCurrentUid(app, event) {
  try {
    const auth = app.auth()
    const info = await auth.getUserInfo()
    if (info && isNonEmptyString(info.uid)) return info.uid
  } catch (e) { console.log('getUserInfo failed:', e?.message || e) }
  if (event && isNonEmptyString(event.uid)) return event.uid.trim()
  return ''
}

function buildPrompt({ userGenderZh, userAge, skinConcernsText, customRequirements, skinStatusInfo, menstrualInfo, productList }) {
  const productLines = productList.map((p, i) => `${i + 1}. ${p.name} - ${p.label || '无标签'}`).join('\n')
  return `作为专业的护肤顾问，请为用户设计一套根据其具体情况定制的早晚护肤方案。\n\n用户基本信息：\n- 性别：${userGenderZh}\n- 年龄：${userAge}岁\n- 主要护肤需求：${skinConcernsText}\n- 其他需求：${customRequirements || '无'}\n\n${skinStatusInfo}\n\n${menstrualInfo}\n\n用户拥有的产品：\n${productLines}\n\n请用JSON格式输出一套完整的护肤方案，字段如下：\n{\n  "name": "方案名称（根据用户年龄、性别、肌肤状态和需求命名）",\n  "requirement": "护肤需求（如有）",\n  "skinConcerns": ["皮肤关注点1", "皮肤关注点2"],\n  "customRequirements": "自定义需求（如有）",\n  "userAge": ${userAge},\n  "userGender": "male/female",\n  "skinAnalysisId": null,\n  "menstrualCycleInfo": "如有请填写，无则为null",\n  "morning": [\n    {"step": 1, "product": "产品名称1", "reason": "使用理由", "completed": false}\n  ],\n  "evening": [\n    {"step": 1, "product": "产品名称1", "reason": "使用理由", "completed": false}\n  ],\n  "recommendations": ["建议1", "建议2"],\n  "skinAnalysisSummary": "基于当前肌肤分析的总结和建议",\n  "creatorNote": "创作者备注，可为空",\n  "notes": "用户补充说明，可为空",\n  "tags": ["标签1", "标签2"]\n}\n\n请特别注意：\n1. 字段必须齐全，类型与示例一致，不能缺少任何字段。\n2. morning、evening每步都要有completed字段，默认为false。\n3. tags、skinConcerns、recommendations等字段即使为空也要返回[]。\n4. 输出必须是有效的JSON格式，不要添加任何多余的说明文字。`
}

exports.main = async (event) => {
  const app = cloudbase.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE })
  const db = app.database()

  try {
    const uid = await getCurrentUid(app, event)
    if (!isNonEmptyString(uid)) {
      return { code: -1, message: '未获取到用户身份，请先登录' }
    }

    const age = Number.parseInt(event?.age, 10) || 25
    const skinConcerns = toStringArray(event?.skinConcerns)
    const customRequirements = isNonEmptyString(event?.customRequirements) ? event.customRequirements : ''
    const requirement = isNonEmptyString(event?.requirement) ? event.requirement : ''
    const userGender = isNonEmptyString(event?.userGender) ? event.userGender : 'female' // male/female
    const userGenderZh = userGender === 'male' ? '男性' : '女性'
    const menstrualCycle = event?.menstrualCycle && typeof event.menstrualCycle === 'object' ? event.menstrualCycle : null

    // 用户产品（使用 product_ingredient_analysis 集合作为用户已识别产品来源）
    const productsRes = await db.collection('product_ingredient_analysis')
      .where({ uid })
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get()

    const productList = Array.isArray(productsRes?.data) ? productsRes.data.map(p => ({
      name: p.productName || '未命名产品',
      description: p.analysis?.summary || '',
      ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
      label: ''
    })) : []

    if (productList.length === 0) {
      return { code: -1, message: '未找到任何产品，无法生成护肤方案' }
    }

    // 最新肌肤分析
    const latestSkinRes = await db.collection('skin_analyses')
      .where({ uid })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    const latestSkin = Array.isArray(latestSkinRes?.data) ? latestSkinRes.data[0] : null

    let skinStatusInfo = '暂无肌肤分析数据，请根据用户需求和年龄特点制定方案。'
    let skinAnalysisId = null
    if (latestSkin) {
      skinAnalysisId = latestSkin._id || null
      const type = latestSkin.skinType?.type || latestSkin.skinType || '未知'
      const subtype = latestSkin.skinType?.subtype || ''
      const healthScore = latestSkin.overallAssessment?.healthScore || latestSkin.analysis?.healthScore || ''
      const skinCondition = latestSkin.overallAssessment?.skinCondition || latestSkin.analysis?.skinCondition || ''
      const blackheads = latestSkin.blackheads?.severity || ''
      const acneCount = latestSkin.acne?.count || ''
      const pores = latestSkin.pores?.severity || ''
      const summary = latestSkin.overallAssessment?.summary || latestSkin.analysis?.summary || ''
      skinStatusInfo = `\n当前肌肤状态分析：\n- 肌肤类型：${type}${subtype ? ' (' + subtype + ')' : ''}\n- 健康评分：${healthScore || '未知'}/100\n- 肌肤状况：${skinCondition || '未知'}\n- 主要问题：\n  * 黑头：${blackheads || '未知'}\n  * 痘痘：${acneCount || '未知'}\n  * 毛孔：${pores || '未知'}\n- 分析总结：${summary || '无'}`
    }

    let menstrualInfo = ''
    if (userGender === 'female' && menstrualCycle && menstrualCycle.isInCycle) {
      const day = menstrualCycle.cycleDay || ''
      const cycleLength = menstrualCycle.cycleLength || ''
      menstrualInfo = `\n生理周期信息：\n- 当前处于生理周期第${day}天\n- 周期长度：${cycleLength || '未知'}天\n请考虑生理周期对肌肤状态的影响，在生理期前后肌肤可能更敏感，需要温和护理。`
    }

    const concernsText = skinConcerns.length > 0 ? skinConcerns.join('、') : '基础护肤'

    const prompt = buildPrompt({
      userGenderZh,
      userAge: age,
      skinConcernsText: concernsText,
      customRequirements,
      skinStatusInfo,
      menstrualInfo,
      productList
    })

    const API_KEY = process.env.DASHSCOPE_API_KEY || process.env.API_KEY || 'sk-2938e1c1dba34d96bf4c30e3001de499'

    const response = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      { model: 'qwen-turbo-latest', messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` }, timeout: 90000 }
    )

    let planResult
    try {
      const content = response?.data?.choices?.[0]?.message?.content
      planResult = JSON.parse(content)
    } catch (err) {
      return { code: -1, message: 'AI返回结果解析失败' }
    }

    const morningWithCompleted = Array.isArray(planResult.morning) ? planResult.morning.map((s, idx) => ({
      step: Number.isFinite(s.step) ? s.step : (idx + 1),
      product: s.product || '',
      reason: s.reason || '',
      completed: false
    })) : []
    const eveningWithCompleted = Array.isArray(planResult.evening) ? planResult.evening.map((s, idx) => ({
      step: Number.isFinite(s.step) ? s.step : (idx + 1),
      product: s.product || '',
      reason: s.reason || '',
      completed: false
    })) : []

    const toSave = {
      uid,
      name: planResult.name || `个性化护肤方案-${age}岁-${userGenderZh}`,
      requirement: planResult.requirement || requirement || '',
      skinConcerns: Array.isArray(planResult.skinConcerns) ? planResult.skinConcerns : skinConcerns,
      customRequirements: planResult.customRequirements || customRequirements || '',
      userAge: planResult.userAge || age,
      userGender: planResult.userGender || userGender,
      skinAnalysisId: skinAnalysisId,
      menstrualCycleInfo: planResult.menstrualCycleInfo || (menstrualCycle ? JSON.stringify(menstrualCycle) : null),
      morning: morningWithCompleted,
      evening: eveningWithCompleted,
      recommendations: Array.isArray(planResult.recommendations) ? planResult.recommendations : [],
      skinAnalysisSummary: planResult.skinAnalysisSummary || '',
      creatorNote: planResult.creatorNote || event?.creatorNote || '',
      notes: planResult.notes || event?.notes || '',
      tags: Array.isArray(planResult.tags) ? planResult.tags : (Array.isArray(event?.tags) ? event.tags : []),
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      origin: 'ai'
    }

    const saveRes = await db.collection('plans').add(toSave)
    const planId = saveRes?.id || saveRes?._id || ''

    return {
      code: 0,
      message: 'OK',
      data: { plan: { _id: planId, ...toSave } }
    }
  } catch (e) {
    return { code: -1, message: e?.message || 'generate plan failed' }
  }
} 
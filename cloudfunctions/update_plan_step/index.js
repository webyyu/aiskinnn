const cloudbase = require('@cloudbase/node-sdk')

function isNonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0 }

async function getCurrentUid(app, event) {
  try {
    const auth = app.auth()
    const info = await auth.getUserInfo()
    if (info && isNonEmptyString(info.uid)) return info.uid
  } catch (e) { console.log('getUserInfo failed:', e?.message || e) }
  if (event && isNonEmptyString(event.uid)) return event.uid.trim()
  return ''
}

exports.main = async (event) => {
  const app = cloudbase.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE })
  const db = app.database()

  try {
    const uid = await getCurrentUid(app, event)
    if (!isNonEmptyString(uid)) return { code: -1, message: '未获取到用户身份，请先登录' }

    const planId = event && (event.planId || event.id)
    const period = event && event.period
    const step = Number.isFinite(event?.step) ? event.step : Number.parseInt(event?.step, 10)
    const completed = !!event?.completed

    if (!isNonEmptyString(planId)) return { code: -1, message: '缺少 planId' }
    if (!['morning', 'evening'].includes(period)) return { code: -1, message: 'period 必须为 morning 或 evening' }
    if (!Number.isFinite(step)) return { code: -1, message: '缺少有效的 step' }

    const res = await db.collection('plans').doc(planId.trim()).get()
    const plan = Array.isArray(res?.data) ? res.data[0] : null
    if (!plan || plan.uid !== uid) return { code: -1, message: '记录不存在或无权限访问' }

    const list = Array.isArray(plan[period]) ? plan[period] : []
    const idx = list.findIndex(it => Number(it.step) === Number(step))
    if (idx === -1) return { code: -1, message: '未找到对应步骤' }

    list[idx].completed = completed

    await db.collection('plans').doc(planId.trim()).update({
      [period]: list,
      updatedAt: db.serverDate()
    })

    const updated = await db.collection('plans').doc(planId.trim()).get()
    const plan2 = Array.isArray(updated?.data) ? updated.data[0] : null

    return { code: 0, message: 'OK', data: { plan: plan2 } }
  } catch (e) { return { code: -1, message: e?.message || 'update failed' } }
} 
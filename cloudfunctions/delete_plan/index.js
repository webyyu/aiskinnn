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
    if (!isNonEmptyString(planId)) return { code: -1, message: '缺少 planId' }

    // 校验归属
    const res = await db.collection('plans').doc(planId.trim()).get()
    const plan = Array.isArray(res?.data) ? res.data[0] : null
    if (!plan || plan.uid !== uid) return { code: -1, message: '记录不存在或无权限访问' }

    await db.collection('plans').doc(planId.trim()).remove()
    return { code: 0, message: 'OK', data: {} }
  } catch (e) { return { code: -1, message: e?.message || 'delete failed' } }
} 
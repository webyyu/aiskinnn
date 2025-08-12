const cloudbase = require('@cloudbase/node-sdk')

function isNonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0 }

async function getCurrentUid(app, event) {
  try {
    const auth = app.auth()
    const info = await auth.getUserInfo()
    if (info && isNonEmptyString(info.uid)) return info.uid
  } catch (e) {
    console.log('getUserInfo failed:', e && e.message ? e.message : e)
  }
  if (event && isNonEmptyString(event.uid)) return event.uid.trim()
  return ''
}

exports.main = async (event) => {
  const app = cloudbase.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE })
  const db = app.database()

  try {
    const uid = await getCurrentUid(app, event)
    if (!isNonEmptyString(uid)) {
      return { code: -1, message: '未获取到用户身份，请先登录' }
    }

    const conflictId = event && (event.conflictId || event.id)
    if (!isNonEmptyString(conflictId)) {
      return { code: -1, message: '缺少 conflictId' }
    }

    const docRes = await db.collection('product_conflicts').doc(conflictId.trim()).get()
    const doc = docRes && Array.isArray(docRes.data) ? docRes.data[0] : null

    if (!doc || doc.uid !== uid) {
      return { code: -1, message: '记录不存在或无权限访问' }
    }

    const result = doc.result || {}

    return {
      code: 0,
      message: 'OK',
      data: {
        conflict: {
          products: Array.isArray(result.products) ? result.products : [],
          conflicts: Array.isArray(result.conflicts) ? result.conflicts : [],
          safeCombo: Array.isArray(result.safeCombo) ? result.safeCombo : [],
          recommendations: result.recommendations || {},
          createdAt: doc.createdAt || null
        }
      }
    }
  } catch (e) {
    return { code: -1, message: e && e.message ? e.message : 'query failed' }
  }
} 
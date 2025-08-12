const cloudbase = require('@cloudbase/node-sdk')

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)) }
function toInt(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def }
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

  const limit = clamp(toInt(event && event.limit, 20), 1, 100)
  const offset = Math.max(0, toInt(event && event.offset, 0))
  const order = (event && String(event.order).toLowerCase()) === 'asc' ? 'asc' : 'desc'

  try {
    const uid = await getCurrentUid(app, event)
    if (!isNonEmptyString(uid)) {
      return { code: -1, message: '未获取到用户身份，请先登录' }
    }

    const coll = db.collection('product_conflicts')

    let total = undefined
    try {
      const countRes = await coll.where({ uid }).count()
      total = countRes && (countRes.total || countRes.count)
    } catch (e) {
      console.log('count failed:', e && e.message ? e.message : e)
    }

    const { data } = await coll
      .where({ uid })
      .orderBy('createdAt', order)
      .skip(offset)
      .limit(limit)
      .get()

    const items = Array.isArray(data) ? data.map(doc => ({
      id: doc._id || doc.id,
      products: Array.isArray(doc.productNames) && doc.productNames.length
        ? doc.productNames
        : (Array.isArray(doc.result?.products) ? doc.result.products.map(p => p.name) : []),
      createdAt: doc.createdAt || null
    })) : []

    return {
      code: 0,
      message: 'OK',
      data: { items, total, limit, offset, order }
    }
  } catch (e) {
    return { code: -1, message: e && e.message ? e.message : 'query failed' }
  }
} 
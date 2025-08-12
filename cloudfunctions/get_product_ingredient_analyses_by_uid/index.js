const cloudbase = require('@cloudbase/node-sdk')

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)) }
function toInt(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def }

/**
 * 统一兜底一条记录的关键字段，避免前端因缺字段崩溃
 */
function normalizeRecord(rec) {
  if (!rec || typeof rec !== 'object') return {}
  return {
    _id: rec._id || rec.id || null,
    uid: rec.uid || '',
    productName: typeof rec.productName === 'string' ? rec.productName : '',
    ingredients: Array.isArray(rec.ingredients) ? rec.ingredients : [],
    analysis: rec.analysis || rec.analysisJson || null,
    imageUrl: rec.imageUrl || null,
    createdAt: rec.createdAt || null,
    fileId: rec.fileId || null
  }
}

exports.main = async (event) => {
  const app = cloudbase.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE })
  const db = app.database()

  const uid = event && event.uid
  if (!uid || typeof uid !== 'string' || uid.trim().length === 0) {
    return { code: -1, message: 'Missing uid' }
  }

  const limit = clamp(toInt(event && event.limit, 20), 1, 100)
  const offset = Math.max(0, toInt(event && event.offset, 0))
  const order = (event && String(event.order).toLowerCase()) === 'asc' ? 'asc' : 'desc'

  try {
    const coll = db.collection('product_ingredient_analysis')

    let total = undefined
    try {
      const countRes = await coll.where({ uid }).count()
      total = countRes && (countRes.total || countRes.count)
    } catch (err) {
      console.log('count failed:', err && err.message ? err.message : err)
    }

    const { data } = await coll
      .where({ uid })
      .orderBy('createdAt', order)
      .skip(offset)
      .limit(limit)
      .get()

    const items = Array.isArray(data) ? data.map(normalizeRecord) : []

    return {
      code: 0,
      message: 'OK',
      data: {
        items,
        total: Number.isFinite(total) ? total : undefined,
        limit,
        offset,
        order
      }
    }
  } catch (e) {
    return { code: -1, message: e && e.message ? e.message : 'query failed' }
  }
} 
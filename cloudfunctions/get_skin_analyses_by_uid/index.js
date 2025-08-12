const cloudbase = require('@cloudbase/node-sdk')

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)) }
function toInt(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def }

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
    const coll = db.collection('skin_analyses')

    let total = undefined
    try {
      const countRes = await coll.where({ uid }).count()
      total = countRes && (countRes.total || countRes.count)
    } catch (err) {
      // 计数失败不影响数据查询，记录日志便于排查
      console.log('count failed:', err && err.message ? err.message : err)
    }

    const { data } = await coll
      .where({ uid })
      .orderBy('createdAt', order)
      .skip(offset)
      .limit(limit)
      .get()

    return {
      code: 0,
      message: 'OK',
      data: {
        items: Array.isArray(data) ? data : [],
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
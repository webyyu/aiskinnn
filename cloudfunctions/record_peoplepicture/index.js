const cloudbase = require('@cloudbase/node-sdk')

exports.main = async (event) => {
  const app = cloudbase.init({ env: process.env.TCB_ENV || process.env.SCF_NAMESPACE })
  const db = app.database()
  const { uid, fileId, key } = event || {}
  if (!uid || !fileId) return { code: -1, message: 'Missing uid or fileId' }
  try {
    const now = Date.now()
    await db.collection('peoplepicture_uploads').add({ uid, fileId, key: key || '', createdAt: now })
    return { code: 0, message: 'OK', data: { uid, fileId, key: key || '', createdAt: now } }
  } catch (e) {
    return { code: -1, message: e.message || 'db error' }
  }
} 
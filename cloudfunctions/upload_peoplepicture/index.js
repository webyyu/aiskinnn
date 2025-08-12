const cloudbase = require('@cloudbase/node-sdk')

exports.main = async (event) => {
  const app = cloudbase.init({
    env: process.env.TCB_ENV || process.env.SCF_NAMESPACE
  })
  const storage = app.storage()

  const { uid, imageBase64, ext = 'jpg' } = event || {}
  if (!uid || !imageBase64) {
    return { code: -1, message: 'Missing uid or imageBase64' }
  }

  // 解析 base64
  const matches = imageBase64.match(/^data:(.+);base64,(.*)$/)
  const base64Data = matches ? matches[2] : imageBase64
  const buffer = Buffer.from(base64Data, 'base64')

  const key = `peoplepicture/${uid}/${Date.now()}.${ext.replace(/^\./,'')}`

  try {
    const res = await storage.uploadFile({
      cloudPath: key,
      fileContent: buffer
    })
    return {
      code: 0,
      message: 'OK',
      data: { fileId: res.fileID || res.fileId || key, key }
    }
  } catch (e) {
    return { code: -1, message: e.message || 'upload failed' }
  }
} 
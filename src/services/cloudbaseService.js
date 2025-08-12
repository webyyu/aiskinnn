import cloudbase from '@cloudbase/js-sdk'

class CloudBaseService {
  constructor() {
    this.app = null
    this.auth = null
    this.db = null
    this.initialized = false
  }

  /**
   * 初始化CloudBase
   */
  async init() {
    if (this.initialized) return

    try {
      this.app = cloudbase.init({
        env: 'wuby-9gk84z40475927ab', // 环境ID
        timeout: 60000 // 将请求超时提升到60秒，避免长耗时函数被中断
      })
      
      this.auth = this.app.auth()
      this.db = this.app.database()
      this.initialized = true
      
      console.log('🔥 CloudBase初始化成功')
    } catch (error) {
      console.error('❌ CloudBase初始化失败:', error)
      throw error
    }
  }

  /**
   * 发送手机验证码
   * @param {string} phoneNumber 手机号 (格式: +86 13800000000)
   * @param {string} target 目标类型: ANY/USER/NOT_USER，默认ANY
   * @returns {Promise} 验证码发送结果
   */
  async sendVerificationCode(phoneNumber, target = 'ANY') {
    await this.init()
    
    try {
      console.log('📱 发送验证码到:', phoneNumber, '目标类型:', target)
      
      const requestData = {
        phone_number: phoneNumber
      }
      
      // 只有在非ANY模式时才添加target参数
      if (target !== 'ANY') {
        requestData.target = target
      }
      
      const result = await this.auth.getVerification(requestData)
      
      console.log('✅ 验证码发送成功:', result)
      return {
        success: true,
        verification_id: result.verification_id,
        is_user: result.is_user, // 是否为已注册用户
        message: '验证码发送成功'
      }
    } catch (error) {
      console.error('❌ 发送验证码失败:', error)
      return {
        success: false,
        message: error.message || '发送验证码失败'
      }
    }
  }

  /**
   * 验证验证码
   * @param {string} verificationId 验证ID
   * @param {string} verificationCode 验证码
   * @returns {Promise} 验证结果
   */
  async verifyCode(verificationId, verificationCode) {
    await this.init()
    
    try {
      console.log('🔍 验证验证码:', { verificationId, verificationCode })
      
      const result = await this.auth.verify({
        verification_id: verificationId,
        verification_code: verificationCode
      })
      
      console.log('✅ 验证码验证成功:', result)
      return {
        success: true,
        verification_token: result.verification_token,
        message: '验证码验证成功'
      }
    } catch (error) {
      console.error('❌ 验证码验证失败:', error)
      return {
        success: false,
        message: error.message || '验证码验证失败'
      }
    }
  }

  /**
   * 注册新用户
   * @param {Object} userData 用户数据
   * @param {string} userData.phoneNumber 手机号
   * @param {string} userData.verificationCode 验证码
   * @param {string} userData.verificationToken 验证令牌
   * @param {string} userData.password 密码
   * @param {string} userData.name 用户名/昵称
   * @returns {Promise} 注册结果
   */
  async register(userData) {
    await this.init()
    
    try {
      // 生成符合CloudBase要求的用户名：小写字母开头，5-24位，只包含字母数字下划线连字符
      const generateUsername = (phone, name) => {
        // 从手机号后几位 + 处理后的名称生成用户名
        const phoneLastFour = phone.replace(/\D/g, '').slice(-4)
        const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
        const baseUsername = `u${safeName}${phoneLastFour}`
        
        // 确保长度在5-24位之间
        if (baseUsername.length < 5) {
          return `user${phoneLastFour}${Date.now().toString().slice(-6)}`
        } else if (baseUsername.length > 24) {
          return baseUsername.slice(0, 24)
        }
        
        return baseUsername
      }
      
      const username = generateUsername(userData.phoneNumber, userData.name || 'user')
      
      console.log('📝 注册用户:', { 
        phone: userData.phoneNumber, 
        name: userData.name,
        username: username 
      })
      
      const result = await this.auth.signUp({
        phone_number: userData.phoneNumber,
        verification_code: userData.verificationCode,
        verification_token: userData.verificationToken,
        password: userData.password,
        name: userData.name,
        username: username // 使用生成的符合要求的用户名
      })
      
      console.log('✅ 用户注册成功:', result)
      
      // 等待一小段时间确保用户信息已经创建完成
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 获取用户信息并存储到本地
      const currentUser = await this.getCurrentUser()
      if (currentUser) {
        localStorage.setItem('cloudbase_user', JSON.stringify(currentUser))
      }
      
      return {
        success: true,
        user: currentUser,
        message: '注册成功'
      }
    } catch (error) {
      console.error('❌ 用户注册失败:', error)
      return {
        success: false,
        message: error.message || '注册失败'
      }
    }
  }

  /**
   * 用户登录
   * @param {Object} loginData 登录数据
   * @param {string} loginData.phoneNumber 手机号
   * @param {string} loginData.verificationToken 验证令牌 (验证码登录)
   * @param {string} loginData.password 密码 (密码登录)
   * @returns {Promise} 登录结果
   */
  async login(loginData) {
    await this.init()
    
    try {
      console.log('🔐 用户登录:', { phone: loginData.phoneNumber })
      
      const signInData = {
        username: loginData.phoneNumber
      }
      
      // 优先使用验证码登录，否则使用密码登录
      if (loginData.verificationToken) {
        signInData.verification_token = loginData.verificationToken
      } else if (loginData.password) {
        signInData.password = loginData.password
      } else {
        throw new Error('请提供验证码或密码')
      }
      
      const result = await this.auth.signIn(signInData)
      
      console.log('✅ 用户登录成功:', result)
      
      // 等待更长时间确保用户状态已经更新完成
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 获取用户信息并存储到本地
      const currentUser = await this.getCurrentUser()
      console.log('🔍 登录后获取的用户信息:', currentUser)
      
      if (currentUser) {
        localStorage.setItem('cloudbase_user', JSON.stringify(currentUser))
        console.log('✅ 用户信息已存储到本地')
      } else {
        console.log('⚠️ 获取用户信息失败，但登录成功')
        // 即使获取用户信息失败，也设置一个基本的登录标记
        const basicUser = {
          uid: result.user?.uid || 'unknown',
          name: result.user?.name || loginData.phoneNumber,
          phone: loginData.phoneNumber,
          loginType: 'phone'
        }
        localStorage.setItem('cloudbase_user', JSON.stringify(basicUser))
        console.log('✅ 已存储基本用户信息:', basicUser)
      }
      
      return {
        success: true,
        user: currentUser || {
          uid: result.user?.uid || 'unknown',
          name: result.user?.name || loginData.phoneNumber,
          phone: loginData.phoneNumber,
          loginType: 'phone'
        },
        message: '登录成功'
      }
    } catch (error) {
      console.error('❌ 用户登录失败:', error)
      return {
        success: false,
        message: error.message || '登录失败'
      }
    }
  }

  /**
   * 用户登出
   */
  async logout() {
    await this.init()
    
    try {
      await this.auth.signOut()
      localStorage.removeItem('cloudbase_user')
      console.log('✅ 用户登出成功')
      return {
        success: true,
        message: '登出成功'
      }
    } catch (error) {
      console.error('❌ 用户登出失败:', error)
      return {
        success: false,
        message: error.message || '登出失败'
      }
    }
  }

  /**
   * 检查用户是否已登录
   * @returns {Promise<boolean>} 登录状态
   */
  async isAuthenticated() {
    await this.init()
    
    try {
      const loginState = await this.auth.getLoginState()
      console.log('🔍 登录状态检查:', loginState)
      
      // 检查多种可能的登录状态标识
      return !!(loginState && (
        loginState.isLoggedIn ||  // 标准字段
        loginState.user ||        // 用户对象存在
        loginState.uid           // 用户ID存在
      ))
    } catch (error) {
      console.error('❌ 检查登录状态失败:', error)
      return false
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Promise} 用户信息
   */
  async getCurrentUser() {
    await this.init()
    
    try {
      const loginState = await this.auth.getLoginState()
      console.log('🔍 获取登录状态:', loginState)
      
      // 检查多种可能的登录状态
      const isLoggedIn = !!(loginState && (
        loginState.isLoggedIn ||  // 标准字段
        loginState.user ||        // 用户对象存在
        loginState.uid           // 用户ID存在
      ))
      
      if (isLoggedIn) {
        // 尝试多种方式获取用户信息
        let userInfo = null
        
        // 方式1: 直接从loginState获取用户信息
        if (loginState.user && loginState.user.uid) {
          const user = loginState.user
          userInfo = {
            uid: user.uid,
            email: user.email || '',
            name: user.customUserId || user.displayName || user.name || '用户',
            phone: user.phoneNumber || user.phone || '',
            username: user.username || user.customUserId || '',
            isAnonymous: user.isAnonymous || false,
            loginType: user.loginType || 'phone'
          }
        }
        // 方式2: 直接从loginState获取（用户信息在顶层）
        else if (loginState.uid) {
          userInfo = {
            uid: loginState.uid,
            email: loginState.email || '',
            name: loginState.customUserId || loginState.displayName || loginState.name || '用户',
            phone: loginState.phoneNumber || loginState.phone || '',
            username: loginState.username || loginState.customUserId || '',
            isAnonymous: loginState.isAnonymous || false,
            loginType: loginState.loginType || 'phone'
          }
        }
        
        // 方式3: 尝试调用getCurrentUser API作为备选
        if (!userInfo) {
          try {
            const apiUser = await this.auth.getCurrentUser()
            console.log('🔍 API获取用户:', apiUser)
            if (apiUser && apiUser.uid) {
              userInfo = {
                uid: apiUser.uid,
                email: apiUser.email || '',
                name: apiUser.customUserId || apiUser.displayName || apiUser.name || '用户',
                phone: apiUser.phoneNumber || apiUser.phone || '',
                username: apiUser.username || apiUser.customUserId || '',
                isAnonymous: apiUser.isAnonymous || false,
                loginType: 'phone'
              }
            }
          } catch (e) {
            console.log('⚠️ getCurrentUser API调用失败:', e)
          }
        }
        
        console.log('✅ 最终用户信息:', userInfo)
        return userInfo
      }
      
      console.log('❌ 用户未登录')
      return null
    } catch (error) {
      console.error('❌ 获取用户信息失败:', error)
      return null
    }
  }

  /**
   * 从本地存储获取用户信息
   * @returns {Object|null} 用户信息
   */
  getStoredUser() {
    try {
      const userStr = localStorage.getItem('cloudbase_user')
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('❌ 解析本地用户数据失败:', error)
      return null
    }
  }

  /**
   * 格式化手机号 (添加国家代码和空格)
   * @param {string} phone 手机号
   * @returns {string} 格式化后的手机号
   */
  formatPhoneNumber(phone) {
    // 移除所有非数字字符
    const cleaned = phone.replace(/\D/g, '')
    
    // 如果已经包含国家代码86，确保格式正确
    if (cleaned.startsWith('86')) {
      const phoneNumber = cleaned.substring(2)
      return `+86 ${phoneNumber}`
    }
    
    // 否则添加中国国家代码，注意加空格
    return `+86 ${cleaned}`
  }

  /**
   * 验证手机号格式
   * @param {string} phone 手机号
   * @returns {boolean} 是否有效
   */
  validatePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '')
    // 中国手机号: 11位数字，以1开头
    return /^1[3-9]\d{9}$/.test(cleaned)
  }

  /**
   * 调用 hello_world 云函数
   * @returns {Promise}
   */
  async callHelloWorld() {
    await this.init()
    try {
      const res = await this.app.callFunction({
        name: 'hello_world',
        data: {}
      })
      return res?.result || res
    } catch (error) {
      console.error('❌ 调用 hello_world 失败:', error)
      throw error
    }
  }

  /**
   * 上传用户图片到 peoplepicture 存储桶（通过云函数）
   * @param {Object} params
   * @param {string} params.uid 用户UID
   * @param {File|Blob|string} params.fileOrBase64 文件对象或base64字符串
   */
  async uploadPeoplePicture({ uid, fileOrBase64 }) {
    await this.init()
    if (!uid || !fileOrBase64) throw new Error('uid 和 fileOrBase64 必填')

    const toBase64 = (file) => new Promise((resolve, reject) => {
      if (typeof file === 'string') return resolve(file)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const imageBase64 = await toBase64(fileOrBase64)
    const ext = typeof fileOrBase64 === 'string' ? 'jpg' : (fileOrBase64.name?.split('.').pop() || 'jpg')

    const res = await this.app.callFunction({
      name: 'upload_peoplepicture',
      data: { uid, imageBase64, ext }
    })
    return res?.result || res
  }

  /**
   * 直接将图片上传到存储（Web SDK），避免云函数参数过大
   * @param {Object} params
   * @param {string} params.uid
   * @param {File|Blob} params.file
   */
  async uploadPeoplePictureDirect({ uid, file }) {
    await this.init()
    if (!uid || !file) throw new Error('uid 和 file 必填')

    const mime = file.type || 'image/jpeg'
    const guessExtByMime = (m) => {
      if (/jpeg|jpg/i.test(m)) return 'jpg'
      if (/png/i.test(m)) return 'png'
      if (/webp/i.test(m)) return 'webp'
      if (/gif/i.test(m)) return 'gif'
      return 'jpg'
    }

    const extFromName = (file.name?.split('.').pop() || '').toLowerCase()
    const ext = extFromName || guessExtByMime(mime)
    const cloudPath = `peoplepicture/${uid}/${Date.now()}.${ext}`

    // Web SDK 提供 uploadFile 接口
    if (typeof this.app.uploadFile === 'function') {
      const res = await this.app.uploadFile({ cloudPath, filePath: file })
      return { code: 0, data: { fileId: res.fileID || res.fileId || cloudPath, key: cloudPath } }
    }

    // 兼容可能存在的 storage.uploadFile
    if (this.app.storage && typeof this.app.storage().uploadFile === 'function') {
      const res = await this.app.storage().uploadFile({ cloudPath, filePath: file })
      return { code: 0, data: { fileId: res.fileID || res.fileId || cloudPath, key: cloudPath } }
    }

    throw new Error('当前环境不支持直接上传，请更新 CloudBase Web SDK 版本')
  }

  /** 记录图片上传 */
  async recordPeoplePicture({ uid, fileId, key }) {
    await this.init()
    const res = await this.app.callFunction({ name: 'record_peoplepicture', data: { uid, fileId, key } })
    return res?.result || res
  }

  /** 分析最近上传的图片 */
  async analyzeLatestPeoplePicture({ uid }) {
    await this.init()
    const res = await this.app.callFunction({ name: 'analyze_latest_peoplepicture', data: { uid } })
    return res?.result || res
  }

  /** 获取指定用户的历史 skin_analyses 列表（云函数） */
  async getSkinAnalysesByUid({ uid, limit = 20, offset = 0, order = 'desc' }) {
    await this.init()
    if (!uid) throw new Error('uid 必填')
    const res = await this.app.callFunction({
      name: 'get_skin_analyses_by_uid',
      data: { uid, limit, offset, order }
    })
    return res?.result || res
  }

  /** 获取指定用户的产品成分分析历史（云函数） */
  async getProductIngredientAnalysesByUid({ uid, limit = 20, offset = 0, order = 'desc' }) {
    await this.init()
    if (!uid) throw new Error('uid 必填')
    const res = await this.app.callFunction({
      name: 'get_product_ingredient_analyses_by_uid',
      data: { uid, limit, offset, order }
    })
    return res?.result || res
  }

  /** 批量将 fileId 转为临时 URL */
  async getTempFileURLs(fileIds = []) {
    await this.init()
    const ids = Array.isArray(fileIds) ? fileIds.filter(Boolean) : []
    if (ids.length === 0) return {}

    // 优先使用 app.getTempFileURL
    if (typeof this.app.getTempFileURL === 'function') {
      const res = await this.app.getTempFileURL({ fileList: ids })
      const list = res?.fileList || res?.data || []
      const map = {}
      if (Array.isArray(list)) {
        for (const item of list) {
          const fid = item.fileID || item.fileId || item.file || item.url || ''
          const url = item.tempFileURL || item.tempUrl || item.url || ''
          if (fid) map[fid] = url
        }
      }
      return map
    }

    // 兼容 storage.getTempFileURL
    if (this.app.storage && typeof this.app.storage().getTempFileURL === 'function') {
      const res = await this.app.storage().getTempFileURL({ fileList: ids })
      const list = res?.fileList || res?.data || []
      const map = {}
      if (Array.isArray(list)) {
        for (const item of list) {
          const fid = item.fileID || item.fileId || item.file || item.url || ''
          const url = item.tempFileURL || item.tempUrl || item.url || ''
          if (fid) map[fid] = url
        }
      }
      return map
    }

    throw new Error('当前 SDK 不支持获取临时链接，请升级 CloudBase Web SDK')
  }

  /**
   * 通过云函数上传并分析产品图片（成分提取+分析，一次完成）
   * @param {Object} params
   * @param {File|Blob|string} params.file 图片文件（或已是纯 base64 字符串）
   * @returns {Promise<{success:boolean,data?:object,message?:string}>}
   */
  async analyzeProductImage({ file }) {
    await this.init()

    // 确保登录态
    const user = await this.getCurrentUser()
    if (!user || !user.uid) {
      throw new Error('请先登录后再进行产品分析')
    }

    // 转为纯 base64（不含 data: 前缀）
    const toPureBase64 = (input) => new Promise((resolve, reject) => {
      if (typeof input === 'string') {
        const idx = input.indexOf('base64,')
        return resolve(idx >= 0 ? input.slice(idx + 7) : input)
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result || ''
        const s = typeof result === 'string' ? result : ''
        const idx = s.indexOf('base64,')
        resolve(idx >= 0 ? s.slice(idx + 7) : s)
      }
      reader.onerror = reject
      reader.readAsDataURL(input)
    })

    const pureBase64 = await toPureBase64(file)
    const ext = (typeof file === 'object' && file?.name ? file.name.split('.').pop() : 'jpg') || 'jpg'

    const res = await this.app.callFunction({
      name: 'product_ingredient_analysis',
      data: { imageBase64: pureBase64, fileExtension: (ext || 'jpg').toLowerCase() }
    })

    return res?.result || res
  }

  /**
   * 调用产品混用冲突检测云函数
   * @param {Object} params
   * @param {string[]} params.productRecordIds 必填，来自 product_ingredient_analysis 的 _id
   */
  async analyzeProductConflicts({ productRecordIds }) {
    await this.init()
    if (!Array.isArray(productRecordIds) || productRecordIds.length < 2) {
      throw new Error('请至少选择两个产品进行检测')
    }
    const res = await this.app.callFunction({
      name: 'analyze_product_conflicts',
      data: { productRecordIds }
    })
    return res?.result || res
  }

  /**
   * 获取用户冲突检测历史
   */
  async getProductConflictHistory({ uid, limit = 20, offset = 0, order = 'desc' }) {
    await this.init()
    if (!uid) throw new Error('uid 必填')
    const res = await this.app.callFunction({
      name: 'get_product_conflict_history',
      data: { uid, limit, offset, order }
    })
    return res?.result || res
  }

  /**
   * 获取冲突检测详情
   */
  async getProductConflictDetail({ conflictId }) {
    await this.init()
    if (!conflictId) throw new Error('conflictId 必填')
    const res = await this.app.callFunction({
      name: 'get_product_conflict_detail',
      data: { conflictId }
    })
    return res?.result || res
  }

  /** 生成个性化护肤方案 */
  async generatePersonalizedPlan({ age, skinConcerns = [], customRequirements = '', userGender, menstrualCycle }) {
    await this.init()
    const res = await this.app.callFunction({
      name: 'generate_personalized_plan',
      data: { age, skinConcerns, customRequirements, userGender, menstrualCycle }
    })
    return res?.result || res
  }

  /** 获取当前用户的护肤方案列表 */
  async listUserPlans({ limit = 50, offset = 0, order = 'desc' } = {}) {
    await this.init()
    const res = await this.app.callFunction({ name: 'list_user_plans', data: { limit, offset, order } })
    return res?.result || res
  }

  /** 获取护肤方案详情 */
  async getPlanDetail({ planId }) {
    await this.init()
    const res = await this.app.callFunction({ name: 'get_plan_detail', data: { planId } })
    return res?.result || res
  }

  /** 删除护肤方案 */
  async deletePlan({ planId }) {
    await this.init()
    const res = await this.app.callFunction({ name: 'delete_plan', data: { planId } })
    return res?.result || res
  }

  /** 更新护肤方案步骤完成状态 */
  async updatePlanStep({ planId, period, step, completed }) {
    await this.init()
    try {
      const res = await this.app.callFunction({ name: 'update_plan_step', data: { planId, period, step, completed } })
      return res?.result || res
    } catch (error) {
      const msg = String(error?.message || error || '')
      const needFallback = /Cannot find module|FUNCTIONS_EXECUTE_FAIL|FUNCTION_NOT_FOUND/i.test(msg)
      console.warn('⚠️ update_plan_step 云函数调用失败，将尝试前端回退更新:', msg)
      if (!needFallback) throw error
      return await this.updatePlanStepClient({ planId, period, step, completed })
    }
  }

  /** 回退：使用 Web SDK 在前端直接更新方案步骤状态（仅限本人文档） */
  async updatePlanStepClient({ planId, period, step, completed }) {
    await this.init()
    if (!planId || !['morning', 'evening'].includes(period)) throw new Error('参数不合法')
    const user = await this.getCurrentUser()
    if (!user?.uid) throw new Error('未登录')
    // 读取计划
    const coll = this.db.collection('plans')
    const getRes = await coll.doc(String(planId)).get()
    const plan = Array.isArray(getRes?.data) ? getRes.data[0] : getRes?.data || null
    if (!plan) throw new Error('记录不存在')
    if (plan.uid && plan.uid !== user.uid) throw new Error('无权限')
    const list = Array.isArray(plan[period]) ? [...plan[period]] : []
    const idx = list.findIndex((it) => Number(it?.step) === Number(step))
    if (idx === -1) throw new Error('未找到对应步骤')
    list[idx] = { ...list[idx], completed: !!completed }
    // 更新
    await coll.doc(String(planId)).update({
      [period]: list,
      updatedAt: this.db.serverDate ? this.db.serverDate() : new Date()
    })
    // 读取最新
    const newRes = await coll.doc(String(planId)).get()
    const plan2 = Array.isArray(newRes?.data) ? newRes.data[0] : newRes?.data || null
    return { code: 0, message: 'OK', data: { plan: plan2 } }
  }
}

// 创建单例实例
const cloudbaseService = new CloudBaseService()

export default cloudbaseService 
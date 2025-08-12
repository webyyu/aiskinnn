import cloudbaseService from './cloudbaseService'

/**
 * Auth Service - 统一认证服务接口
 * 基于CloudBase实现手机验证码注册登录
 */
const authService = {
  /**
   * 发送手机验证码
   * @param {string} phoneNumber 手机号
   * @param {string} target 目标类型: ANY/USER/NOT_USER，默认ANY
   * @returns {Promise} 发送结果
   */
  async sendVerificationCode(phoneNumber, target = 'ANY') {
    try {
      // 验证手机号格式
      if (!cloudbaseService.validatePhoneNumber(phoneNumber)) {
        return {
          success: false,
          message: '请输入有效的手机号'
        }
      }

      // 格式化手机号
      const formattedPhone = cloudbaseService.formatPhoneNumber(phoneNumber)
      
      return await cloudbaseService.sendVerificationCode(formattedPhone, target)
    } catch (error) {
      console.error('❌ 发送验证码失败:', error)
      return {
        success: false,
        message: error.message || '发送验证码失败'
      }
    }
  },

  /**
   * 验证验证码
   * @param {string} verificationId 验证ID
   * @param {string} verificationCode 验证码
   * @returns {Promise} 验证结果
   */
  async verifyCode(verificationId, verificationCode) {
    return await cloudbaseService.verifyCode(verificationId, verificationCode)
  },

  /**
   * 注册新用户
   * @param {Object} userData 用户数据
   * @returns {Promise} 注册结果
   */
  async register(userData) {
    try {
      // 验证必填字段
      if (!userData.phoneNumber || !userData.verificationCode || !userData.verificationToken || !userData.password) {
        return {
          success: false,
          message: '请填写所有必填字段'
        }
      }

      // 验证手机号格式
      if (!cloudbaseService.validatePhoneNumber(userData.phoneNumber)) {
        return {
          success: false,
          message: '请输入有效的手机号'
        }
      }

      // 格式化手机号
      const formattedPhone = cloudbaseService.formatPhoneNumber(userData.phoneNumber)
      
      const registerData = {
        ...userData,
        phoneNumber: formattedPhone
      }
      
      return await cloudbaseService.register(registerData)
    } catch (error) {
      console.error('❌ 注册失败:', error)
      return {
        success: false,
        message: error.message || '注册失败'
      }
    }
  },

  /**
   * 用户登录 (支持验证码和密码两种方式)
   * @param {Object} credentials 登录凭据
   * @returns {Promise} 登录结果
   */
  async login(credentials) {
    try {
      // 验证必填字段
      if (!credentials.phoneNumber) {
        return {
          success: false,
          message: '请输入手机号'
        }
      }

      if (!credentials.verificationToken && !credentials.password) {
        return {
          success: false,
          message: '请输入验证码或密码'
        }
      }

      // 验证手机号格式
      if (!cloudbaseService.validatePhoneNumber(credentials.phoneNumber)) {
        return {
          success: false,
          message: '请输入有效的手机号'
        }
      }

      // 格式化手机号
      const formattedPhone = cloudbaseService.formatPhoneNumber(credentials.phoneNumber)
      
      const loginData = {
        ...credentials,
        phoneNumber: formattedPhone
      }
      
      return await cloudbaseService.login(loginData)
    } catch (error) {
      console.error('❌ 登录失败:', error)
      return {
        success: false,
        message: error.message || '登录失败'
      }
    }
  },

  /**
   * 用户登出
   */
  async logout() {
    return await cloudbaseService.logout()
  },

  /**
   * 检查用户是否已登录 (同步方法，兼容旧代码)
   * @returns {boolean} 登录状态
   */
  isAuthenticated() {
    // 简单检查本地存储的用户数据
    const user = this.getStoredUser()
    return !!user
  },

  /**
   * 检查用户是否已登录 (异步方法)
   * @returns {Promise<boolean>} 登录状态
   */
  async checkAuthenticated() {
    return await cloudbaseService.isAuthenticated()
  },

  /**
   * 获取当前用户信息 (同步方法，兼容旧代码)
   * @returns {Object|null} 用户信息
   */
  getCurrentUser() {
    return this.getStoredUser()
  },

  /**
   * 从服务器获取当前用户信息 (异步方法)
   * @returns {Promise} 用户信息
   */
  async fetchCurrentUser() {
    try {
      const user = await cloudbaseService.getCurrentUser()
      if (user) {
        // 更新本地存储
        localStorage.setItem('cloudbase_user', JSON.stringify(user))
        return {
          success: true,
          user: user
        }
      } else {
        return {
          success: false,
          message: '用户未登录'
        }
      }
    } catch (error) {
      console.error('❌ 获取用户信息失败:', error)
      return {
        success: false,
        message: error.message || '获取用户信息失败'
      }
    }
  },

  /**
   * 从本地存储获取用户信息
   * @returns {Object|null} 用户信息
   */
  getStoredUser() {
    return cloudbaseService.getStoredUser()
  },

  /**
   * 设置当前用户到本地存储 (兼容性方法)
   * @param {Object} userData 用户数据
   */
  setCurrentUser(userData) {
    try {
      localStorage.setItem('cloudbase_user', JSON.stringify(userData))
    } catch (error) {
      console.error('❌ 存储用户数据失败:', error)
    }
  },

  /**
   * 获取用户token (兼容性方法，CloudBase使用内置token管理)
   * @returns {String|null} 用户token
   */
  getToken() {
    // CloudBase使用内置token管理，这里返回一个标识表示已登录
    const user = this.getStoredUser()
    return user ? 'cloudbase_token' : null
  },

  /**
   * 验证手机号格式
   * @param {string} phone 手机号
   * @returns {boolean} 是否有效
   */
  validatePhoneNumber(phone) {
    return cloudbaseService.validatePhoneNumber(phone)
  },

  /**
   * 格式化手机号
   * @param {string} phone 手机号
   * @returns {string} 格式化后的手机号
   */
  formatPhoneNumber(phone) {
    return cloudbaseService.formatPhoneNumber(phone)
  }
}

export default authService
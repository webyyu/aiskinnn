<template>
  <div class="register-form">
    <div v-if="error" class="error-message">
      <font-awesome-icon icon="exclamation-circle" />
      <span>{{ errorMessage }}</span>
    </div>
    
    <div class="form-group">
      <label for="name">
        <font-awesome-icon icon="user" />
        用户名
      </label>
      <input 
        type="text" 
        id="name" 
        v-model="formData.name" 
        placeholder="请输入用户名"
        :class="{ 'input-error': validationErrors.name }"
      >
      <span v-if="validationErrors.name" class="validation-error">{{ validationErrors.name }}</span>
    </div>

    <div class="form-group">
      <label for="gender">
        <font-awesome-icon icon="venus-mars" />
        性别
      </label>
      <div class="gender-selection">
        <div class="gender-option" :class="{ 'selected': formData.gender === 'male' }" @click="selectGender('male')">
          <font-awesome-icon icon="mars" />
          <span>男生</span>
        </div>
        <div class="gender-option" :class="{ 'selected': formData.gender === 'female' }" @click="selectGender('female')">
          <font-awesome-icon icon="venus" />
          <span>女生</span>
        </div>
      </div>
      <span v-if="validationErrors.gender" class="validation-error">{{ validationErrors.gender }}</span>
    </div>

    <div class="form-group">
      <label for="phone">
        <font-awesome-icon icon="mobile-alt" />
        手机号
      </label>
      <input 
        type="tel" 
        id="phone" 
        v-model="formData.phone" 
        placeholder="请输入手机号"
        :class="{ 'input-error': validationErrors.phone }"
        :disabled="phoneVerified"
      >
      <span v-if="validationErrors.phone" class="validation-error">{{ validationErrors.phone }}</span>
    </div>

    <div class="form-group">
      <label for="verificationCode">
        <font-awesome-icon icon="message" />
        验证码
      </label>
      <div class="verification-input">
        <input 
          type="text" 
          id="verificationCode" 
          v-model="formData.verificationCode" 
          placeholder="请输入验证码"
          :class="{ 'input-error': validationErrors.verificationCode }"
          :disabled="!canInputCode || phoneVerified"
          maxlength="6"
        >
        <button 
          type="button" 
          class="send-code-button" 
          :disabled="sendingCode || countdown > 0 || !isPhoneValid || phoneVerified"
          @click="sendVerificationCode"
        >
          <font-awesome-icon v-if="sendingCode" icon="spinner" spin />
          <span v-else-if="countdown > 0">{{ countdown }}s</span>
          <span v-else-if="phoneVerified">已验证</span>
          <span v-else>发送验证码</span>
        </button>
      </div>
      <span v-if="validationErrors.verificationCode" class="validation-error">{{ validationErrors.verificationCode }}</span>
      <div v-if="verificationSent && !phoneVerified" class="verification-hint">
        <font-awesome-icon icon="info-circle" />
        <span>验证码已发送至 {{ formatPhone(formData.phone) }}，请注意查收</span>
      </div>
    </div>

    <div class="form-group">
      <label for="password">
        <font-awesome-icon icon="lock" />
        密码
      </label>
      <div class="password-input">
        <input 
          :type="showPassword ? 'text' : 'password'" 
          id="password" 
          v-model="formData.password" 
          placeholder="请输入密码（至少6个字符）"
          :class="{ 'input-error': validationErrors.password }"
        >
        <button 
          type="button" 
          class="password-toggle" 
          @click="togglePasswordVisibility"
        >
          <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      <span v-if="validationErrors.password" class="validation-error">{{ validationErrors.password }}</span>
    </div>

    <div class="form-group">
      <label for="confirmPassword">
        <font-awesome-icon icon="lock" />
        确认密码
      </label>
      <div class="password-input">
        <input 
          :type="showConfirmPassword ? 'text' : 'password'" 
          id="confirmPassword" 
          v-model="formData.confirmPassword" 
          placeholder="请再次输入密码"
          :class="{ 'input-error': validationErrors.confirmPassword }"
        >
        <button 
          type="button" 
          class="password-toggle" 
          @click="toggleConfirmPasswordVisibility"
        >
          <font-awesome-icon :icon="showConfirmPassword ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      <span v-if="validationErrors.confirmPassword" class="validation-error">{{ validationErrors.confirmPassword }}</span>
    </div>

    <div class="terms-agreement">
      <input type="checkbox" id="terms" v-model="formData.agreeTerms">
      <label for="terms">我已阅读并同意 <a href="#" @click.prevent="showTerms">使用条款</a> 和 <a href="#" @click.prevent="showPrivacy">隐私政策</a></label>
      <span v-if="validationErrors.agreeTerms" class="validation-error">{{ validationErrors.agreeTerms }}</span>
    </div>

    <button 
      class="register-button" 
      :disabled="loading || !phoneVerified"
      @click="handleRegister"
    >
      <font-awesome-icon v-if="loading" icon="spinner" spin />
      <span v-else>注册账号</span>
    </button>

    <div class="login-link">
      已有账号？<router-link to="/login">立即登录</router-link>
    </div>
  </div>
</template>

<script>
import authService from '@/services/authService'

export default {
  name: 'RegisterForm',
  data() {
    return {
      formData: {
        name: '',
        phone: '',
        verificationCode: '',
        password: '',
        confirmPassword: '',
        gender: '',
        agreeTerms: false
      },
      validationErrors: {
        name: '',
        phone: '',
        verificationCode: '',
        password: '',
        confirmPassword: '',
        gender: '',
        agreeTerms: ''
      },
      showPassword: false,
      showConfirmPassword: false,
      loading: false,
      error: false,
      errorMessage: '',
      // 验证码相关状态
      sendingCode: false,
      countdown: 0,
      verificationSent: false,
      verificationId: '',
      verificationToken: '',
      phoneVerified: false,
      canInputCode: false,
      countdownTimer: null
    }
  },
  computed: {
    isPhoneValid() {
      return this.formData.phone && authService.validatePhoneNumber(this.formData.phone)
    }
  },
  watch: {
    'formData.phone'() {
      // 手机号变化时重置验证状态
      this.resetVerificationStatus()
    },
    'formData.verificationCode'() {
      // 验证码输入完成时自动验证
      if (this.formData.verificationCode.length === 6 && this.verificationId && !this.phoneVerified) {
        this.verifyCode()
      }
    }
  },
  beforeUnmount() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
  },
  methods: {
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword
    },
    toggleConfirmPasswordVisibility() {
      this.showConfirmPassword = !this.showConfirmPassword
    },
    showTerms() {
      alert('使用条款内容')
    },
    showPrivacy() {
      alert('隐私政策内容')
    },
    selectGender(gender) {
      this.formData.gender = gender
    },
    formatPhone(phone) {
      if (!phone) return ''
      const cleaned = phone.replace(/\D/g, '')
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
    },
    resetVerificationStatus() {
      this.verificationSent = false
      this.phoneVerified = false
      this.canInputCode = false
      this.verificationId = ''
      this.verificationToken = ''
      this.formData.verificationCode = ''
      this.countdown = 0
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
      }
    },
    async sendVerificationCode() {
      if (!this.isPhoneValid) {
        this.validationErrors.phone = '请输入有效的手机号'
        return
      }

      this.sendingCode = true
      this.error = false

      try {
        console.log('📱 发送验证码...')
        const result = await authService.sendVerificationCode(this.formData.phone, 'NOT_USER')
        
        console.log('📱 发送结果:', result)

        if (result.success) {
          this.verificationSent = true
          this.canInputCode = true
          this.verificationId = result.verification_id
          this.startCountdown()
          
          // 如果是已注册用户，显示提示
          if (result.is_user) {
            this.error = true
            this.errorMessage = '该手机号已注册，请直接登录'
          }
        } else {
          this.error = true
          this.errorMessage = result.message || '验证码发送失败'
        }
      } catch (error) {
        this.error = true
        this.errorMessage = '验证码发送失败，请重试'
        console.error('❌ 发送验证码失败:', error)
      } finally {
        this.sendingCode = false
      }
    },
    async verifyCode() {
      if (!this.formData.verificationCode || !this.verificationId) return

      try {
        console.log('🔍 验证验证码...')
        const result = await authService.verifyCode(this.verificationId, this.formData.verificationCode)
        
        console.log('🔍 验证结果:', result)

        if (result.success) {
          this.phoneVerified = true
          this.verificationToken = result.verification_token
          this.error = false
          console.log('✅ 验证码验证成功')
        } else {
          this.validationErrors.verificationCode = result.message || '验证码错误'
        }
      } catch (error) {
        this.validationErrors.verificationCode = '验证码验证失败'
        console.error('❌ 验证码验证失败:', error)
      }
    },
    startCountdown() {
      this.countdown = 60
      this.countdownTimer = setInterval(() => {
        this.countdown--
        if (this.countdown <= 0) {
          clearInterval(this.countdownTimer)
          this.countdownTimer = null
        }
      }, 1000)
    },
    validateForm() {
      let isValid = true
      this.validationErrors = {
        name: '',
        phone: '',
        verificationCode: '',
        password: '',
        confirmPassword: '',
        gender: '',
        agreeTerms: ''
      }

      // 验证用户名
      if (!this.formData.name) {
        this.validationErrors.name = '请输入用户名'
        isValid = false
      }

      // 验证手机号
      if (!this.formData.phone) {
        this.validationErrors.phone = '请输入手机号'
        isValid = false
      } else if (!authService.validatePhoneNumber(this.formData.phone)) {
        this.validationErrors.phone = '请输入有效的手机号'
        isValid = false
      }

      // 验证验证码
      if (!this.phoneVerified) {
        this.validationErrors.verificationCode = '请先完成手机验证'
        isValid = false
      }

      // 验证密码
      if (!this.formData.password) {
        this.validationErrors.password = '请输入密码'
        isValid = false
      } else if (this.formData.password.length < 6) {
        this.validationErrors.password = '密码长度至少6个字符'
        isValid = false
      }

      // 验证确认密码
      if (!this.formData.confirmPassword) {
        this.validationErrors.confirmPassword = '请确认密码'
        isValid = false
      } else if (this.formData.password !== this.formData.confirmPassword) {
        this.validationErrors.confirmPassword = '两次输入的密码不一致'
        isValid = false
      }

      // 验证性别
      if (!this.formData.gender) {
        this.validationErrors.gender = '请选择性别'
        isValid = false
      }

      // 验证条款同意
      if (!this.formData.agreeTerms) {
        this.validationErrors.agreeTerms = '请阅读并同意条款和政策'
        isValid = false
      }

      return isValid
    },
    async handleRegister() {
      if (!this.validateForm()) return
      
      this.loading = true
      this.error = false

      try {
        console.log('📝 开始注册...')
        
        const response = await authService.register({
          phoneNumber: this.formData.phone,
          verificationCode: this.formData.verificationCode,
          verificationToken: this.verificationToken,
          password: this.formData.password,
          name: this.formData.name,
          gender: this.formData.gender
        })

        console.log('📝 注册响应:', response)

        if (response.success) {
          console.log('✅ 注册成功，用户信息:', response.user)
          // 触发注册成功事件
          this.$emit('register-success', response.user)
        } else {
          this.error = true
          this.errorMessage = response.message || '注册失败，请重试'
        }
      } catch (error) {
        this.error = true
        this.errorMessage = '注册失败，请重试'
        console.error('❌ 注册错误:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.register-form {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(255, 182, 193, 0.15);
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.error-message {
  background-color: #ffebee;
  color: #b71c1c;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.error-message svg {
  margin-right: 0.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #424242;
  display: flex;
  align-items: center;
}

label svg {
  margin-right: 0.5rem;
  color: #F8BBD0;
}

input[type="tel"],
input[type="password"],
input[type="text"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #F8BBD0;
  box-shadow: 0 0 0 2px rgba(248, 187, 208, 0.2);
}

input:disabled {
  background-color: #f5f5f5;
  color: #9e9e9e;
  cursor: not-allowed;
}

.input-error {
  border-color: #f44336;
}

.validation-error {
  color: #f44336;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
}

.password-input {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9e9e9e;
  cursor: pointer;
}

.verification-input {
  display: flex;
  gap: 0.5rem;
}

.verification-input input {
  flex: 1;
}

.send-code-button {
  padding: 0.75rem 1rem;
  background: linear-gradient(to right, #F8BBD0, #E1BEE7);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: 80px;
}

.send-code-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.send-code-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.verification-hint {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
}

.verification-hint svg {
  margin-right: 0.25rem;
}

.terms-agreement {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.terms-agreement input {
  margin-right: 0.5rem;
  margin-top: 0.25rem;
}

.terms-agreement a {
  color: #F8BBD0;
  text-decoration: none;
  font-weight: 500;
}

.register-button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(to right, #F8BBD0, #E1BEE7);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
}

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.register-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-link {
  text-align: center;
  font-size: 0.875rem;
}

.login-link a {
  color: #F8BBD0;
  font-weight: 600;
  text-decoration: none;
}

.gender-selection {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.gender-option {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fafafa;
}

.gender-option:hover {
  border-color: #F8BBD0;
  background-color: #fff;
}

.gender-option.selected {
  border-color: #F8BBD0;
  background: linear-gradient(to right, rgba(248, 187, 208, 0.1), rgba(225, 190, 231, 0.1));
  color: #F8BBD0;
}

.gender-option svg {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.gender-option span {
  font-weight: 500;
  font-size: 0.875rem;
}
</style> 
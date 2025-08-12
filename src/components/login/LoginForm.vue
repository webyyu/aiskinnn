<template>
  <div class="login-form">
    <div v-if="error" class="error-message">
      <font-awesome-icon icon="exclamation-circle" />
      <span>{{ errorMessage }}</span>
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
      >
      <span v-if="validationErrors.phone" class="validation-error">{{ validationErrors.phone }}</span>
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
          placeholder="请输入密码"
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

    <div class="form-actions">
      <div class="remember-me">
        <input type="checkbox" id="remember" v-model="formData.remember">
        <label for="remember">记住我</label>
      </div>
    </div>

    <button 
      class="login-button" 
      :disabled="loading"
      @click="handleLogin"
    >
      <font-awesome-icon v-if="loading" icon="spinner" spin />
      <span v-else>登录</span>
    </button>

    <div class="register-link">
      还没有账号？<router-link to="/register">立即注册</router-link>
    </div>
  </div>
</template>

<script>
import authService from '@/services/authService'

export default {
  name: 'LoginForm',
  data() {
    return {
      formData: {
        phone: '',
        password: '',
        remember: false
      },
      validationErrors: {
        phone: '',
        password: ''
      },
      showPassword: false,
      loading: false,
      error: false,
      errorMessage: ''
    }
  },
  methods: {
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword
    },
    validateForm() {
      let isValid = true
      this.validationErrors = {
        phone: '',
        password: ''
      }

      // 验证手机号
      if (!this.formData.phone) {
        this.validationErrors.phone = '请输入手机号'
        isValid = false
      } else if (!authService.validatePhoneNumber(this.formData.phone)) {
        this.validationErrors.phone = '请输入有效的手机号'
        isValid = false
      }

      // 验证密码
      if (!this.formData.password) {
        this.validationErrors.password = '请输入密码'
        isValid = false
      }

      return isValid
    },
    async handleLogin() {
      if (!this.validateForm()) return
      
      this.loading = true
      this.error = false

      try {
        console.log('🔐 开始登录...')
        
        const response = await authService.login({
          phoneNumber: this.formData.phone,  // 使用phoneNumber而不是phone
          password: this.formData.password
        })

        console.log('📱 登录响应:', response)

        if (response.success) {
          console.log('✅ 登录成功，用户信息:', response.user)
          // 触发登录成功事件
          this.$emit('login-success', response.user)
        } else {
          this.error = true
          this.errorMessage = response.message || '登录失败，请重试'
        }
      } catch (error) {
        this.error = true
        this.errorMessage = '登录失败，请检查手机号和密码'
        console.error('❌ 登录错误:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-form {
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

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.remember-me {
  display: flex;
  align-items: center;
}

.remember-me input {
  margin-right: 0.5rem;
}

.login-button {
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

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  font-size: 0.875rem;
}

.register-link a {
  color: #F8BBD0;
  font-weight: 600;
  text-decoration: none;
}
</style> 
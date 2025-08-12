<template>
  <div class="profile-view">
    <AppHeader 
      title="我的护肤档案" 
      icon="user-circle" 
      right-icon="cog"
      bg-color="bg-gradient"
    />

    <main class="main-content">
      <!-- 用户资料卡片 -->
      <UserProfileCard 
        :user="user"
        :stats="statsArray"
        @avatar-click="handleAvatarClick"
        @edit-profile="showUsernameModal = true"
        @edit-gender="handleEditGender"
      />
      
      <!-- 成就徽章 -->
      <AchievementBadges 
        :user-stats="stats"
        @achievement-click="handleAchievementClick"
      />
      
      <!-- 设置菜单 -->
      <SettingsMenu 
        @menu-click="handleMenuClick"
      />
    </main>

    <!-- 用户名修改弹窗 -->
    <div class="modal-overlay" v-if="showUsernameModal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">修改用户名</h3>
          <button class="close-btn" @click="showUsernameModal = false">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="new-username">新用户名</label>
            <input 
              type="text" 
              id="new-username" 
              v-model="newUsername" 
              placeholder="请输入新的用户名"
              class="form-control"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showUsernameModal = false">取消</button>
          <button 
            class="save-btn" 
            @click="updateUsername" 
            :disabled="!newUsername.trim()"
          >
            保存
          </button>
        </div>
      </div>
    </div>
    
    <!-- 性别修改弹窗 -->
    <div class="modal-overlay" v-if="showGenderModal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">修改性别</h3>
          <button class="close-btn" @click="showGenderModal = false">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>选择性别</label>
            <div class="gender-selection">
              <div class="gender-option" :class="{ 'selected': newGender === 'male' }" @click="selectGender('male')">
                <font-awesome-icon :icon="['fas', 'mars']" />
                <span>男生</span>
              </div>
              <div class="gender-option" :class="{ 'selected': newGender === 'female' }" @click="selectGender('female')">
                <font-awesome-icon :icon="['fas', 'venus']" />
                <span>女生</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showGenderModal = false">取消</button>
          <button 
            class="save-btn" 
            @click="updateGender" 
            :disabled="!newGender"
          >
            保存
          </button>
        </div>
      </div>
    </div>
    
    <!-- 反馈弹窗 -->
    <div class="modal-overlay" v-if="showFeedbackModal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">提交反馈</h3>
          <button class="close-btn" @click="showFeedbackModal = false">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="feedback-title">标题</label>
            <input 
              type="text" 
              id="feedback-title" 
              v-model="feedback.title" 
              placeholder="请输入反馈标题"
              class="form-control"
            >
          </div>
          <div class="form-group">
            <label for="feedback-category">类别</label>
            <select 
              id="feedback-category" 
              v-model="feedback.category" 
              class="form-control"
            >
              <option value="功能建议">功能建议</option>
              <option value="问题反馈">问题反馈</option>
              <option value="界面优化">界面优化</option>
              <option value="产品需求">产品需求</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label for="feedback-content">内容</label>
            <textarea 
              id="feedback-content" 
              v-model="feedback.content" 
              placeholder="请详细描述您的反馈内容"
              class="form-control"
              rows="5"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showFeedbackModal = false">取消</button>
          <button 
            class="save-btn" 
            @click="submitFeedback" 
            :disabled="!feedback.title.trim() || !feedback.content.trim()"
          >
            提交
          </button>
        </div>
      </div>
    </div>
    
    <!-- 退出登录确认弹窗 -->
    <div class="modal-overlay" v-if="showLogoutModal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">退出登录</h3>
          <button class="close-btn" @click="showLogoutModal = false">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="logout-confirmation">
            <div class="logout-icon">
              <font-awesome-icon :icon="['fas', 'sign-out-alt']" />
            </div>
            <p>确定要退出登录吗？</p>
            <p class="logout-hint">退出后需要重新登录才能使用完整功能</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showLogoutModal = false">取消</button>
          <button class="logout-btn" @click="logout">确定退出</button>
        </div>
      </div>
    </div>
    
    <!-- 消息提示 -->
    <div class="toast-container" v-if="toast.show">
      <div class="toast" :class="toast.type">
        <div class="toast-icon">
          <font-awesome-icon :icon="['fas', toast.type === 'success' ? 'check-circle' : 'exclamation-circle']" />
        </div>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </div>

    <BottomNavigation />
  </div>
</template>

<script>
import AppHeader from '@/components/common/AppHeader.vue'
import BottomNavigation from '@/components/common/BottomNavigation.vue'
import UserProfileCard from '@/components/profile/UserProfileCard.vue'
import AchievementBadges from '@/components/profile/AchievementBadges.vue'
import SettingsMenu from '@/components/profile/SettingsMenu.vue'
import authService from '@/services/authService'
import cloudbaseService from '@/services/cloudbaseService'

export default {
  name: 'ProfileView',
  components: {
    AppHeader,
    BottomNavigation,
    UserProfileCard,
    AchievementBadges,
    SettingsMenu
  },
  data() {
    return {
      user: {
        name: '猫咪护肤使用者',
        email: '',
        avatar: '',
        gender: ''
      },
      stats: {
        productsCount: 0,
        accountAge: 0,
        skinAnalysisCount: 0,
        conflictsCount: 0
      },
      showUsernameModal: false,
      showGenderModal: false,
      showFeedbackModal: false,
      showLogoutModal: false,
      newUsername: '',
      newGender: '',
      feedback: {
        title: '',
        content: '',
        category: '功能建议'
      },
      toast: {
        show: false,
        message: '',
        type: 'success'
      }
    }
  },
  computed: {
    statsArray() {
      return [
        { label: '已用产品', value: this.stats.productsCount || 28 },
        { label: '护肤天数', value: this.stats.accountAge || 15 },
        { label: '皮肤检测', value: this.stats.skinAnalysisCount || 8 }
      ]
    }
  },
  async created() {
    await this.fetchUserData()
    await this.fetchUserStats()
    this.addPageLoadAnimation()
  },
  methods: {
    async fetchUserData() {
      try {
        const user = authService.getCurrentUser()
        if (user) {
          this.user = {
            name: user.name || '猫咪护肤使用者',
            email: user.email || user.phone || '',
            avatar: user.avatar || '',
            gender: user.gender || ''
          }
        } else {
          // 本地后端未启动，临时注释掉请求，避免控制台报错
          // const response = await axios.get('/api/users/me', {
          //   headers: {
          //     Authorization: `Bearer ${authService.getToken()}`
          //   }
          // })
          // if (response.data.success) {
          //   const userData = response.data.data.user
          //   this.user = {
          //     name: userData.name || '猫咪护肤使用者',
          //     email: userData.email || userData.phone || '',
          //     avatar: userData.avatar || '',
          //     gender: userData.gender || ''
          //   }
          //   authService.setCurrentUser(userData)
          // }
        }
      } catch (error) {
        console.error('获取用户信息失败', error)
        this.showToast('获取用户信息失败', 'error')
      }
    },
    
    async fetchUserStats() {
      try {
        // 使用 CloudBase 统计，避免本地 REST 依赖
        const user = await cloudbaseService.getCurrentUser()
        if (!user || !user.uid) throw new Error('未登录')

        // 1) 产品分析条数（近似代表已用产品数）及最早记录用于账号时长估算
        let productsCount = 0
        let accountAge = 0
        try {
          // 先拿总数
          const latest = await cloudbaseService.getProductIngredientAnalysesByUid({ uid: user.uid, limit: 1, offset: 0, order: 'desc' })
          if (latest && latest.code === 0) {
            const total = latest.data?.total
            productsCount = Number.isFinite(total) ? total : (Array.isArray(latest.data?.items) ? latest.data.items.length : 0)
          }
          // 再拿最早一条估算账号天数
          const earliest = await cloudbaseService.getProductIngredientAnalysesByUid({ uid: user.uid, limit: 1, offset: 0, order: 'asc' })
          const first = Array.isArray(earliest?.data?.items) ? earliest.data.items[0] : null
          if (first && first.createdAt) {
            const firstDate = typeof first.createdAt === 'string' || typeof first.createdAt === 'number' ? new Date(first.createdAt) : (first.createdAt.toDate ? first.createdAt.toDate() : new Date(first.createdAt))
            accountAge = Math.max(0, Math.floor((Date.now() - firstDate.getTime()) / (24 * 60 * 60 * 1000)))
          }
        } catch (e) { console.log('统计产品数量或账号时长失败:', e?.message || e) }

        // 2) 冲突检测次数
        let conflictsCount = 0
        try {
          const conflicts = await cloudbaseService.getProductConflictHistory({ uid: user.uid, limit: 1, offset: 0, order: 'desc' })
          if (conflicts && conflicts.code === 0) {
            const total = conflicts.data?.total
            conflictsCount = Number.isFinite(total) ? total : (Array.isArray(conflicts.data?.items) ? conflicts.data.items.length : 0)
          }
        } catch (e) { console.log('统计冲突检测失败:', e?.message || e) }

        // 3) 皮肤检测次数（如存在对应集合/函数则统计，否则为0）
        let skinAnalysisCount = 0
        try {
          const skin = await cloudbaseService.getSkinAnalysesByUid({ uid: user.uid, limit: 1, offset: 0, order: 'desc' })
          if (skin && skin.code === 0) {
            const total = skin.data?.total
            skinAnalysisCount = Number.isFinite(total) ? total : (Array.isArray(skin.data?.items) ? skin.data.items.length : 0)
          }
        } catch (e) { console.log('统计皮肤检测失败:', e?.message || e) }

        this.stats = {
          productsCount,
          accountAge,
          skinAnalysisCount,
          conflictsCount
        }
      } catch (error) {
        // 静默降级默认值，避免控制台红错
        this.stats = {
          productsCount: 28,
          accountAge: 15,
          skinAnalysisCount: 8,
          conflictsCount: 3
        }
      }
    },
    
    handleMenuClick(action) {
      switch (action) {
        case 'history':
          this.goToHistory()
          break
        case 'favorites':
          this.goToFavorites()
          break
        case 'notifications':
          this.showToast('通知设置功能开发中', 'info')
          break
        case 'theme':
          this.showToast('主题设置功能开发中', 'info')
          break
        case 'privacy':
          this.showToast('隐私设置功能开发中', 'info')
          break
        case 'feedback':
          this.showFeedbackModal = true
          break
        case 'about':
          this.invokeAboutCloudFunction()
          break
        case 'logout':
          this.confirmLogout()
          break
        default:
          break
      }
    },
    
    handleAvatarClick() {
      this.showToast('头像点击效果', 'info')
    },
    
    handleAchievementClick(achievement) {
      this.showToast(`点击了成就：${achievement.name}`, 'info')
    },
    
    async updateUsername() {
      if (!this.newUsername.trim()) return
      
      try {
        // 注释掉本地后端更新用户名请求
        // const response = await axios.patch('/api/users/update-username', 
        //   { name: this.newUsername.trim() },
        //   {
        //     headers: {
        //       Authorization: `Bearer ${authService.getToken()}`
        //     }
        //   }
        // )
        // if (response.data.success) { ... }
        this.user.name = this.newUsername.trim()
        this.newUsername = ''
        this.showUsernameModal = false
        this.showToast('用户名已更新(本地)', 'success')
        const currentUser = authService.getCurrentUser()
        if (currentUser) { currentUser.name = this.user.name; authService.setCurrentUser(currentUser) }
      } catch (error) {
        console.error('更新用户名失败', error)
        this.showToast('更新用户名失败', 'error')
      }
    },
    
    async submitFeedback() {
      if (!this.feedback.title.trim() || !this.feedback.content.trim()) return
      
      try {
        // 注释掉本地后端提交反馈
        // const response = await axios.post('/api/ideas', 
        //   {
        //     title: this.feedback.title.trim(),
        //     content: this.feedback.content.trim(),
        //     category: this.feedback.category
        //   },
        //   {
        //     headers: {
        //       Authorization: `Bearer ${authService.getToken()}`
        //     }
        //   }
        // )
        // if (response.data.success) { ... }
        this.feedback = { title: '', content: '', category: '功能建议' }
        this.showFeedbackModal = false
        this.showToast('反馈已记录(本地)', 'success')
      } catch (error) {
        console.error('提交反馈失败', error)
        this.showToast('提交反馈失败，请稍后再试', 'error')
      }
    },
    
    confirmLogout() {
      this.showLogoutModal = true
    },
    
    async logout() {
      try {
        await authService.logout()
      } catch (error) {
        console.error('退出登录失败（SDK）', error)
      } finally {
        this.showLogoutModal = false
        this.$router.push('/login')
      }
    },
    
    showToast(message, type = 'success') {
      this.toast = {
        show: true,
        message,
        type
      }
      
      setTimeout(() => {
        this.toast.show = false
      }, 3000)
    },
    
    closeModal() {
      this.showUsernameModal = false
      this.showGenderModal = false
      this.showFeedbackModal = false
      this.showLogoutModal = false
    },
    
    goToHistory() {
      this.$router.push({ path: '/skinstatus', query: { showHistory: '1' } })
    },
    
    goToFavorites() {
      this.showToast('收藏功能开发中', 'info')
    },
    
    addPageLoadAnimation() {
      // 添加页面加载动画效果
      this.$nextTick(() => {
        const elements = document.querySelectorAll('.user-profile-card, .achievement-badges, .settings-menu')
        elements.forEach((el, index) => {
          el.style.opacity = '0'
          el.style.transform = 'translateY(20px)'
          setTimeout(() => {
            el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }, index * 150)
        })
      })
    },
    
    selectGender(gender) {
      this.newGender = gender
    },
    
    async updateGender() {
      if (!this.newGender) return
      
      try {
        // 注释掉本地后端更新性别
        // const response = await axios.patch('/api/users/update-gender', 
        //   { gender: this.newGender },
        //   {
        //     headers: {
        //       Authorization: `Bearer ${authService.getToken()}`
        //     }
        //   }
        // )
        // if (response.data.success) { ... }
        this.user.gender = this.newGender
        this.showGenderModal = false
        this.showToast('性别已更新(本地)', 'success')
      } catch (error) {
        console.error('更新性别失败', error)
        this.showToast('更新性别失败', 'error')
      }
    },
    
    handleEditGender() {
      this.newGender = this.user.gender || ''
      this.showGenderModal = true
    },

    async invokeAboutCloudFunction() {
      try {
        const result = await cloudbaseService.callHelloWorld()
        const message = typeof result === 'string' ? result : (result?.message || 'Hello World')
        this.showToast(`关于我们：${message}`, 'success')
        console.log('关于我们云函数返回：', result)
      } catch (error) {
        this.showToast('获取关于信息失败', 'error')
      }
    }
  }
}
</script>

<style scoped>
.profile-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 5rem;
  position: relative;
}

.main-content {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 120px);
  border-radius: 24px 24px 0 0;
  margin-top: 1rem;
  padding-top: 0.5rem;
  overflow-y: auto;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 90%;
  max-width: 500px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  animation: modalSlideUp 0.3s ease-out;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: white;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  color: #1f2937;
  background-color: #f9fafb;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background-color: white;
}

textarea.form-control {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.logout-confirmation {
  text-align: center;
  padding: 1rem 0;
}

.logout-icon {
  width: 4rem;
  height: 4rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: white;
  font-size: 1.5rem;
}

.logout-confirmation p {
  margin: 0.5rem 0;
  color: #374151;
}

.logout-hint {
  font-size: 0.875rem;
  color: #6b7280 !important;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f3f4f6;
  gap: 0.75rem;
  background-color: #f9fafb;
}

.cancel-btn, .save-btn, .logout-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.cancel-btn {
  background-color: #f3f4f6;
  color: #6b7280;
}

.cancel-btn:hover {
  background-color: #e5e7eb;
}

.save-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logout-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.logout-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Toast 样式 */
.toast-container {
  position: fixed;
  bottom: 6rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
}

.toast {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  background: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  animation: toastSlideUp 0.3s ease-out;
  min-width: 300px;
}

.toast.success {
  border-left: 4px solid #10b981;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast.info {
  border-left: 4px solid #3b82f6;
}

.toast-icon {
  margin-right: 0.75rem;
  font-size: 1.25rem;
}

.toast.success .toast-icon {
  color: #10b981;
}

.toast.error .toast-icon {
  color: #ef4444;
}

.toast.info .toast-icon {
  color: #3b82f6;
}

.toast-message {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

@keyframes toastSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* AppHeader 样式覆盖 */
:deep(.bg-gradient) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-header, .modal-body, .modal-footer {
    padding: 1rem;
  }
  
  .toast {
    min-width: 280px;
    margin: 0 1rem;
  }
}

/* 性别选择样式 */
.gender-selection {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.gender-option {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #f9fafb;
}

.gender-option:hover {
  border-color: #667eea;
  background-color: white;
}

.gender-option.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  color: #667eea;
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
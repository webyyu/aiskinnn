<template>
  <div class="core-features">
    <!-- Features Container with Border -->
    <div class="features-container">
      <div class="section-header">
        <h2 class="title">核心功能</h2>
      </div>
      
      <div class="features-grid">
        <!-- Product Analysis -->
        <router-link to="/product" class="feature-link">
          <div class="feature-card">
            <!-- Decorative Number -->
            <div class="decorative-number number-01">01</div>
            <!-- Content -->
            <div class="feature-content">
              <h3 class="feature-title">产品分析</h3>
              <p class="feature-description">AI智能解析成分</p>
            </div>
          </div>
        </router-link>

        <!-- Conflict Detection -->
        <router-link to="/product?conflictMode=true" class="feature-link">
          <div class="feature-card">
            <!-- Decorative Number -->
            <div class="decorative-number number-02">02</div>
            <!-- Content -->
            <div class="feature-content">
              <h3 class="feature-title">冲突检测</h3>
              <p class="feature-description">避免产品成分冲突</p>
            </div>
          </div>
        </router-link>

        <!-- Skin Analysis -->
        <router-link to="/skinstatus" class="feature-link">
          <div class="feature-card">
            <!-- Decorative Number -->
            <div class="decorative-number number-03">03</div>
            <!-- Content -->
            <div class="feature-content">
              <h3 class="feature-title">肌肤检测</h3>
              <p class="feature-description">AI智能皮肤分析</p>
            </div>
          </div>
        </router-link>

        <!-- Personalized Plan -->
        <div class="feature-link" @click="openPersonalizedRoutineModal">
          <div class="feature-card">
            <!-- Decorative Number -->
            <div class="decorative-number number-04">04</div>
            <!-- Content -->
            <div class="feature-content">
              <h3 class="feature-title">个性化方案</h3>
              <p class="feature-description">AI定制护肤方案</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Personalized Routine Modal -->
    <AppModal :show="showPersonalizedRoutineModal" @close="showPersonalizedRoutineModal = false">
      <div class="routine-modal">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title">
            <font-awesome-icon :icon="['fas', 'magic']" class="mr-2" />
            个性化护肤方案
          </h3>
          <button class="close-button" @click="showPersonalizedRoutineModal = false">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        
        <!-- Loading State -->
        <div v-if="loadingPlan" class="loading-container">
          <div class="loading-spinner"></div>
          <p>AI正在为您定制专属护肤方案...</p>
        </div>
        
        <!-- Error State -->
        <div v-else-if="planError" class="error-message">
          {{ planError }}
        </div>
        
        <!-- Input State (Initial or Reset) -->
        <div v-else-if="!generatedPlan" class="routine-input">
          <p class="input-description">
            请告诉我您的护肤需求，AI将结合您的个人信息和最新肌肤状态为您定制个性化护肤方案。
          </p>
          
          <!-- 年龄输入 -->
          <div class="input-group">
            <label class="input-label">年龄</label>
            <input 
              type="number" 
              v-model="userAge" 
              class="age-input" 
              placeholder="请输入您的年龄"
              min="13"
              max="120"
            >
          </div>
          
          <!-- 最新肌肤状态显示 -->
          <div class="input-group" v-if="latestAnalysisDisplay">
            <label class="input-label">最新肌肤状态</label>
            <div class="skin-status-card">
              <div class="skin-status-header">
                <span class="skin-type">{{ latestAnalysisDisplay.skinType.type }}</span>
                <span class="health-score" :class="getHealthScoreClass(latestAnalysisDisplay.overallAssessment.healthScore)">
                  {{ latestAnalysisDisplay.overallAssessment.healthScore }}/100
                </span>
              </div>
              <div class="skin-condition">{{ latestAnalysisDisplay.overallAssessment.skinCondition }}</div>
              <div class="analysis-date">
                分析时间：{{ formatDate(latestAnalysisDisplay.createdAt) }}
              </div>
            </div>
          </div>
          
          <!-- 无肌肤分析时的提示 -->
          <div class="input-group" v-else>
            <div class="no-analysis-tip">
              <font-awesome-icon :icon="['fas', 'info-circle']" class="mr-2" />
              暂无肌肤分析数据，建议先进行肌肤检测获得更精准的护肤方案
              <router-link to="/skinstatus" class="analysis-link">去检测</router-link>
            </div>
          </div>
          
          <!-- 生理周期信息（仅女性用户） -->
          <div class="input-group" v-if="userGender === 'female'">
            <label class="input-label">生理周期状态</label>
            <div class="menstrual-cycle-options">
              <div class="cycle-option">
                <input 
                  type="checkbox" 
                  id="inCycle" 
                  v-model="menstrualCycle.isInCycle"
                  @change="onCycleStatusChange"
                >
                <label for="inCycle">当前处于生理周期</label>
              </div>
              <div v-if="menstrualCycle.isInCycle" class="cycle-details">
                <div class="cycle-day-input">
                  <label>周期第几天：</label>
                  <input 
                    type="number" 
                    v-model="menstrualCycle.cycleDay" 
                    min="1" 
                    max="40"
                    placeholder="1-7"
                  >
                  <span>天</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Skin Concerns -->
          <div class="input-group">
            <label class="input-label">护肤需求</label>
            <div class="skin-concerns">
              <button 
                v-for="concern in skinConcerns" 
                :key="concern.value"
                class="concern-button"
                :class="{ active: selectedConcerns.includes(concern.value) }"
                @click="toggleConcern(concern.value)"
              >
                <font-awesome-icon :icon="concern.icon" class="mr-2" />
                {{ concern.label }}
              </button>
            </div>
          </div>
          
          <!-- Custom Requirements -->
          <div class="input-group">
            <label class="input-label">其他需求</label>
            <textarea 
              v-model="customRequirements" 
              class="custom-requirements" 
              placeholder="描述您的其他特殊需求，如敏感肌、特定产品偏好等..."
              rows="3"
            ></textarea>
          </div>
          
          <!-- Submit Button -->
          <button 
            class="generate-button" 
            @click="generatePersonalizedPlan"
            :disabled="!userAge || selectedConcerns.length === 0"
          >
            <font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" class="mr-2" />
            开始生成
          </button>
        </div>
        
        <!-- Result State -->
        <div v-else class="routine-result">
          <PersonalizedRoutinePreview 
            :plan="generatedPlan" 
            @save-routine="savePlanToRoutine" 
            @customize-routine="resetPlan"
          />
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script>
import AppModal from '@/components/common/AppModal.vue'
import PersonalizedRoutinePreview from '@/components/home/PersonalizedRoutinePreview.vue'
// 使用 CloudBase 云函数/DB
import cloudbaseService from '@/services/cloudbaseService'
import authService from '@/services/authService'

export default {
  name: 'CoreFeatures',
  components: {
    AppModal,
    PersonalizedRoutinePreview
  },
  data() {
    return {
      showPersonalizedRoutineModal: false,
      loadingPlan: false,
      planError: null,
      generatedPlan: null,
      selectedConcerns: [],
      userAge: '',
      latestSkinAnalysis: null,
      userGender: '',
      menstrualCycle: {
        isInCycle: false,
        cycleDay: 1
      },
      customRequirements: '',
      
      // Predefined options
      skinConcerns: [
        { label: '补水', value: 'hydration', icon: ['fas', 'tint'] },
        { label: '美白', value: 'brightening', icon: ['fas', 'sun'] },
        { label: '抗老', value: 'anti-aging', icon: ['fas', 'clock'] },
        { label: '控油', value: 'oil-control', icon: ['fas', 'oil-can'] },
        { label: '修护', value: 'repair', icon: ['fas', 'band-aid'] },
        { label: '祛痘', value: 'acne', icon: ['fas', 'virus'] }
      ]
    }
  },
  computed: {
    latestAnalysisDisplay() {
      const item = this.latestSkinAnalysis
      if (!item) return null
      const src = (item.analysis && typeof item.analysis === 'object') ? item.analysis : item
      return {
        skinType: src.skinType || { type: '未知', subtype: '', basis: '' },
        overallAssessment: src.overallAssessment || { healthScore: 0, skinCondition: '' },
        createdAt: src.createdAt || item.createdAt || src.analysisDate || item.analysisDate || null
      }
    }
  },
  async created() {
    await this.loadUserInfo()
  },
  methods: {
    async loadUserInfo() {
      try {
        // 获取用户信息（本地保存的用户资料用于年龄/性别展示）
        const user = authService.getCurrentUser()
        if (user) {
          this.userAge = user.age || ''
          this.userGender = user.gender || ''
          if (user.menstrualCycle) {
            this.menstrualCycle = {
              isInCycle: user.menstrualCycle.isInCycle || false,
              cycleDay: user.menstrualCycle.cycleDay || 1
            }
          }
        }
        
        // 获取最新肌肤分析（CloudBase）
        try {
          const cbUser = await cloudbaseService.getCurrentUser()
          if (cbUser && cbUser.uid) {
            const res = await cloudbaseService.getSkinAnalysesByUid({ uid: cbUser.uid, limit: 1, offset: 0, order: 'desc' })
            const items = Array.isArray(res?.data?.items) ? res.data.items : []
            this.latestSkinAnalysis = items[0] || null
          }
        } catch (error) {
          console.log('暂无肌肤分析数据:', error?.message || error)
        }
      } catch (error) {
        console.error('加载用户信息失败:', error)
      }
    },
    async openPersonalizedRoutineModal() {
      this.showPersonalizedRoutineModal = true
      await this.loadUserInfo() // 每次打开弹窗时刷新用户信息
    },
    toggleConcern(concern) {
      const index = this.selectedConcerns.indexOf(concern)
      if (index === -1) {
        // Add if not already selected (max 3)
        if (this.selectedConcerns.length < 3) {
          this.selectedConcerns.push(concern)
        }
      } else {
        // Remove if already selected
        this.selectedConcerns.splice(index, 1)
      }
    },
    async generatePersonalizedPlan() {
      if (!this.userAge || this.selectedConcerns.length === 0) {
        return
      }
      
      this.loadingPlan = true
      this.planError = null
      
      try {
        // 直接调用云函数生成
        const cloudbaseService = (await import('@/services/cloudbaseService')).default
        const res = await cloudbaseService.generatePersonalizedPlan({
          age: parseInt(this.userAge),
          skinConcerns: this.selectedConcerns,
          customRequirements: this.customRequirements,
          userGender: this.userGender || 'female',
          menstrualCycle: this.userGender === 'female' ? this.menstrualCycle : null
        })
        if (res && res.code === 0) {
          this.generatedPlan = res.data?.plan
        } else {
          this.planError = res?.message || '获取个性化护肤方案失败'
        }
      } catch (error) {
        this.planError = '获取个性化护肤方案时出错，请重试'
        console.error('❌ 获取个性化护肤方案错误:', error)
      } finally {
        this.loadingPlan = false
      }
    },
    getHealthScoreClass(score) {
      const s = typeof score === 'number' ? score : 0
      if (s < 30) return 'low-score'
      if (s < 60) return 'medium-score'
      return 'high-score'
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('zh-CN')
    },
    onCycleStatusChange() {
      if (!this.menstrualCycle.isInCycle) {
        this.menstrualCycle.cycleDay = 1
      }
    },
    resetPlan() {
      this.generatedPlan = null
      this.selectedConcerns = []
      this.customRequirements = ''
    },
    savePlanToRoutine() {
      // Convert plan data to the format expected by DailyRoutine
      if (this.generatedPlan) {
        // Create a correctly formatted plan object
        const formattedPlan = {
          routines: {
            morning: [],
            evening: []
          },
          recommendations: this.generatedPlan.recommendations || []
        };
        
        // Format morning routine
        if (this.generatedPlan.morning && this.generatedPlan.morning.length > 0) {
          formattedPlan.routines.morning = this.generatedPlan.morning.map(item => item.product);
        }
        
        // Format evening routine
        if (this.generatedPlan.evening && this.generatedPlan.evening.length > 0) {
          formattedPlan.routines.evening = this.generatedPlan.evening.map(item => item.product);
        }
        
        // Save to DailyRoutine.vue
        this.$emit('save-routine', formattedPlan);
        console.log('护肤方案已格式化并发送给父组件:', formattedPlan);
      } else {
        console.error('没有可用的护肤方案数据');
      }
      
      this.showPersonalizedRoutineModal = false;
      
      // Navigate to home page to see the updated daily routine
      this.$router.push({ path: '/' });
      
      // Use a non-modal notification instead of alert
      this.$emit('show-notification', '护肤方案已保存到您的日常护理中');
    }
  }
}
</script>

<style scoped>
.core-features {
  margin-bottom: 2rem;
}

/* Features Container - matches home.html styling */
.features-container {
  background-color: #ffffff;
  border-radius: 24px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border: 1px solid #f3f4f6;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

/* Grid Layout - exactly like home.html */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1rem;
}

/* Feature Link - block level */
.feature-link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

/* Feature Card - matches home.html design */
.feature-card {
  background: linear-gradient(to bottom right, #ffffff, #f9fafb);
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 140px;
  position: relative;
  overflow: hidden;
  border: 1px solid #f3f4f6;
}

.feature-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-4px);
}

/* Decorative Numbers */
.decorative-number {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  font-size: 6rem;
  font-weight: 700;
  user-select: none;
  pointer-events: none;
  line-height: 1;
}

.number-01 {
  color: #fdf2f8;
}

.number-02 {
  color: #faf5ff;
}

.number-03 {
  color: #eff6ff;
}

.number-04 {
  color: #f0fdf4;
}

/* Feature Content */
.feature-content {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.feature-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.feature-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Modal Styles */
.routine-modal {
  background-color: white;
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
}

.close-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #e0e0e0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #9c27b0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background-color: #ffebee;
  color: #d32f2f;
  padding: 1rem;
  border-radius: 12px;
  margin: 1rem 0;
  text-align: center;
}

/* Input State Styles */
.routine-input {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-description {
  font-size: 0.9375rem;
  color: #666;
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-label {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.age-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  font-size: 0.9375rem;
  transition: all 0.2s ease;
}

.age-input:focus {
  outline: none;
  border-color: #ce93d8;
  box-shadow: 0 0 0 2px rgba(206, 147, 216, 0.2);
}

.skin-status-card {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid #e9ecef;
}

.skin-status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.skin-type {
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
}

.health-score {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.low-score {
  background-color: #ffebee;
  color: #d32f2f;
}

.medium-score {
  background-color: #fff3e0;
  color: #f57c00;
}

.high-score {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.skin-condition {
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.analysis-date {
  font-size: 0.75rem;
  color: #adb5bd;
}

.no-analysis-tip {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.analysis-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.5rem;
}

.analysis-link:hover {
  text-decoration: underline;
}

.menstrual-cycle-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cycle-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cycle-option input[type="checkbox"] {
  margin: 0;
}

.cycle-details {
  margin-left: 1.5rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.cycle-day-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cycle-day-input label {
  font-size: 0.875rem;
  color: #6c757d;
  margin: 0;
}

.cycle-day-input input {
  width: 60px;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #ced4da;
  text-align: center;
}

.cycle-day-input input:focus {
  outline: none;
  border-color: #ce93d8;
  box-shadow: 0 0 0 2px rgba(206, 147, 216, 0.2);
}

.cycle-day-input span {
  font-size: 0.875rem;
  color: #6c757d;
}

.skin-concerns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.concern-button {
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.concern-button:hover {
  background-color: #e9ecef;
}

.concern-button.active {
  background-color: #f3e5f5;
  border-color: #ce93d8;
  color: #9c27b0;
}

.custom-requirements {
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  font-size: 0.9375rem;
  resize: vertical;
  transition: all 0.2s ease;
}

.custom-requirements:focus {
  outline: none;
  border-color: #ce93d8;
  box-shadow: 0 0 0 2px rgba(206, 147, 216, 0.2);
}

.generate-button {
  width: 100%;
  padding: 0.875rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #9c27b0, #673ab7);
  border: none;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.generate-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #8e24aa, #5e35b1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.generate-button:disabled {
  background: #e0e0e0;
  color: #9e9e9e;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .features-container {
    padding: 1rem;
    border-radius: 20px;
  }
  
  .features-grid {
    gap: 0.75rem;
  }
  
  .feature-card {
    padding: 1rem;
    height: 120px;
  }
  
  .decorative-number {
    font-size: 4rem;
    bottom: 0.25rem;
    right: 0.25rem;
  }
  
  .feature-title {
    font-size: 1rem;
  }
  
  .feature-description {
    font-size: 0.8125rem;
  }
  
  .routine-modal {
    padding: 1rem;
    max-width: 95%;
  }
}

@media (max-width: 480px) {
  .features-container {
    padding: 1rem;
  }
  
  .features-grid {
    gap: 0.5rem;
  }
  
  .feature-card {
    padding: 0.75rem;
    height: 100px;
  }
  
  .decorative-number {
    font-size: 3rem;
  }
  
  .feature-title {
    font-size: 0.9375rem;
  }
  
  .feature-description {
    font-size: 0.75rem;
  }
}
</style> 
<template>
  <div class="product-view">
    
    <header class="product-header">
      <div class="header-container">
        <h1 class="header-title">
          <font-awesome-icon :icon="['fas', 'paw']" class="header-icon" />
          护肤产品库
        </h1>
      </div>
    </header>
    
    <main class="main-content">
      <!-- Product Form Modal -->
      <div v-if="showUploadModal" class="product-modal-backdrop" @click.self="closeUploadModal">
        <div class="product-modal">
          <div class="modal-header">
            <div class="header-image">
              <div class="image-overlay">
                <font-awesome-icon :icon="['fas', 'paw']" class="paw-icon" />
                <font-awesome-icon :icon="['fas', 'plus-circle']" class="plus-icon" />
              </div>
            </div>
            <button class="close-button" @click="closeUploadModal">
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
            <h3 class="modal-title">添加护肤产品</h3>
            <p class="modal-subtitle">上传产品图片，AI将自动识别产品成分并进行分析</p>
          </div>
          
          <div class="modal-content">
            <div v-if="analysisResult">
              <div class="result-header" style="text-align:center; margin-bottom: 1rem;">
                <div v-if="analysisResult.imageTempUrl" style="margin-bottom: 0.5rem;">
                  <img :src="analysisResult.imageTempUrl" alt="产品图片" style="max-width: 160px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />
                </div>
                <h4 style="margin: 0.25rem 0; font-weight: 600;">{{ analysisResult.productName || '分析结果' }}</h4>
              </div>
              <div class="result-summary" style="background:#f9fafb; border-radius:12px; padding:12px; margin-bottom:12px;">
                <div style="font-size:0.9rem; color:#444; white-space:pre-wrap;">{{ analysisResult.analysis?.summary || '暂无总结' }}</div>
              </div>
              <div class="result-metrics" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom:12px;">
                <div style="background:#fff; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                  <div style="font-size:12px; color:#777;">安全性</div>
                  <div style="font-size:18px; font-weight:600;">{{ analysisResult.analysis?.safetyIndex || '-' }}</div>
                </div>
                <div style="background:#fff; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                  <div style="font-size:12px; color:#777;">功效评分</div>
                  <div style="font-size:18px; font-weight:600;">{{ analysisResult.analysis?.efficacyScore || '-' }}</div>
                </div>
                <div style="background:#fff; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                  <div style="font-size:12px; color:#777;">活性成分</div>
                  <div style="font-size:18px; font-weight:600;">{{ analysisResult.analysis?.activeIngredients || '-' }}</div>
                </div>
              </div>
              <div v-if="Array.isArray(analysisResult.analysis?.efficacyAnalysis) && analysisResult.analysis.efficacyAnalysis.length" style="background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:12px;">
                <div style="font-weight:600; margin-bottom:6px;">主要功效</div>
                <ul style="margin:0; padding-left:18px;">
                  <li v-for="(item, idx) in analysisResult.analysis.efficacyAnalysis" :key="idx" style="font-size:0.9rem; color:#555;">{{ item }}</li>
                </ul>
              </div>
              <div v-if="Array.isArray(analysisResult.ingredients) && analysisResult.ingredients.length" style="background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05)">
                <div style="font-weight:600; margin-bottom:6px;">识别到的成分（{{ analysisResult.ingredients.length }}）</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                  <span v-for="(ing, idx) in analysisResult.ingredients" :key="idx" style="background:#f3e5f5; color:#6a1b9a; padding:4px 8px; border-radius:999px; font-size:12px;">{{ ing }}</span>
                </div>
              </div>
            </div>
            <template v-else>
              <div v-if="modalError" class="error-message">
                <font-awesome-icon :icon="['fas', 'exclamation-circle']" />
                <p>{{ modalErrorMessage }}</p>
              </div>
              
              <ImageUploader 
                ref="imageUploader"
                placeholder="点击选择产品图片"
                @image-selected="onImageSelected"
                @image-removed="onImageRemoved"
                @upload-start="onUploadStart"
                @upload-complete="onUploadComplete"
              />
              
              <div v-if="showProgressSteps" class="progress-steps">
                <div 
                  class="progress-step" 
                  :class="{ 'active': currentStep >= 1, 'complete': currentStep > 1 }"
                >
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <h4 class="step-title">创建产品</h4>
                    <p class="step-description">{{ stepStatus.create }}</p>
                  </div>
                </div>
                
                <div 
                  class="progress-step" 
                  :class="{ 'active': currentStep >= 2, 'complete': currentStep > 2 }"
                >
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <h4 class="step-title">上传图片</h4>
                    <p class="step-description">{{ stepStatus.upload }}</p>
                  </div>
                </div>
                
                <div 
                  class="progress-step" 
                  :class="{ 'active': currentStep >= 3, 'complete': currentStep > 3 }"
                >
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <h4 class="step-title">提取成分</h4>
                    <p class="step-description">{{ stepStatus.extract }}</p>
                  </div>
                </div>
                
                <div 
                  class="progress-step" 
                  :class="{ 'active': currentStep >= 4, 'complete': currentStep > 4 }"
                >
                  <div class="step-number">4</div>
                  <div class="step-content">
                    <h4 class="step-title">分析成分</h4>
                    <p class="step-description">{{ stepStatus.analyze }}</p>
                  </div>
                </div>
              </div>
            </template>
          </div>
          
          <div class="modal-footer">
            <button 
              v-if="!analysisResult"
              class="submit-button"
              :disabled="!canSubmit || isLoading || isExtracting || isAnalyzing"
              @click="submitProduct"
            >
              <font-awesome-icon v-if="isLoading" :icon="['fas', 'spinner']" spin />
              <span v-else>{{ submitButtonText }}</span>
            </button>
            <button v-else class="submit-button" @click="closeUploadModal">完成</button>
          </div>
        </div>
      </div>
      
      <!-- Add Product Component -->
      <div class="add-product-container">
        <div class="add-product-card">
          <h3 class="add-product-title">
            <font-awesome-icon :icon="['fas', 'plus-circle']" class="title-icon" />
            添加新产品到猫窝
          </h3>
          <div class="add-product-options">
            <button class="option-button" @click="showUploadModal = true">
              <div class="option-icon-container">
                <font-awesome-icon :icon="['fas', 'camera']" class="option-icon" />
              </div>
              <div class="option-content">
                <span class="option-title">添加产品</span>
                <span class="option-description">猫眼扫描成分</span>
              </div>
            </button>
            <button class="option-button" @click="enableConflictMode">
              <div class="option-icon-container">
                <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="option-icon" />
              </div>
              <div class="option-content">
                <span class="option-title">产品混用检测</span>
                <span class="option-description">确保混用安全</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 冲突模式顶栏提示（仅UI） -->
      <div v-if="conflictMode" class="conflict-mode-container">
        <div class="conflict-mode-header">
          <div class="conflict-mode-title">
            <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="mr-2" />
            已进入产品混用检测（已选 {{ selectedProductIds.length }} 个）
          </div>
          <div class="conflict-mode-actions">
            <button class="conflict-cancel-btn" @click="cancelConflictMode">取消</button>
          </div>
        </div>
        <div class="selected-count">请在下方列表选择至少两个产品进行检测</div>
      </div>

      <!-- 已分析产品 列表 -->
      <div class="analysis-list-container">
        <h3 class="add-product-title">
          <font-awesome-icon :icon="['fas', 'search']" class="title-icon" />
          已分析产品
        </h3>
        <div v-if="loadingAnalyses" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载分析记录中...</p>
        </div>
        <div v-else-if="analysesError" class="error-message">{{ analysesError }}</div>
        <div v-else-if="analysisItems.length === 0" class="empty-history">
          <font-awesome-icon :icon="['fas', 'info-circle']" class="mr-2" />暂无分析记录
        </div>
      </div>
      
      <!-- Product List -->
      <ProductList 
        :userId="''"
        :products="analyzedProducts"
        :selectionMode="conflictMode"
        :selectedProductIds="selectedProductIds"
        :openAnalysisDetail="true"
        @select-product="onSelectProduct"
        @toggle-selection="toggleProductSelection"
        @delete-product="handleDeleteProduct"
        @open-analysis="onOpenAnalysisFromList"
      />
      
      <!-- Action Button for Conflict Analysis -->
      <div v-if="conflictMode" class="floating-action-container">
        <button 
          class="floating-analyze-btn" 
          :class="{ 'disabled': selectedProductIds.length < 2 || conflictAnalyzing }"
          :disabled="selectedProductIds.length < 2 || conflictAnalyzing"
          @click="analyzeConflict"
        >
          <font-awesome-icon :icon="['fas', 'search']" class="mr-2" />
          {{ conflictAnalyzing ? '正在检测...' : ('分析 ' + selectedProductIds.length + ' 个产品的冲突') }}
        </button>
      </div>
      
      <!-- Conflict History Button -->
      <div class="conflict-history-button" @click="toggleConflictHistory">
        <font-awesome-icon :icon="['fas', 'history']" />
      </div>
      
      <!-- Conflict History Modal -->
      <AppModal :show="showConflictHistory" @close="showConflictHistory = false">
        <div class="conflict-history-modal">
          <div class="modal-header">
            <h3 class="modal-title">
              <font-awesome-icon :icon="['fas', 'history']" class="mr-2" />
              冲突检测历史
            </h3>
            <button class="close-button" @click="showConflictHistory = false">
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>
          
          <div v-if="loadingHistory" class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载冲突历史记录中...</p>
          </div>
          
          <div v-else-if="historyError" class="error-message">
            {{ historyError }}
          </div>
          
          <div v-else-if="conflictHistory.length === 0" class="empty-history">
            <font-awesome-icon :icon="['fas', 'info-circle']" class="mr-2" />
            暂无冲突检测历史记录
          </div>
          
          <div v-else class="conflict-history-list">
            <div 
              v-for="conflict in conflictHistory" 
              :key="conflict.id" 
              class="conflict-history-item"
              @click="viewConflictDetail(conflict.id)"
            >
              <div class="conflict-info">
                <div class="conflict-date">{{ formatDate(conflict.createdAt) }}</div>
                <div class="conflict-products">
                  <span v-for="(product, index) in conflict.products" :key="index">
                    {{ product }}{{ index < conflict.products.length - 1 ? ' + ' : '' }}
                  </span>
                </div>
              </div>
              <div class="view-detail">
                <font-awesome-icon :icon="['fas', 'chevron-right']" />
              </div>
            </div>
          </div>
        </div>
      </AppModal>
      
      <!-- Conflict Detail Modal -->
      <AppModal :show="showConflictDetail" @close="showConflictDetail = false">
        <div class="conflict-detail-modal">
          <div class="modal-header">
            <h3 class="modal-title">
              <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="mr-2" />
              冲突检测详情
            </h3>
            <button class="close-button" @click="showConflictDetail = false">
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>
          
          <div v-if="loadingDetail" class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载冲突详情中...</p>
          </div>
          
          <div v-else-if="detailError" class="error-message">
            {{ detailError }}
          </div>
          
          <div v-else-if="conflictDetail" class="conflict-detail-content">
            <!-- Products -->
            <div class="conflict-products-container">
              <h4 class="section-title">检测产品</h4>
              <div class="product-cards">
                <div 
                  v-for="product in conflictDetail.products" 
                  :key="product._id" 
                  class="conflict-product-card"
                >
                  <img :src="product.imageUrl" alt="产品图片" class="product-image" 
                       :data-fileid="product.fileId || ''"
                       @error="handleConflictImageError($event, product)"
                  />
                  <div class="product-info">
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-description">{{ truncateText(product.description, 100) }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Conflicts -->
            <div v-if="conflictDetail.conflicts && conflictDetail.conflicts.length > 0" class="conflicts-container">
              <h4 class="section-title">检测到的冲突</h4>
              <div class="conflicts-list">
                <div 
                  v-for="(conflict, index) in conflictDetail.conflicts" 
                  :key="index" 
                  class="conflict-item"
                >
                  <div class="conflict-components">
                    <span v-for="(component, compIndex) in conflict.components" :key="compIndex">
                      {{ component }}{{ compIndex < conflict.components.length - 1 ? ' + ' : '' }}
                    </span>
                  </div>
                  <div class="conflict-severity" :class="'severity-' + conflict.severity.toLowerCase()">
                    {{ conflict.severity }}风险
                  </div>
                  <div class="conflict-description">
                    {{ conflict.description }}
                  </div>
                  <div v-if="conflict.effects && conflict.effects.length > 0" class="conflict-effects">
                    <div class="effects-title">可能产生的影响：</div>
                    <ul>
                      <li v-for="(effect, effectIndex) in conflict.effects" :key="effectIndex">
                        {{ effect }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Safe Combinations -->
            <div v-if="conflictDetail.safeCombo && conflictDetail.safeCombo.length > 0" class="safe-combo-container">
              <h4 class="section-title">安全组合</h4>
              <div class="safe-combo-list">
                <div 
                  v-for="(combo, index) in conflictDetail.safeCombo" 
                  :key="index" 
                  class="safe-combo-item"
                >
                  <div class="combo-components">
                    <span v-for="(component, compIndex) in combo.components" :key="compIndex">
                      {{ component }}{{ compIndex < combo.components.length - 1 ? ' + ' : '' }}
                    </span>
                  </div>
                  <div class="combo-description">
                    {{ combo.description }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Recommendations -->
            <div v-if="conflictDetail.recommendations" class="recommendations-container">
              <h4 class="section-title">使用建议</h4>
              
              <!-- Product Pairings -->
              <div v-if="conflictDetail.recommendations.productPairings" class="pairings-container">
                <!-- Cannot Use Together -->
                <div v-if="conflictDetail.recommendations.productPairings.cannotUseTogether && conflictDetail.recommendations.productPairings.cannotUseTogether.length > 0" class="cannot-use-together">
                  <h5 class="subsection-title">不建议一起使用</h5>
                  <div class="pairings-list">
                    <div 
                      v-for="(pairing, index) in conflictDetail.recommendations.productPairings.cannotUseTogether" 
                      :key="index" 
                      class="pairing-item cannot-use"
                    >
                      <div class="pairing-products">
                        <span v-for="(product, prodIndex) in pairing.products" :key="prodIndex">
                          {{ product }}{{ prodIndex < pairing.products.length - 1 ? ' + ' : '' }}
                        </span>
                      </div>
                      <div class="pairing-reason">
                        原因：{{ pairing.reason }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Can Use Together -->
                <div v-if="conflictDetail.recommendations.productPairings.canUseTogether && conflictDetail.recommendations.productPairings.canUseTogether.length > 0" class="can-use-together">
                  <h5 class="subsection-title">可以一起使用</h5>
                  <div class="pairings-list">
                    <div 
                      v-for="(pairing, index) in conflictDetail.recommendations.productPairings.canUseTogether" 
                      :key="index" 
                      class="pairing-item can-use"
                    >
                      <div class="pairing-products">
                        <span v-for="(product, prodIndex) in pairing.products" :key="prodIndex">
                          {{ product }}{{ prodIndex < pairing.products.length - 1 ? ' + ' : '' }}
                        </span>
                      </div>
                      <div class="pairing-reason">
                        原因：{{ pairing.reason }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Routines -->
              <div v-if="conflictDetail.recommendations.routines" class="routines-container">
                <h5 class="subsection-title">建议使用顺序</h5>
                
                <!-- Morning Routine -->
                <div v-if="conflictDetail.recommendations.routines.morning && conflictDetail.recommendations.routines.morning.length > 0" class="routine-section">
                  <div class="routine-header">
                    <font-awesome-icon :icon="['fas', 'sun']" class="mr-2" />
                    <span>早间护理</span>
                  </div>
                  <div class="routine-steps">
                    <div 
                      v-for="(step, index) in conflictDetail.recommendations.routines.morning" 
                      :key="index" 
                      class="routine-step"
                    >
                      {{ step }}
                    </div>
                  </div>
                </div>
                
                <!-- Evening Routine -->
                <div v-if="conflictDetail.recommendations.routines.evening && conflictDetail.recommendations.routines.evening.length > 0" class="routine-section">
                  <div class="routine-header">
                    <font-awesome-icon :icon="['fas', 'moon']" class="mr-2" />
                    <span>晚间护理</span>
                  </div>
                  <div class="routine-steps">
                    <div 
                      v-for="(step, index) in conflictDetail.recommendations.routines.evening" 
                      :key="index" 
                      class="routine-step"
                    >
                      {{ step }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppModal>
      
      <!-- 分析详情弹窗 -->
      <AppModal :show="showAnalysisDetail" @close="closeAnalysisDetail">
        <div class="analysis-detail-modal">
          <div class="modal-header">
            <h3 class="modal-title">
              <font-awesome-icon :icon="['fas', 'search']" class="mr-2" />
              分析详情
            </h3>
            <button class="close-button" @click="closeAnalysisDetail">
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>

          <div v-if="selectedAnalysis" class="analysis-detail-content">
            <div class="result-header" style="text-align:center; margin-bottom: 1rem;">
              <div style="margin-bottom: 0.5rem;">
                <img :src="selectedAnalysis.displayImageUrl" alt="产品图片" style="max-width: 160px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />
              </div>
              <h4 style="margin: 0.25rem 0; font-weight: 600;">{{ selectedAnalysis.productName || '分析结果' }}</h4>
              <div style="font-size:12px; color:#777;">{{ formatDate(selectedAnalysis.createdAt) }}</div>
            </div>

            <div class="result-summary" style="background:#f9fafb; border-radius:12px; padding:12px; margin-bottom:12px;">
              <div style="font-size:0.9rem; color:#444; white-space:pre-wrap;">{{ selectedAnalysis.analysis?.summary || '暂无总结' }}</div>
            </div>

            <div class="result-metrics" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom:12px;">
              <div style="background:#fff; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:12px; color:#777;">安全性</div>
                <div style="font-size:18px; font-weight:600;">{{ selectedAnalysis.analysis?.safetyIndex || '-' }}</div>
              </div>
              <div style="background:#fff; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:12px; color:#777;">功效评分</div>
                <div style="font-size:18px; font-weight:600;">{{ selectedAnalysis.analysis?.efficacyScore || '-' }}</div>
              </div>
              <div style="background:#fff; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:12px; color:#777;">活性成分</div>
                <div style="font-size:18px; font-weight:600;">{{ selectedAnalysis.analysis?.activeIngredients || '-' }}</div>
              </div>
            </div>

            <div v-if="Array.isArray(selectedAnalysis.analysis?.efficacyAnalysis) && selectedAnalysis.analysis.efficacyAnalysis.length" style="background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:12px;">
              <div style="font-weight:600; margin-bottom:6px;">主要功效</div>
              <ul style="margin:0; padding-left:18px;">
                <li v-for="(item, idx) in selectedAnalysis.analysis.efficacyAnalysis" :key="idx" style="font-size:0.9rem; color:#555;">{{ item }}</li>
              </ul>
            </div>

            <div v-if="Array.isArray(selectedAnalysis.ingredients) && selectedAnalysis.ingredients.length" style="background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05)">
              <div style="font-weight:600; margin-bottom:6px;">识别到的成分（{{ selectedAnalysis.ingredients.length }}）</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                <span v-for="(ing, idx) in selectedAnalysis.ingredients" :key="idx" style="background:#f3e5f5; color:#6a1b9a; padding:4px 8px; border-radius:999px; font-size:12px;">{{ ing }}</span>
              </div>
            </div>
          </div>
        </div>
      </AppModal>

      <BottomNavigation />
    </main>
    
  </div>
</template>

<script>
import BottomNavigation from '@/components/common/BottomNavigation.vue'
import ProductList from '@/components/product/ProductList.vue'
import ImageUploader from '@/components/product/ImageUploader.vue'
import authService from '@/services/authService'
import AppModal from '@/components/common/AppModal.vue'
import cloudbaseService from '@/services/cloudbaseService'

export default {
  name: 'ProductView',
  components: { BottomNavigation, ProductList, AppModal, ImageUploader },
  data() {
    return {
      selectedProductIds: [],
      currentUserId: '',
      currentCloudUid: '',
      conflictMode: false,
      loading: false,
      error: null,
      showConflictHistory: false,
      loadingHistory: false,
      historyError: null,
      conflictHistory: [],
      showConflictDetail: false,
      loadingDetail: false,
      detailError: null,
      conflictDetail: null,
      showUploadModal: false,
      selectedImage: null,
      modalError: false,
      modalErrorMessage: '',
      showProgressSteps: false,
      stepStatus: { create: '等待创建', upload: '等待上传', extract: '等待提取', analyze: '等待分析' },
      currentStep: 0,
      isLoading: false,
      isExtracting: false,
      isAnalyzing: false,
      productId: null,
      imageUrl: '',
      analysisResult: null,
      // 新增：分析列表
      loadingAnalyses: false,
      analysesError: null,
      analysisItems: [],
      // 分析详情
      showAnalysisDetail: false,
      selectedAnalysis: null,
      // 冲突分析过程控制
      conflictAnalyzing: false
    }
  },
  computed: {
    canSubmit() { return this.selectedImage != null },
    submitButtonText() {
      if (this.isExtracting) return '正在提取成分...'
      if (this.isAnalyzing) return '正在分析成分...'
      return '上传图片并分析'
    },
    // 将分析记录映射为 ProductList 所需结构
    analyzedProducts() {
      return (this.analysisItems || []).map(it => ({
        id: it._id,
        name: it.productName || '未命名产品',
        description: it.analysis?.summary || '',
        label: '',
        safetyScore: it.analysis?.safetyIndex,
        efficacyScore: it.analysis?.efficacyScore,
        overallRating: it.analysis?.overallRating || undefined,
        imageUrl: it.displayImageUrl || '',
        fileId: it.fileId || ''
      }))
    }
  },
  async mounted() {
    // 原有用户ID（本地后端用）
    const user = authService.getCurrentUser();
    if (user && user._id) {
      this.currentUserId = user._id;
    }
    // 追加：获取 CloudBase 登录用户UID
    try {
      const cbUser = await cloudbaseService.getCurrentUser()
      if (cbUser && cbUser.uid) {
        this.currentCloudUid = cbUser.uid
        this.loadProductAnalyses()
      }
    } catch (e) {
      console.log('获取 CloudBase 用户失败:', e && e.message ? e.message : e)
    }

    // 回流参数处理
    if (this.$route.query.fromConflict === 'true') {
      this.$router.replace({ query: {} });
    }
    if (this.$route.query.conflictMode === 'true') {
      this.enableConflictMode();
    }
  },
  methods: {
    // 加载已分析产品列表
    async loadProductAnalyses() {
      if (!this.currentCloudUid) return
      this.loadingAnalyses = true
      this.analysesError = null
      try {
        const res = await cloudbaseService.getProductIngredientAnalysesByUid({ uid: this.currentCloudUid, limit: 50, offset: 0, order: 'desc' })
        if (res && res.code === 0) {
          const items = Array.isArray(res.data?.items) ? res.data.items : []
          const fileIds = items.map(i => i.fileId).filter(Boolean)
          let urlMap = {}
          try {
            urlMap = fileIds.length ? await cloudbaseService.getTempFileURLs(fileIds) : {}
          } catch (_) { urlMap = {} }
          this.analysisItems = items.map(it => ({
            ...it,
            displayImageUrl: (it.fileId && urlMap[it.fileId]) || it.imageUrl || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop'
          }))
        } else {
          this.analysesError = res?.message || '获取分析记录失败'
        }
      } catch (e) {
        this.analysesError = e?.message || '获取分析记录失败'
      } finally {
        this.loadingAnalyses = false
      }
    },
    viewAnalysisDetail(item) {
      this.selectedAnalysis = item
      this.showAnalysisDetail = true
    },
    closeAnalysisDetail() {
      this.showAnalysisDetail = false
      this.selectedAnalysis = null
    },
    onProductAdded(productData) { console.log('New product added:', productData) },
    onSelectProduct(product) { console.log('Selected product:', product) },
    onOpenAnalysisFromList(product) {
      // product 来源于 analyzedProducts，字段与 analysisItems 不完全一致，这里通过 id 匹配回原始项
      const found = (this.analysisItems || []).find(i => i._id === product.id)
      this.viewAnalysisDetail(found || {
        _id: product.id,
        productName: product.name,
        analysis: {},
        ingredients: [],
        displayImageUrl: product.imageUrl,
        createdAt: new Date()
      })
    },
    toggleProductSelection(productId) {
      const index = this.selectedProductIds.indexOf(productId);
      if (index === -1) { this.selectedProductIds.push(productId) } else { this.selectedProductIds.splice(index, 1) }
    },
    enableConflictMode() { this.conflictMode = true; this.selectedProductIds = [] },
    cancelConflictMode() { this.conflictMode = false; this.selectedProductIds = [] },
    analyzeConflict() {
      if (this.selectedProductIds.length < 2) { return }
      if (this.conflictAnalyzing) { return }
      // 打开详情弹窗，显示加载态，防止重复点击
      this.showConflictDetail = true
      this.loadingDetail = true
      this.detailError = null
      this.conflictDetail = null
      this.conflictAnalyzing = true
      ;(async () => {
        try {
          const res = await cloudbaseService.analyzeProductConflicts({ productRecordIds: this.selectedProductIds })
          if (res && res.code === 0) {
            const d = res.data || {}
            // 先构造局部 detail，再刷新临时URL，最后一次性赋值，避免初次渲染403
            const detail = {
              products: Array.isArray(d.products) ? d.products : [],
              conflicts: d.conflicts || [],
              safeCombo: d.safeCombo || [],
              recommendations: d.recommendations || {}
            }
            try {
              const fids = (detail.products || []).map(p => p.fileId).filter(Boolean)
              if (fids.length) {
                const map = await cloudbaseService.getTempFileURLs(fids)
                detail.products = (detail.products || []).map(p => ({
                  ...p,
                  imageUrl: (p.fileId && map[p.fileId]) || p.imageUrl || ''
                }))
              }
            } catch (e) {
              console.log('刷新冲突结果图片临时链接失败:', e && e.message ? e.message : e)
            }
            this.conflictDetail = detail
          } else {
            this.detailError = res?.message || '冲突检测失败，请稍后重试'
          }
        } catch (e) {
          this.detailError = e?.message || '冲突检测失败，请稍后重试'
        } finally {
          this.loadingDetail = false
          this.conflictAnalyzing = false
          this.conflictMode = false
          this.selectedProductIds = []
        }
      })()
    },
    toggleConflictHistory() {
      this.showConflictHistory = !this.showConflictHistory;
      if (this.showConflictHistory) { this.fetchConflictHistory() }
    },
    async fetchConflictHistory() {
      if (!this.currentCloudUid) return;
      this.loadingHistory = true;
      this.historyError = null;
      this.conflictHistory = [];
      try {
        const res = await cloudbaseService.getProductConflictHistory({ uid: this.currentCloudUid, limit: 50, offset: 0, order: 'desc' })
        if (res && res.code === 0) {
          const items = Array.isArray(res.data?.items) ? res.data.items : []
          this.conflictHistory = items
        } else {
          this.historyError = res?.message || '获取冲突检测历史失败'
        }
      } catch (error) {
        this.historyError = error?.message || '获取冲突检测历史时出错，请重试'
      } finally {
        this.loadingHistory = false;
      }
    },
    async viewConflictDetail(conflictId) {
      this.showConflictDetail = true;
      this.loadingDetail = true;
      this.detailError = null;
      this.conflictDetail = null;
      try {
        const res = await cloudbaseService.getProductConflictDetail({ conflictId })
        if (res && res.code === 0) {
          // 先在局部变量中处理图片URL，避免初次渲染使用过期链接
          const raw = res.data?.conflict || null
          if (raw) {
            const detail = {
              ...raw,
              products: Array.isArray(raw.products) ? raw.products : []
            }
            try {
              const fids = (detail.products || []).map(p => p.fileId).filter(Boolean)
              if (fids.length) {
                const map = await cloudbaseService.getTempFileURLs(fids)
                detail.products = (detail.products || []).map(p => ({
                  ...p,
                  imageUrl: (p.fileId && map[p.fileId]) || p.imageUrl || ''
                }))
              }
            } catch (e) {
              console.log('刷新冲突详情图片临时链接失败:', e && e.message ? e.message : e)
            }
            this.conflictDetail = detail
          } else {
            this.conflictDetail = null
          }
        } else {
          this.detailError = res?.message || '获取冲突检测详情失败'
        }
      } catch (error) {
        this.detailError = error?.message || '获取冲突检测详情时出错，请重试'
      } finally {
        this.loadingDetail = false;
      }
    },
    formatDate(dateStr) {
      const d = typeof dateStr === 'string' || typeof dateStr === 'number' ? new Date(dateStr) : (dateStr && dateStr.toDate ? dateStr.toDate() : new Date(dateStr))
      return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
    truncateText(text, maxLength) { if (!text) return ''; return text.length > maxLength ? text.slice(0, maxLength) + '...' : text },
    async handleDeleteProduct(productId) {
      try {
        const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authService.getToken()}` }
        });
        const data = await response.json();
        if (data.success) {
          // item removed by ProductList
        } else {
          alert(data.message || '删除产品失败，请重试');
        }
      } catch (error) {
        alert('删除产品时出错，请重试');
      }
    },
    onImageSelected(image) { this.selectedImage = image; this.modalError = false },
    onImageRemoved() { this.selectedImage = null },
    onUploadStart() {},
    onUploadComplete() {},
    closeUploadModal() { this.showUploadModal = false; this.selectedImage = null; this.resetModalState() },
    resetModalState() {
      this.modalError = false;
      this.modalErrorMessage = '';
      this.showProgressSteps = false;
      this.currentStep = 0;
      this.isLoading = false;
      this.isExtracting = false;
      this.isAnalyzing = false;
      this.productId = null;
      this.imageUrl = '';
      this.analysisResult = null;
      this.stepStatus = {
        create: '等待创建',
        upload: '等待上传',
        extract: '等待提取',
        analyze: '等待分析'
      };
    },
    async submitProduct() {
      if (!this.canSubmit) return;
      
      this.isLoading = true;
      this.modalError = false;
      this.showProgressSteps = true;
      this.currentStep = 1;
      
      try {
        // 使用云函数一步完成 上传+OCR提取+AI分析
        this.stepStatus.create = '准备中...';
        this.currentStep = 2;
        this.stepStatus.upload = '上传中...';

        const fnRes = await cloudbaseService.analyzeProductImage({ file: this.selectedImage.file })
        if (!fnRes || fnRes.success !== true) {
          throw new Error(fnRes?.message || '云函数处理失败')
        }

        this.stepStatus.upload = '上传成功';
        this.currentStep = 3;
        this.isExtracting = true;
        this.stepStatus.extract = '提取成功';
        this.currentStep = 4;
        this.isExtracting = false;
        this.isAnalyzing = true;
        this.stepStatus.analyze = '分析成功';
        this.isAnalyzing = false;
        this.currentStep = 5;

        const { data } = fnRes
        this.analysisResult = data
        this.showProgressSteps = false
        this.isLoading = false
        
      } catch (error) {
        this.modalError = true;
        this.modalErrorMessage = error.message || '处理失败，请重试';
        if (this.currentStep === 1) {
          this.stepStatus.create = '创建失败';
        } else if (this.currentStep === 2) {
          this.stepStatus.upload = '上传失败';
        } else if (this.currentStep === 3) {
          this.stepStatus.extract = '提取失败';
          this.isExtracting = false;
        } else if (this.currentStep === 4) {
          this.stepStatus.analyze = '分析失败';
          this.isAnalyzing = false;
        }
      } finally {
        this.isLoading = false;
      }
    },
    async handleConflictImageError(e, product) {
      try {
        const fid = (e && e.target && e.target.dataset && e.target.dataset.fileid) || (product && product.fileId)
        if (!fid) { e.target.src = 'https://place-hold.it/100x100?text=No+Image'; return }
        const map = await cloudbaseService.getTempFileURLs([fid])
        const freshUrl = map && map[fid]
        if (freshUrl) {
          e.target.src = freshUrl
          if (product) product.imageUrl = freshUrl
          return
        }
      } catch (err) { console.log('刷新图片临时链接失败:', err && err.message ? err.message : err) }
      e.target.src = 'https://place-hold.it/100x100?text=No+Image'
    }
  }
}
</script>

<style scoped>
.product-view { min-height: 100vh; background-color: #f8f9fa; padding-bottom: 4rem; }
.product-header { background: linear-gradient(135deg, #f8bbd0, #e1bee7); padding: 1rem 1rem; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); position: relative; z-index: 10; }
.header-container { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
.back-button { width: 36px; height: 36px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; color: white; transition: all 0.3s ease; }
.back-button:hover { background-color: rgba(255, 255, 255, 0.3); transform: translateX(-2px); }
.header-title { font-size: 1.25rem; font-weight: 600; color: white; display: flex; align-items: center; justify-content: center; width: 100%; text-align: center; }
.header-icon { margin-right: 0.5rem; font-size: 1.125rem; }
.menu-button { width: 36px; height: 36px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; color: white; border: none; cursor: pointer; transition: all 0.3s ease; }
.menu-button:hover { background-color: rgba(255, 255, 255, 0.3); }
.main-content { padding: 1.25rem; position: relative; max-width: 1200px; margin: 0 auto; }
/* Conflict mode styles */
.conflict-mode-container { background-color: white; border-radius: 16px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
.conflict-mode-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
.conflict-mode-title { font-size: 1rem; font-weight: 500; color: #333; display: flex; align-items: center; }
.conflict-mode-actions { display: flex; gap: 0.5rem; }
.conflict-analyze-btn, .conflict-cancel-btn { padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.875rem; border: none; cursor: pointer; }
.conflict-analyze-btn { background-color: #CE93D8; color: white; }
.conflict-analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.conflict-cancel-btn { background-color: #f5f5f5; color: #757575; }
.selected-count { font-size: 0.875rem; color: #757575; padding: 0.25rem 0; }
.floating-action-container { position: fixed; bottom: 4.5rem; left: 1rem; right: 1rem; z-index: 10; display: flex; justify-content: center; }
.floating-analyze-btn { background-color: #CE93D8; color: white; padding: 0.75rem 1.5rem; border-radius: 9999px; box-shadow: 0 4px 12px rgba(206, 147, 216, 0.5); border: none; font-weight: 500; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.floating-analyze-btn:hover:not(.disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(206, 147, 216, 0.6); }
.floating-analyze-btn.disabled { opacity: 0.5; cursor: not-allowed; }
/* Conflict History Button */
.conflict-history-button { position: fixed; bottom: 5.5rem; right: 1rem; width: 3rem; height: 3rem; border-radius: 50%; background: linear-gradient(to right bottom, #ab47bc, #7b1fa2); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(171, 71, 188, 0.4); z-index: 20; transition: all 0.3s ease; font-size: 1.25rem; }
.conflict-history-button:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 6px 14px rgba(171, 71, 188, 0.5); }
.conflict-history-button:active { transform: translateY(-1px); }
/* Conflict History Modal */
.conflict-history-modal { background-color: white; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-title { font-size: 1.25rem; font-weight: 600; color: #111; margin: 0; display: flex; align-items: center; }
.close-button { width: 32px; height: 32px; border-radius: 50%; background-color: #f5f5f5; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
.close-button:hover { background-color: #e0e0e0; }
.loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #CE93D8; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.error-message { background-color: #ffebee; color: #d32f2f; padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: center; }
.empty-history { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; color: #757575; text-align: center; }
.conflict-history-list { display: flex; flex-direction: column; gap: 0.75rem; }
.conflict-history-item { background-color: #f9fafb; border-radius: 10px; padding: 1rem; cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); transition: all 0.2s ease; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #9c27b0; }
.conflict-history-item:hover { background-color: #f5f5f5; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); transform: translateY(-2px); }
.conflict-info { flex: 1; }
.conflict-date { font-size: 0.75rem; color: #757575; margin-bottom: 0.5rem; }
.conflict-products { font-size: 0.9375rem; font-weight: 500; color: #333; }
.view-detail { color: #9c27b0; font-size: 0.875rem; }
/* Conflict Detail Modal */
.conflict-detail-modal { background-color: white; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; }
.conflict-detail-content { display: flex; flex-direction: column; gap: 1.5rem; }
.section-title { font-size: 1.125rem; font-weight: 600; color: #333; margin: 0 0 1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.5rem; }
.subsection-title { font-size: 1rem; font-weight: 500; color: #424242; margin: 0 0 0.75rem; }
/* Products */
.product-cards { display: flex; flex-direction: column; gap: 0.75rem; }
.conflict-product-card { display: flex; align-items: center; background-color: #f9fafb; border-radius: 10px; padding: 0.75rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }
.product-image { width: 64px; height: 64px; border-radius: 5px; object-fit: cover; margin-right: 1rem; }
.product-info { flex: 1; }
.product-name { font-size: 1rem; font-weight: 500; color: #333; margin-bottom: 0.25rem; }
.product-description { font-size: 0.875rem; color: #666; }
/* Conflicts */
.conflicts-list, .safe-combo-list { display: flex; flex-direction: column; gap: 0.75rem; }
.conflict-item { background-color: #fff2f4; border-radius: 8px; padding: 1rem; border-left: 3px solid #f44336; }
.conflict-components { font-size: 1rem; font-weight: 600; color: #d32f2f; margin-bottom: 0.5rem; }
.conflict-severity { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem; }
.severity-高 { background-color: #ffebee; color: #d32f2f; }
.severity-中 { background-color: #fff8e1; color: #ff8f00; }
.severity-低 { background-color: #e8f5e9; color: #2e7d32; }
.conflict-description { font-size: 0.9375rem; color: #616161; margin-bottom: 0.75rem; }
.conflict-effects { background-color: #fff; border-radius: 6px; padding: 0.75rem; }
.effects-title { font-size: 0.875rem; font-weight: 500; color: #616161; margin-bottom: 0.5rem; }
.conflict-effects ul { margin: 0; padding-left: 1.5rem; }
.conflict-effects li { font-size: 0.875rem; color: #757575; margin-bottom: 0.25rem; }
/* Safe Combinations */
.safe-combo-item { background-color: #f1f8e9; border-radius: 8px; padding: 1rem; border-left: 3px solid #8bc34a; }
.combo-components { font-size: 1rem; font-weight: 600; color: #558b2f; margin-bottom: 0.5rem; }
.combo-description { font-size: 0.9375rem; color: #616161; }
/* Recommendations */
.pairings-container, .routines-container { margin-top: 1rem; }
.pairings-list { display: flex; flex-direction: column; gap: 0.75rem; }
.pairing-item { border-radius: 8px; padding: 0.75rem; }
.pairing-item.cannot-use { background-color: #ffebee; border-left: 3px solid #f44336; }
.pairing-item.can-use { background-color: #e8f5e9; border-left: 3px solid #4caf50; }
.pairing-products { font-size: 0.9375rem; font-weight: 500; margin-bottom: 0.5rem; }
.pairing-reason { font-size: 0.875rem; color: #616161; }
.routine-section { margin-bottom: 1rem; }
.routine-header { display: flex; align-items: center; margin-bottom: 0.5rem; color: #616161; font-size: 0.9375rem; font-weight: 500; }
.routine-steps { background-color: #f5f5f5; border-radius: 8px; padding: 0.75rem; }
.routine-step { padding: 0.5rem; border-bottom: 1px solid #e0e0e0; font-size: 0.875rem; color: #424242; }
.routine-step:last-child { border-bottom: none; }
.mr-2 { margin-right: 0.5rem; }
/* Product Form Modal */
.product-modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.4); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.product-modal { width: 90%; max-width: 500px; max-height: 90vh; background: rgba(255, 255, 255, 0.85); border-radius: 24px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15); overflow-y: auto; animation: modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; }
@keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to   { opacity: 1; transform: scale(1); } }
.header-image { position: relative; height: 120px; background-image: url('https://images.unsplash.com/photo-1556228578-769fc5bd7976?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'); background-size: cover; background-position: center; border-top-left-radius: 24px; border-top-right-radius: 24px; overflow: hidden; }
.image-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to right bottom, rgba(255, 182, 193, 0.7), rgba(216, 180, 254, 0.7)); display: flex; justify-content: center; align-items: center; }
.paw-icon { font-size: 2.5rem; color: white; margin-right: -10px; transform: rotate(-15deg); filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2)); }
.plus-icon { font-size: 1.75rem; color: white; filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2)); }
.modal-header { position: relative; }
.close-button { position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.3); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; color: white; font-size: 16px; z-index: 2; }
.close-button:hover { background: rgba(255, 255, 255, 0.5); transform: scale(1.1); }
.modal-title { font-size: 1.5rem; font-weight: 600; color: #333; margin: 0; padding: 1rem 1.5rem 0.25rem; text-align: center; }
.modal-subtitle { font-size: 0.9rem; color: #666; margin: 0 0 1rem; text-align: center; padding: 0 1.5rem; }
.modal-content { padding: 0.5rem 1.5rem; }
.modal-footer { padding: 1rem 1.5rem 1.5rem; display: flex; justify-content: center; }
.error-message { background-color: #FFEBEE; color: #D32F2F; padding: 0.75rem; border-radius: 12px; margin-bottom: 1rem; display: flex; align-items: center; font-size: 14px; }
.error-message svg { margin-right: 0.5rem; font-size: 16px; }
.submit-button { width: 100%; padding: 0.875rem; background: linear-gradient(135deg, #FF9A9E, #FECFEF); color: white; border: none; border-radius: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 154, 158, 0.4); display: flex; justify-content: center; align-items: center; }
.submit-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 154, 158, 0.5); }
.submit-button:disabled { opacity: 0.7; cursor: not-allowed; }
/* Progress step styles */
.progress-steps { margin: 1rem 0; padding: 1rem; background-color: rgba(255, 255, 255, 0.6); border-radius: 16px; }
.progress-step { display: flex; align-items: flex-start; margin-bottom: 1rem; opacity: 0.5; transition: all 0.3s ease; }
.progress-step:last-child { margin-bottom: 0; }
.progress-step.active { opacity: 1; }
.step-number { width: 28px; height: 28px; background-color: #E0E0E0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 12px; color: #757575; flex-shrink: 0; }
.progress-step.active .step-number { background: linear-gradient(135deg, #FF9A9E, #FECFEF); color: white; }
.progress-step.complete .step-number { background: linear-gradient(135deg, #A8EDEA, #FED6E3); color: white; }
/* Add Product Component */
.add-product-container { margin-bottom: 1rem; }
.add-product-card { background-color: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: all 0.3s ease; }
.add-product-card:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1); }
.add-product-title { font-size: 1.25rem; font-weight: 600; color: #333; margin-bottom: 1.25rem; display: flex; align-items: center; }
.title-icon { color: #FF9A9E; margin-right: 0.5rem; font-size: 1.25rem; }
.add-product-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.option-button { background-color: #f9f9f9; border: none; border-radius: 12px; padding: 1.25rem; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; text-align: center; }
.option-button:hover { background-color: #f0f0f0; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05); }
.option-icon-container { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #FF9A9E, #FECFEF); display: flex; justify-content: center; align-items: center; margin-bottom: 1rem; box-shadow: 0 5px 15px rgba(255, 154, 158, 0.3); }
.option-icon { font-size: 1.5rem; color: white; }
.option-content { display: flex; flex-direction: column; gap: 0.25rem; }
.option-title { font-size: 1rem; font-weight: 500; color: #333; }
.option-description { font-size: 0.75rem; color: #757575; }
/* 分析列表样式 */
.analysis-list-container { margin-bottom: 1rem; }
.analysis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.analysis-card { background: #fff; border-radius: 14px; box-shadow: 0 8px 20px rgba(0,0,0,0.06); overflow: hidden; cursor: pointer; transition: transform .2s ease, box-shadow .2s ease; }
.analysis-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,0.08); }
.analysis-image-wrapper { position: relative; width: 100%; padding-top: 60%; background: #f4f5f7; }
.analysis-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.analysis-badge { position: absolute; left: 10px; bottom: 10px; background: rgba(0,0,0,0.55); color: #fff; padding: 4px 8px; border-radius: 999px; font-size: 12px; }
.analysis-info { padding: 10px 12px 12px; }
.analysis-name { font-weight: 600; color: #333; margin-bottom: 8px; }
.analysis-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.metric { background: #fafafa; border-radius: 8px; padding: 8px; text-align: center; }
.metric .label { display: block; font-size: 12px; color: #777; margin-bottom: 2px; }
.metric .value { font-weight: 700; color: #111; }

/* 分析详情弹窗 */
.analysis-detail-modal { background-color: white; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; }
.analysis-detail-content { display: flex; flex-direction: column; gap: 1rem; }

/* 复用已存在样式：.modal-header/.modal-title/.close-button 等 */
</style> 
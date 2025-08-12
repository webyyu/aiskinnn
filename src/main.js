import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import authService from './services/authService'
import axios from 'axios'
import config from './api/config'

// 引入全局样式
import './assets/styles/skin-analysis.css'

// Import FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
  faHome, faPaw, faFlask, faCamera, faUser, 
  faArrowLeft, faArrowUp, faBell, faSearch, faWifi, faSignal, 
  faBatteryFull, faBolt, faExclamationTriangle, 
  faShareAlt, faSave, faShoppingBasket, faTimes, 
  faSearchPlus, faClock, faExclamation, faCheck, 
  faSun, faMoon, faEllipsisV, faPlusCircle, faImage,
  faShieldAlt, faChevronRight, faTint, faOilCan, 
  faExclamationCircle, faHistory,
  faQuestionCircle, faCog, faEnvelope, faLock,
  faEye, faEyeSlash, faSpinner, faVenusMars, faMobileAlt,
  // 新增补充的图标
  faMars, faVenus, faCrown, faPenToSquare, faStar, faHeart, faLeaf, faGem,
  faWandMagicSparkles, faWandMagic, faFire, faBookmark, faPalette,
  faCircleInfo, faRightFromBracket, faTableCellsLarge, faCircleUser,
  faMessage, faBandAid, faVirus, faCircleCheck,
  // 本次新增
  faAward, faMicroscope, faCircle, faBrain, faLightbulb, faRobot, faCalendarCheck,
  // 新增：修复 icon="plus" 报错
  faPlus,
  // 新增图标：box-open、upload
  faBoxOpen, faUpload,
  // 新增：修复缺少的 check-circle
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons'
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons'

// 为 sparkles 创建别名，指向 wand-magic-sparkles
const faSparkles = { ...faWandMagicSparkles, iconName: 'sparkles' }

// Add icons to library
library.add(
  faHome, faPaw, faFlask, faCamera, faUser, 
  faArrowLeft, faArrowUp, faBell, faSearch, faWifi, faSignal, 
  faBatteryFull, faBolt, faExclamationTriangle, 
  faShareAlt, faSave, faShoppingBasket, faTimes, 
  faSearchPlus, faClock, faExclamation, faCheck, 
  faSun, faMoon, faEllipsisV, faPlusCircle, faImage,
  faShieldAlt, faChevronRight, faTint, faOilCan, 
  faExclamationCircle, faHistory,
  faQuestionCircle, faCog, faEnvelope, faLock,
  faEye, faEyeSlash, faSpinner, faVenusMars, faMobileAlt,
  // 新增补充的图标
  faMars, faVenus, faCrown, faPenToSquare, faStar, faHeart, faLeaf, faGem,
  faWandMagicSparkles, faWandMagic, faFire, faBookmark, faPalette,
  faCircleInfo, faRightFromBracket, faTableCellsLarge, faCircleUser,
  faMessage, faBandAid, faVirus, faCircleCheck,
  // 本次新增
  faAward, faMicroscope, faCircle, faBrain, faLightbulb, faRobot, faCalendarCheck,
  // 别名注册
  faSparkles,
  // 新增注册：修复缺少 plus 图标
  faPlus,
  // 新增注册：box-open 与 upload
  faBoxOpen, faUpload,
  // 新增注册：regular 的 circle 与 solid 的 check-circle
  farCircle, faCheckCircle
)

// Import Views
import HomeView from './views/HomeView.vue'
import ProductView from './views/ProductView.vue'
import ConflictView from './views/ConflictView.vue'
import SkinStatusView from './views/SkinStatusView.vue'
import ProfileView from './views/ProfileView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import IngredientView from './views/IngredientView.vue'
import TwentyOneDayPlan from './views/TwentyOneDayPlan.vue'
import SkincareSquare from './views/SkincareSquare.vue'

// Create router with hash mode
const routes = [
  { 
    path: '/', 
    component: HomeView,
    meta: { requiresAuth: true }
  },
  { 
    path: '/product', 
    component: ProductView,
    meta: { requiresAuth: true }
  },
  { 
    path: '/conflict', 
    component: ConflictView,
    meta: { requiresAuth: true }
  },
  { 
    path: '/skinstatus', 
    component: SkinStatusView,
    meta: { requiresAuth: true }
  },
  { 
    path: '/profile', 
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    component: LoginView
  },
  {
    path: '/register',
    component: RegisterView
  },
  { 
    path: '/ingredient', 
    component: IngredientView,
    meta: { requiresAuth: true }
  },
  { 
    path: '/twenty-one-day-plan', 
    component: TwentyOneDayPlan,
    meta: { requiresAuth: true }
  },
  { 
    path: '/skincare-square', 
    component: SkincareSquare,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(), // 使用hash模式避免刷新404
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = authService.isAuthenticated()

  if (requiresAuth && !isAuthenticated) {
    next(`/login?redirect=${to.fullPath}`)
  } else {
    next()
  }
})

// 全局axios配置 - 使用配置文件中的URL
axios.defaults.baseURL = config.API_URL.replace('/api', '')

// Create app
const app = createApp(App)

// Register FontAwesome component
app.component('font-awesome-icon', FontAwesomeIcon)

// Use router
app.use(router)

// Mount app
app.mount('#app')

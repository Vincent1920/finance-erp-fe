import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { useThemeStore } from './stores/theme.store'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(router)
useThemeStore(pinia)
app.mount('#app')

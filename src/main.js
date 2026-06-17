import { createApp } from "vue"
import { createPinia } from "pinia"
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './assets/global.css'  // 引入全局样式，移除边距
import App from "./App.vue"

const app = createApp(App)
app.use(createPinia())
app.mount("#app")

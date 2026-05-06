import { createApp } from "vue"
import 'element-plus/dist/index.css'
import './assets/global.css'  // 引入全局样式，移除边距
import App from "./App.vue"

const app = createApp(App)
app.mount("#app")

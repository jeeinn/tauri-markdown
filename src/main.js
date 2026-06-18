import { createApp } from "vue"
import { createPinia } from "pinia"
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './assets/global.css'
import './assets/element-plus-overrides.css'
import App from "./App.vue"

const app = createApp(App)
app.use(createPinia())
app.mount("#app")

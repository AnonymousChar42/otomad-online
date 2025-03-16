import { createApp } from 'vue'
import App from './App.vue'
import '@/common/index.less'
import 'element-plus/theme-chalk/dark/css-vars.css'

import Particles from "@tsparticles/vue3";
import { loadSlim } from "@tsparticles/slim";


const app = createApp(App)

app
  .use(Particles, { init: engine => loadSlim(engine) })
  .mount('#app')

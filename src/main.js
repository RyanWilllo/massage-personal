import { createApp } from 'vue'
import {
  ActionSheet,
  Button,
  Cell,
  CellGroup,
  Checkbox,
  Dialog,
  Field,
  Icon,
  Loading,
  NavBar,
  Overlay,
  Popup,
  Switch,
  Tabbar,
  TabbarItem,
  Tag,
} from 'vant'
import 'vant/es/action-sheet/style'
import 'vant/es/button/style'
import 'vant/es/cell/style'
import 'vant/es/cell-group/style'
import 'vant/es/checkbox/style'
import 'vant/es/dialog/style'
import 'vant/es/field/style'
import 'vant/es/icon/style'
import 'vant/es/loading/style'
import 'vant/es/nav-bar/style'
import 'vant/es/notify/style'
import 'vant/es/overlay/style'
import 'vant/es/popup/style'
import 'vant/es/switch/style'
import 'vant/es/tabbar/style'
import 'vant/es/tabbar-item/style'
import 'vant/es/tag/style'
import 'vant/es/toast/style'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.use(router)
app.use(ActionSheet)
app.use(Button)
app.use(Cell)
app.use(CellGroup)
app.use(Checkbox)
app.use(Dialog)
app.use(Field)
app.use(Icon)
app.use(Loading)
app.use(NavBar)
app.use(Overlay)
app.use(Popup)
app.use(Switch)
app.use(Tabbar)
app.use(TabbarItem)
app.use(Tag)
app.mount('#app')

import { registerPwa } from './pwa/register.js'
void registerPwa()

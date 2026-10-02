import { createRouter, createWebHashHistory } from 'vue-router'

export default createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('../pages/Dashboard.vue'), meta: { showTabbar: true } },
    { path: '/statistics', component: () => import('../pages/Statistics.vue'), meta: { showTabbar: true } },
    { path: '/records/:id', component: () => import('../pages/RecordDetail.vue') },
    { path: '/more', component: () => import('../pages/More.vue'), meta: { showTabbar: true } },
    { path: '/rules', component: () => import('../pages/Rules.vue') },
    { path: '/projects', component: () => import('../pages/Projects.vue') },
    { path: '/settings', component: () => import('../pages/Settings.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

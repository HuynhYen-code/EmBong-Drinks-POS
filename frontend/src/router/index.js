import { createRouter, createWebHistory } from 'vue-router'
import POS from '../views/POS.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import Materials from '../views/admin/Materials.vue'
import Preps from '../views/admin/Preps.vue'
import MenuItems from '../views/admin/MenuItems.vue'
import Toppings from '../views/admin/Toppings.vue'
import Stocktake from '../views/admin/Stocktake.vue'

import Login from '../views/Login.vue'

const routes = [
  { path: '/', redirect: '/pos' },
  { path: '/pos', component: POS },
  { path: '/login', component: Login },
  { 
    path: '/admin', 
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: Dashboard },
      { path: 'materials', component: Materials },
      { path: 'preps', component: Preps },
      { path: 'menu', component: MenuItems },
      { path: 'toppings', component: Toppings },
      { path: 'stocktake', component: Stocktake },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const isAuthenticated = localStorage.getItem('adminAuth') === 'true'
    if (isAuthenticated) {
      next()
    } else {
      next('/login')
    }
  } else {
    next()
  }
})

export default router

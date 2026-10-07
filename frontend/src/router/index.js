import { createRouter, createWebHistory } from 'vue-router'
import POS from '../views/POS.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import Materials from '../views/admin/Materials.vue'
import Preps from '../views/admin/Preps.vue'
import MenuItems from '../views/admin/MenuItems.vue'
import Toppings from '../views/admin/Toppings.vue'
import Stocktake from '../views/admin/Stocktake.vue'

const routes = [
  { path: '/', redirect: '/pos' },
  { path: '/pos', component: POS },
  { 
    path: '/admin', 
    component: AdminLayout,
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

export default createRouter({
  history: createWebHistory(),
  routes
})

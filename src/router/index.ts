import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { pinia } from '../stores/pinia'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'dashboard' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { publicOnly: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('../views/categories/CategoryListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/categories/create',
      name: 'categories-create',
      component: () => import('../views/categories/CategoryFormView.vue'),
      meta: { requiresAuth: true },
      props: { mode: 'create' },
    },
    {
      path: '/categories/edit/:id',
      name: 'categories-edit',
      component: () => import('../views/categories/CategoryFormView.vue'),
      meta: { requiresAuth: true },
      props: (route) => ({
        id: route.params.id as string,
        mode: 'edit',
      }),
    },
    {
      path: '/priorities',
      name: 'priorities',
      component: () => import('../views/priorities/PriorityListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/priorities/create',
      name: 'priorities-create',
      component: () => import('../views/priorities/PriorityFormView.vue'),
      meta: { requiresAuth: true },
      props: { mode: 'create' },
    },
    {
      path: '/priorities/edit/:id',
      name: 'priorities-edit',
      component: () => import('../views/priorities/PriorityFormView.vue'),
      meta: { requiresAuth: true },
      props: (route) => ({
        id: route.params.id as string,
        mode: 'edit',
      }),
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('../views/tasks/TaskListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tasks/create',
      name: 'tasks-create',
      component: () => import('../views/tasks/TaskFormView.vue'),
      meta: { requiresAuth: true },
      props: { mode: 'create' },
    },
    {
      path: '/tasks/edit/:id',
      name: 'tasks-edit',
      component: () => import('../views/tasks/TaskFormView.vue'),
      meta: { requiresAuth: true },
      props: (route) => ({
        id: route.params.id as string,
        mode: 'edit',
      }),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'dashboard' },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia)

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.publicOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router

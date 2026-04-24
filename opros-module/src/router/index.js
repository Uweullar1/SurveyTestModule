// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from '../supabase'


const routes = [
    {
        path: '/',
        name: 'survey-list',
        component: () => import('../views/SurveyListView.vue')
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('../views/AuthView.vue')
    },
    {
        path: '/create',
        name: 'survey-create',
        component: () => import('../views/SurveyCreateView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/edit/:id',
        name: 'survey-edit',
        component: () => import('../views/SurveyCreateView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/take/:id',
        name: 'survey-take',
        component: () => import('../views/SurveyTakeView.vue')
    },
    {
        path: '/results/:id/admin',
        name: 'SurveyAdmin',
        component: () => import('../views/SurveyResultsView.vue'),
    },
    {
        path: '/my-results/:id',
        name: 'UserResults',
        component: () => import('../views/UserResultsView.vue')
    },
    {
        path: '/my-history',
        name: 'MyHistory',
        component: () => import('../views/MyHistoryView.vue')
    },
    {
        path: '/profile',
        name: 'profile',
        component: () => import('../views/ProfileView.vue')
    },
    {
        path: '/my-surveys',
        name: 'my-surveys',
        component: () => import('../views/MySurveysView.vue'),
    }

]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

// Проверка перед переходом
router.beforeEach(async (to, from, next) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (to.meta.requiresAuth && !session) {
        next('/login')
    } else {
        next()
    }
})

export default router
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
	{
		path: '/',
		name: 'survey-list',
		component: () => import('../views/SurveyListView.vue')
	},
	{
		path: '/create',
		name: 'survey-create',
		component: () => import('../views/SurveyCreateView.vue')
	},
	{
		path: '/take/:id',
		name: 'survey-take',
		component: () => import('../views/SurveyTakeView.vue')
	},
	{
		path: '/results/:id',
		name: 'survey-results',
		component: () => import('../views/SurveyResultsView.vue')
	}
]

const router = createRouter({
	history: createWebHistory(),
	routes
})

export default router
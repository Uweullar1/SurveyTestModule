<template>
    <div class="admin-page">
        <div class="container py-5">
            <h1 class="admin-title">Панель администратора</h1>

            <!-- Вкладки -->
            <div class="tabs">
                <button @click="activeTab = 'users'"
                        :class="['tab', { active: activeTab === 'users' }]">
                    👥 Пользователи
                </button>
                <button @click="activeTab = 'surveys'"
                        :class="['tab', { active: activeTab === 'surveys' }]">
                    📋 Все опросы
                </button>
            </div>

            <!-- Вкладка: Пользователи -->
            <div v-if="activeTab === 'users'" class="tab-content">
                <div class="search-box">
                    <input v-model="userSearch" type="text" placeholder="Поиск по имени или email..." class="admin-input" />
                </div>

                <div v-if="loadingUsers" class="text-center py-4">Загрузка...</div>

                <div v-else class="users-list">
                    <div v-for="profile in filteredUsers" :key="profile.id" class="user-card">
                        <div class="user-info">
                            <img :src="profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`"
                                 class="user-avatar" />
                            <div>
                                <div class="user-name">{{ profile.first_name }} {{ profile.last_name }}</div>
                                <div class="user-email">{{ profile.email || profile.id }}</div>
                            </div>
                        </div>

                        <div class="user-controls">
                            <!-- Департамент -->
                            <div class="dept-mini">
                                <select v-model="profile.department_id" @change="updateDepartment(profile)" class="mini-select">
                                    <option value="">Без департамента</option>
                                    <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                                        {{ dept.name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Права создателя -->
                            <label class="toggle-label">
                                <input type="checkbox" :checked="profile.can_create" @change="toggleCreate(profile)" />
                                <span class="toggle-text">Создатель</span>
                            </label>

                            <!-- Админ -->
                            <label class="toggle-label">
                                <input type="checkbox" :checked="adminIds.includes(profile.id)" @change="toggleAdmin(profile)" />
                                <span class="toggle-text">Админ</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Вкладка: Все опросы -->
            <div v-if="activeTab === 'surveys'" class="tab-content">
                <div v-if="loadingSurveys" class="text-center py-4">Загрузка...</div>

                <div v-else class="surveys-admin-list">
                    <div v-for="survey in allSurveys" :key="survey.id" class="survey-admin-card">
                        <div class="survey-admin-info">
                            <div class="survey-admin-title">{{ survey.title }}</div>
                            <div class="survey-admin-meta">
                                {{ survey.departments?.name || 'Без департамента' }} ·
                                {{ survey.profiles?.first_name }} {{ survey.profiles?.last_name }}
                            </div>
                        </div>
                        <div class="survey-admin-actions">
                            <button @click="editSurvey(survey.id)" class="btn-sm btn-edit">✏️</button>
                            <button @click="deleteSurvey(survey.id)" class="btn-sm btn-delete">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()

const activeTab = ref('users')
const loadingUsers = ref(true)
const loadingSurveys = ref(true)

const users = ref([])
const allSurveys = ref([])
const departments = ref([])
const adminIds = ref([])
const userSearch = ref('')

// Фильтрация пользователей
const filteredUsers = computed(() => {
    if (!userSearch.value.trim()) return users.value
    const q = userSearch.value.toLowerCase()
    return users.value.filter(u =>
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    )
})

onMounted(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        // Загружаем всех админов и проверяем локально
        const { data: allAdmins } = await supabase
            .from('admins')
            .select('user_id')

        if (!allAdmins?.some(a => a.user_id === user.id)) {
            alert('Доступ запрещён')
            router.push('/')
            return
        }

        await loadData()
})

    // Убери отдельный запрос к admins
    // Вместо этого загрузи список админов один раз

const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                isLoggedIn.value = true

                // Загружаем профиль
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url, can_create')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    canCreate.value = profile.can_create || false

                    if (profile.avatar_url) {
                        if (profile.avatar_url.startsWith('data:')) {
                            userAvatar.value = profile.avatar_url
                            localStorage.setItem('avatar', profile.avatar_url)
                        } else {
                            const url = profile.avatar_url + '?t=' + Date.now()
                            userAvatar.value = url
                            localStorage.setItem('avatar', url)
                        }
                    }
                }

                // Загружаем ВСЕХ админов и проверяем локально
                const { data: allAdmins } = await supabase
                    .from('admins')
                    .select('user_id')

                isAdmin.value = (allAdmins || []).some(a => a.user_id === user.id)

            } else {
                isLoggedIn.value = false
                userAvatar.value = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                localStorage.removeItem('avatar')
            }
        } catch (err) {
            console.error('Ошибка загрузки пользователя:', err)
        }
}

// Обновить департамент
const updateDepartment = async (profile) => {
        const { error } = await supabase
            .from('profiles')
            .update({ department_id: profile.department_id })
            .eq('id', profile.id)

        if (error) {
            console.error('Ошибка обновления департамента:', error)
        }
}

// Переключить права создателя
const toggleCreate = async (profile) => {
        const newVal = !profile.can_create
        const { error } = await supabase
            .from('profiles')
            .update({ can_create: newVal })
            .eq('id', profile.id)

        if (!error) {
            profile.can_create = newVal
        }
}

    // Переключить админа
const toggleAdmin = async (profile) => {
        const isAdmin = adminIds.value.includes(profile.id)

        if (isAdmin) {
            const { error } = await supabase
                .from('admins')
                .delete()
                .eq('user_id', profile.id)

            if (!error) {
                adminIds.value = adminIds.value.filter(id => id !== profile.id)
            }
        } else {
            const { error } = await supabase
                .from('admins')
                .insert({ user_id: profile.id })

            if (!error) {
                adminIds.value.push(profile.id)
            }
        }
}

// Редактировать опрос
const editSurvey = (surveyId) => {
    router.push(`/surveys/${surveyId}/edit`)
}

// Удалить опрос
const deleteSurvey = async (surveyId) => {
    if (!confirm('Удалить опрос? Все ответы будут потеряны.')) return
    await supabase.from('responses').delete().eq('survey_id', surveyId)
    await supabase.from('questions').delete().eq('survey_id', surveyId)
    await supabase.from('surveys').delete().eq('id', surveyId)
    allSurveys.value = allSurveys.value.filter(s => s.id !== surveyId)
}
</script>

<style scoped>
    .admin-page {
        background: #FDFDF1;
        min-height: 100vh;
    }

    .admin-title {
        font-size: 2.2rem;
        font-weight: 900;
        color: #212844;
        margin-bottom: 30px;
    }

    /* Вкладки */
    .tabs {
        display: flex;
        gap: 0;
        margin-bottom: 30px;
        border-bottom: 2px solid #212844;
    }

    .tab {
        padding: 12px 24px;
        border: none;
        background: transparent;
        font-weight: 700;
        font-size: 0.95rem;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
    }

        .tab.active {
            color: #212844;
            border-bottom: 3px solid #DF2935;
            margin-bottom: -2px;
        }

        .tab:hover {
            color: #212844;
        }

    /* Поиск */
    .search-box {
        margin-bottom: 20px;
    }

    .admin-input {
        width: 100%;
        max-width: 400px;
        height: 42px;
        padding: 0 16px;
        border: 2px solid #212844;
        border-radius: 12px;
        font-size: 0.9rem;
        background: white;
    }

    /* Карточки пользователей */
    .users-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .user-card {
        background: white;
        border: 2px solid #212844;
        border-radius: 16px;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .user-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #212844;
    }

    .user-name {
        font-weight: 800;
        color: #212844;
    }

    .user-email {
        font-size: 0.8rem;
        color: #888;
    }

    .user-controls {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .dept-mini {
        min-width: 160px;
    }

    .mini-select {
        width: 100%;
        height: 34px;
        padding: 0 8px;
        border: 2px solid #212844;
        border-radius: 8px;
        font-size: 0.8rem;
        background: white;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
    }

    .toggle-text {
        font-size: 0.8rem;
        font-weight: 700;
        color: #212844;
    }

    /* Опросы */
    .surveys-admin-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .survey-admin-card {
        background: white;
        border: 2px solid #212844;
        border-radius: 14px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .survey-admin-title {
        font-weight: 800;
        color: #212844;
    }

    .survey-admin-meta {
        font-size: 0.75rem;
        color: #888;
        margin-top: 4px;
    }

    .survey-admin-actions {
        display: flex;
        gap: 8px;
    }

    .btn-sm {
        width: 34px;
        height: 34px;
        border: 2px solid #212844;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .btn-edit:hover {
        background: #B0D7FF;
    }

    .btn-delete:hover {
        background: #F2C4CE;
    }
</style>
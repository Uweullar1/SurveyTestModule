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

            <!-- ===== ВКЛАДКА: ПОЛЬЗОВАТЕЛИ ===== -->
            <div v-if="activeTab === 'users'" class="tab-content">
                <div class="search-box">
                    <input v-model="userSearch" type="text" placeholder="Поиск по имени..." class="admin-input" />
                </div>

                <div v-if="loadingUsers" class="text-center py-4">Загрузка...</div>

                <div v-else class="users-list">
                    <div v-for="profile in filteredUsers" :key="profile.id" class="user-card">
                        <div class="user-info">
                            <img :src="profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`"
                                 class="user-avatar" />
                            <div>
                                <div class="user-name">{{ profile.first_name }} {{ profile.last_name }}</div>
                                <div class="user-email">{{ profile.username || '—' }}</div>
                            </div>
                        </div>

                        <div class="user-controls">
                            <div class="dept-mini">
                                <div class="dept-select-wrap">
                                    <select v-model="profile.department_id" @change="updateDepartment(profile)" class="mini-select">
                                        <option value="">Без департамента</option>
                                        <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                                            {{ dept.name }}
                                        </option>
                                    </select>
                                    <span class="dept-arrow">▾</span>
                                </div>
                            </div>

                            <div class="switches">
                                <button @click="toggleCreate(profile)"
                                        :class="['switch-btn', { active: profile.can_create }]">
                                    ✏️ Создатель
                                </button>
                                <button @click="toggleAdmin(profile)"
                                        :class="['switch-btn', { active: adminIds.includes(profile.id) }]">
                                    👑 Админ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ===== ВКЛАДКА: ВСЕ ОПРОСЫ ===== -->
            <div v-if="activeTab === 'surveys'" class="tab-content">
                <div v-if="loadingSurveys" class="text-center py-4">Загрузка...</div>

                <div v-else class="surveys-admin-grid">
                    <div v-for="survey in allSurveys" :key="survey.id" class="survey-admin-card">
                        <div class="card-deco"></div>
                        <div class="card-content">
                            <div class="title-row">
                                <span class="survey-label">ОПРОС</span>
                                <span v-if="survey.departments?.name" class="department-badge">
                                    {{ survey.departments.name }}
                                </span>
                            </div>
                            <h3 class="survey-title">{{ survey.title }}</h3>
                            <p class="survey-desc">{{ survey.description || 'Нет описания' }}</p>
                            <div class="card-footer">
                                <span class="owner-name">{{ survey.owner_name || '—' }}</span>
                                <div class="survey-admin-actions">
                                    <button @click="editSurvey(survey.id)" class="btn-sm btn-edit">✏️</button>
                                    <button @click="deleteSurvey(survey.id)" class="btn-sm btn-delete">🗑️</button>
                                </div>
                            </div>
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

    const filteredUsers = computed(() => {
        if (!userSearch.value.trim()) return users.value
        const q = userSearch.value.toLowerCase()
        return users.value.filter(u =>
            u.first_name?.toLowerCase().includes(q) ||
            u.last_name?.toLowerCase().includes(q) ||
            u.username?.toLowerCase().includes(q)
        )
    })

    onMounted(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        const { data: allAdmins } = await supabase.from('admins').select('user_id')
        if (!allAdmins?.some(a => a.user_id === user.id)) {
            alert('Доступ запрещён')
            router.push('/')
            return
        }

        await loadData()
    })

    const loadData = async () => {
        const { data: depts } = await supabase.from('departments').select('*').order('name')
        departments.value = depts || []

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url, department_id, can_create')
            .order('last_name')
        users.value = profiles || []
        loadingUsers.value = false

        const { data: admins } = await supabase.from('admins').select('user_id')
        adminIds.value = (admins || []).map(a => a.user_id)

        const { data: surveys } = await supabase
            .from('surveys')
            .select(`*, departments(name)`)
            .order('created_at', { ascending: false })

        if (surveys) {
            for (let s of surveys) {
                const owner = users.value.find(u => u.id === s.user_id)
                s.owner_name = owner ? `${owner.first_name} ${owner.last_name}` : '—'
            }
        }
        allSurveys.value = surveys || []
        loadingSurveys.value = false
    }

    const updateDepartment = async (profile) => {
        await supabase.from('profiles').update({ department_id: profile.department_id }).eq('id', profile.id)
    }

    const toggleCreate = async (profile) => {
        const newVal = !profile.can_create
        const { error } = await supabase.from('profiles').update({ can_create: newVal }).eq('id', profile.id)
        if (!error) profile.can_create = newVal
    }

    const toggleAdmin = async (profile) => {
        const isAdmin = adminIds.value.includes(profile.id)
        if (isAdmin) {
            const { error } = await supabase.from('admins').delete().eq('user_id', profile.id)
            if (!error) adminIds.value = adminIds.value.filter(id => id !== profile.id)
        } else {
            const { error } = await supabase.from('admins').insert({ user_id: profile.id })
            if (!error) adminIds.value.push(profile.id)
        }
    }

    const editSurvey = (surveyId) => {
        router.push(`/edit/${surveyId}`)
    }

    const deleteSurvey = async (surveyId) => {
        if (!confirm('Удалить опрос?')) return
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
        min-width: 200px;
    }

    .user-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #212844;
        flex-shrink: 0;
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

    .dept-select-wrap {
        position: relative;
    }

    .mini-select {
        width: 100%;
        height: 38px;
        padding: 0 32px 0 12px;
        border: 2px solid #212844;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 600;
        background: #FDFDF1;
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
        color: #212844;
    }

    .dept-arrow {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 0.7rem;
        color: #212844;
        font-weight: 900;
    }

    .switches {
        display: flex;
        gap: 8px;
    }

    .switch-btn {
        padding: 6px 14px;
        border: 2px solid #212844;
        border-radius: 10px;
        background: white;
        font-size: 0.8rem;
        font-weight: 700;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }

        .switch-btn.active {
            background: #212844;
            color: #F2C4CE;
        }

        .switch-btn:hover {
            transform: scale(1.03);
        }

    /* ===== КАРТОЧКИ ОПРОСОВ ===== */
    .surveys-admin-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
    }

    @media (max-width: 900px) {
        .surveys-admin-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 600px) {
        .surveys-admin-grid {
            grid-template-columns: 1fr;
        }
    }

    .survey-admin-card {
        position: relative;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        cursor: pointer;
    }

        .survey-admin-card:hover {
            transform: translate(-4px, -4px);
        }

            .survey-admin-card:hover .card-deco {
                transform: translate(4px, 4px);
                background: #F2C4CE;
            }

    .card-deco {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 100%;
        height: 100%;
        background: #B0D7FF;
        border: 2px solid #212844;
        border-radius: 20px;
        z-index: 1;
        transition: all 0.3s ease;
    }

    .card-content {
        position: relative;
        background: white;
        border: 2px solid #212844;
        border-radius: 20px;
        padding: 22px;
        z-index: 2;
        min-height: 180px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        flex-wrap: wrap;
    }

    .survey-label {
        font-size: 0.65rem;
        font-weight: 900;
        letter-spacing: 1px;
        color: #212844;
        opacity: 0.5;
    }

    .department-badge {
        background: #B0D7FF;
        color: #212844;
        border: 1.5px solid #212844;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.6rem;
        font-weight: 800;
        text-transform: uppercase;
    }

    .survey-title {
        font-size: 1.1rem;
        font-weight: 800;
        margin-bottom: 6px;
        color: #212844;
    }

    .survey-desc {
        opacity: 0.5;
        font-size: 0.8rem;
        margin-bottom: 12px;
        flex-grow: 1;
    }

    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(33,40,68,0.08);
        padding-top: 10px;
    }

    .owner-name {
        font-size: 0.75rem;
        color: #888;
        font-weight: 600;
    }

    .survey-admin-actions {
        display: flex;
        gap: 6px;
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
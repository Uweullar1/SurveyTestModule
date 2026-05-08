<template>
    <div class="admin-page">
        <div class="container py-5">
            <h1 class="admin-title">Панель администратора</h1>

            <div class="tabs">
                <button @click="activeTab = 'users'" :class="['tab', { active: activeTab === 'users' }]">👥 Пользователи</button>
                <button @click="activeTab = 'surveys'" :class="['tab', { active: activeTab === 'surveys' }]">📋 Все опросы</button>
                <button @click="activeTab = 'results'" :class="['tab', { active: activeTab === 'results' }]">📊 Результаты</button>
            </div>

            <!-- ПОЛЬЗОВАТЕЛИ -->
            <div v-if="activeTab === 'users'" class="tab-content">
                <div class="search-box"><input v-model="userSearch" type="text" placeholder="Поиск по имени..." class="admin-input" /></div>
                <div v-if="loadingUsers" class="text-center py-4">Загрузка...</div>
                <div v-else class="users-list">
                    <div v-for="profile in filteredUsers" :key="profile.id" class="user-card">
                        <div class="user-info">
                            <img :src="profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`" class="user-avatar" />
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
                                        <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                                    </select>
                                    <span class="dept-arrow">▾</span>
                                </div>
                            </div>
                            <div class="switches">
                                <button @click="toggleCreate(profile)" :class="['switch-btn', { active: profile.can_create }]">✏️ Создатель</button>
                                <button @click="toggleAdmin(profile)" :class="['switch-btn', { active: adminIds.includes(profile.id) }]">👑 Админ</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ВСЕ ОПРОСЫ -->
            <div v-if="activeTab === 'surveys'" class="tab-content">
                <div v-if="loadingSurveys" class="loader-wrapper"><div class="custom-spinner"></div><p>Загружаем опросы...</p></div>
                <div v-else-if="allSurveys.length === 0" class="empty-state"><div class="empty-icon">📋</div><h2>Нет опросов</h2><p>В системе пока нет созданных опросов.</p></div>
                <div v-else class="surveys-admin-grid">
                    <div v-for="survey in allSurveys" :key="survey.id" class="survey-card">
                        <div class="card-status" :class="{ 'closed': survey.is_closed }">{{ survey.is_closed ? 'Закрыт' : 'Активен' }}</div>
                        <div class="card-main">
                            <h3 class="survey-title">{{ survey.title }}</h3>
                            <p class="survey-desc">{{ survey.description || 'Без описания' }}</p>
                            <div class="survey-meta">
                                <span class="meta-item">📅 {{ new Date(survey.created_at).toLocaleDateString('ru-RU') }}</span>
                                <span v-if="survey.departments?.name" class="meta-dept">🏢 {{ survey.departments.name }}</span>
                                <span class="meta-owner">👤 {{ survey.owner_name || '—' }}</span>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button @click="editSurvey(survey.id)" class="btn-action edit" title="Редактировать">✏️</button>
                            <button @click="toggleSurveyStatus(survey)" class="btn-action toggle" :class="{ 'is-closed': survey.is_closed }">{{ survey.is_closed ? '🔓' : '🔒' }}</button>
                            <button @click="deleteSurvey(survey.id)" class="btn-action delete" title="Удалить">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- РЕЗУЛЬТАТЫ -->
            <div v-if="activeTab === 'results'" class="tab-content">
                <div class="results-filters">
                    <div class="filter-row">
                        <input v-model="resultSearch" type="text" placeholder="Поиск по имени или опросу..." class="admin-input" />
                        <select v-model="resultSurveyFilter" class="filter-select-sm">
                            <option value="">Все опросы</option>
                            <option v-for="s in allSurveys" :key="s.id" :value="s.id">{{ s.title }}</option>
                        </select>
                        <select v-model="resultDeptFilter" class="filter-select-sm">
                            <option value="">Все департаменты</option>
                            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                        </select>
                        <button @click="resetResultFilters" class="filter-clear">Сбросить</button>
                    </div>
                </div>
                <div v-if="loadingResults" class="loader-wrapper"><div class="custom-spinner"></div><p>Загружаем результаты...</p></div>
                <div v-else class="results-table-wrapper">
                    <div class="results-count">{{ filteredResults.length }} прохождений</div>
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Участник</th>
                                <th>Опрос</th>
                                <th>Департамент</th>
                                <th>Баллы</th>
                                <th>Статус</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, idx) in filteredResults" :key="item.responseId" @click="openResult(item)" class="clickable-row">
                                <td>{{ idx + 1 }}</td>
                                <td><div class="fw-bold">{{ item.userName }}</div></td>
                                <td>{{ item.surveyTitle }}</td>
                                <td><span v-if="item.departmentName" class="dept-tag">{{ item.departmentName }}</span><span v-else>—</span></td>
                                <td><span class="score-badge">{{ item.totalScore }} / {{ item.maxScore }}</span></td>
                                <td><span :class="item.passed ? 'status-passed' : 'status-failed'">{{ item.passed ? 'Сдал' : 'Не сдал' }}</span></td>
                                <td class="small">{{ formatDate(item.submittedAt) }}</td>
                            </tr>
                        </tbody>
                    </table>
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
    const loadingResults = ref(false)

    const users = ref([])
    const allSurveys = ref([])
    const departments = ref([])
    const adminIds = ref([])
    const userSearch = ref('')
    const allResults = ref([])
    const resultSearch = ref('')
    const resultSurveyFilter = ref('')
    const resultDeptFilter = ref('')

    const filteredUsers = computed(() => {
        if (!userSearch.value.trim()) return users.value
        const q = userSearch.value.toLowerCase()
        return users.value.filter(u => u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q))
    })

    const filteredResults = computed(() => {
        let res = [...allResults.value]
        if (resultSearch.value.trim()) {
            const q = resultSearch.value.toLowerCase()
            res = res.filter(r => r.userName.toLowerCase().includes(q) || r.surveyTitle.toLowerCase().includes(q))
        }
        if (resultSurveyFilter.value) res = res.filter(r => r.surveyId === resultSurveyFilter.value)
        if (resultDeptFilter.value) res = res.filter(r => r.departmentId === resultDeptFilter.value)
        return res
    })

    onMounted(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')
        const { data: allAdmins } = await supabase.from('admins').select('user_id')
        if (!allAdmins?.some(a => a.user_id === user.id)) { alert('Доступ запрещён'); router.push('/'); return }
        await loadData()
    })

    const loadData = async () => {
        const { data: depts } = await supabase.from('departments').select('*').order('name')
        departments.value = depts || []
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, username, avatar_url, department_id, can_create').order('last_name')
        users.value = profiles || []
        loadingUsers.value = false
        const { data: admins } = await supabase.from('admins').select('user_id')
        adminIds.value = (admins || []).map(a => a.user_id)
        const { data: surveys } = await supabase.from('surveys').select(`*, departments(name)`).order('created_at', { ascending: false })
        if (surveys) { for (let s of surveys) { const owner = users.value.find(u => u.id === s.user_id); s.owner_name = owner ? `${owner.first_name} ${owner.last_name}` : '—' } }
        allSurveys.value = surveys || []
        loadingSurveys.value = false
        await loadResults()
    }

    const loadResults = async () => {
        loadingResults.value = true
        const { data: responses } = await supabase.from('responses').select(`id, submitted_at, survey_id, user_id, surveys!inner(title, department_id, departments(name))`).order('submitted_at', { ascending: false })
        if (!responses) { loadingResults.value = false; return }
        const userIds = [...new Set(responses.map(r => r.user_id).filter(Boolean))]
        const { data: profilesData } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
        const profileMap = {}
        if (profilesData) profilesData.forEach(p => { profileMap[p.id] = p })
        const results = responses.map(resp => {
            const profile = profileMap[resp.user_id]
            return {
                responseId: resp.id,
                userName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Неизвестный' : 'Неизвестный',
                surveyTitle: resp.surveys?.title || 'Без названия',
                surveyId: resp.survey_id,
                departmentName: resp.surveys?.departments?.name || null,
                departmentId: resp.surveys?.department_id || null,
                submittedAt: resp.submitted_at,
                totalScore: 0,
                maxScore: 0,
                passed: false
            }
        })
        allResults.value = results
        loadingResults.value = false
    }

    const openResult = (item) => router.push(`/results/${item.surveyId}/admin`)
    const resetResultFilters = () => { resultSearch.value = ''; resultSurveyFilter.value = ''; resultDeptFilter.value = '' }
    const updateDepartment = async (p) => { await supabase.from('profiles').update({ department_id: p.department_id }).eq('id', p.id) }
    const toggleCreate = async (p) => { const n = !p.can_create; const { error } = await supabase.from('profiles').update({ can_create: n }).eq('id', p.id); if (!error) p.can_create = n }
    const toggleAdmin = async (p) => {
        if (adminIds.value.includes(p.id)) { await supabase.from('admins').delete().eq('user_id', p.id); adminIds.value = adminIds.value.filter(id => id !== p.id) }
        else { await supabase.from('admins').insert({ user_id: p.id }); adminIds.value.push(p.id) }
    }
    const editSurvey = (id) => router.push(`/edit/${id}`)
    const deleteSurvey = async (id) => { if (!confirm('Удалить опрос?')) return; await supabase.from('responses').delete().eq('survey_id', id); await supabase.from('questions').delete().eq('survey_id', id); await supabase.from('surveys').delete().eq('id', id); allSurveys.value = allSurveys.value.filter(s => s.id !== id) }
    const toggleSurveyStatus = async (s) => { const { error } = await supabase.from('surveys').update({ is_closed: !s.is_closed, is_active: s.is_closed }).eq('id', s.id); if (!error) s.is_closed = !s.is_closed }
    const formatDate = (d) => new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

    .tabs {
        display: flex;
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

    .surveys-admin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 25px;
    }

    .survey-card {
        background: white;
        border: 3px solid #212844;
        border-radius: 24px;
        padding: 25px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: all 0.3s ease;
        box-shadow: 6px 6px 0px rgba(33,40,68,0.05);
    }

        .survey-card:hover {
            box-shadow: 10px 10px 0px #212844;
            transform: translate(-4px, -4px);
        }

    .card-status {
        position: absolute;
        top: -12px;
        right: 20px;
        background: #212844;
        color: #FDFDF1;
        padding: 4px 12px;
        border-radius: 10px;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
    }

        .card-status.closed {
            background: #DF2935;
        }

    .survey-title {
        font-size: 1.3rem;
        font-weight: 800;
        color: #212844;
        margin-bottom: 10px;
    }

    .survey-desc {
        color: rgba(33,40,68,0.7);
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 20px;
    }

    .survey-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.8rem;
        font-weight: 700;
        color: #212844;
        opacity: 0.6;
        margin-bottom: 15px;
    }

    .card-actions {
        display: flex;
        gap: 10px;
        margin-top: 5px;
    }

    .btn-action {
        flex: 1;
        height: 42px;
        border: 2px solid #212844;
        border-radius: 12px;
        cursor: pointer;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        transition: all 0.2s;
    }

        .btn-action.edit:hover {
            background: #FDFDF1;
        }

        .btn-action.toggle:hover {
            background: #fdf6e3;
        }

        .btn-action.delete:hover {
            background: #DF2935;
            color: white;
        }

        .btn-action.toggle.is-closed {
            background: #212844;
            color: white;
        }

    .loader-wrapper, .empty-state {
        text-align: center;
        padding: 60px 0;
    }

    .custom-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #FDFDF1;
        border-top: 4px solid #212844;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    .empty-icon {
        font-size: 3rem;
        margin-bottom: 15px;
    }

    .empty-state h2 {
        font-weight: 900;
        color: #212844;
        font-size: 1.3rem;
    }

    .results-filters {
        margin-bottom: 20px;
    }

    .filter-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
    }

    .filter-select-sm {
        height: 42px;
        padding: 0 12px;
        border: 2px solid #212844;
        border-radius: 12px;
        font-size: 0.85rem;
        background: white;
        cursor: pointer;
    }

    .filter-clear {
        height: 42px;
        padding: 0 16px;
        border: none;
        background: transparent;
        color: #888;
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
        font-size: 0.85rem;
    }

    .results-table-wrapper {
        background: white;
        border: 2px solid #212844;
        border-radius: 20px;
        overflow: hidden;
    }

    .results-count {
        padding: 14px 20px;
        font-weight: 700;
        color: #888;
        font-size: 0.85rem;
        border-bottom: 1px solid #eee;
    }

    .results-table {
        width: 100%;
        border-collapse: collapse;
    }

        .results-table th {
            text-align: left;
            padding: 12px 16px;
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            color: #888;
            background: #FDFDF1;
            border-bottom: 2px solid #212844;
        }

        .results-table td {
            padding: 10px 16px;
            border-bottom: 1px solid #eee;
            font-size: 0.9rem;
        }

    .clickable-row {
        cursor: pointer;
        transition: background 0.15s;
    }

        .clickable-row:hover {
            background: #FDFDF1;
        }

    .dept-tag {
        background: #B0D7FF;
        color: #212844;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .status-passed {
        background: #d1e7dd;
        color: #0f5132;
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.8rem;
    }

    .status-failed {
        background: #F2C4CE;
        color: #212844;
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.8rem;
    }

    .score-badge {
        font-weight: 800;
        color: #212844;
        font-size: 1rem;
    }
</style>
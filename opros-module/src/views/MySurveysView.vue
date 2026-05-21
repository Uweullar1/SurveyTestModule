<template>
    <div class="my-surveys-container">
        <div class="content-header">
            <h1 class="page-title">Мои опросы</h1>
            <div class="header-buttons">
                <router-link to="/create" class="btn-create-new">+ Создать опрос</router-link>
                <router-link to="/create-template" class="btn-create-template">+ Создать шаблон</router-link>
            </div>
        </div>

        <!-- ФИЛЬТРЫ -->
        <div class="filters-bar">
            <div class="search-wrapper">
                <input v-model="searchQuery" type="text" placeholder="Поиск по названию..." class="search-input" @input="applyFilters" />
                <span class="search-icon">🔍</span>
            </div>
            <select v-model="filterDepartment" class="filter-select" @change="applyFilters">
                <option value="">Все департаменты</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
            <select v-model="filterStatus" class="filter-select" @change="applyFilters">
                <option value="">Все статусы</option>
                <option value="active">Активные</option>
                <option value="closed">Закрытые</option>
            </select>
            <select v-model="filterType" class="filter-select" @change="applyFilters">
                <option value="">Все типы</option>
                <option value="intern">Стажировочные</option>
                <option value="anketa">Анкета</option>
                <option value="own">Мои</option>
            </select>
            <button v-if="hasFilters" @click="resetFilters" class="filter-reset">Сбросить</button>
        </div>

        <div v-if="loading" class="loader-wrapper">
            <div class="custom-spinner"></div>
            <p>Загружаем ваши данные...</p>
        </div>

        <div v-else-if="filteredSurveys.length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <h2>{{ mySurveys.length === 0 ? 'У вас пока нет опросов' : 'Ничего не найдено' }}</h2>
            <p>{{ mySurveys.length === 0 ? 'Создайте свой первый опрос, чтобы начать собирать ответы.' : 'Попробуйте изменить фильтры.' }}</p>
        </div>

        <div v-else class="surveys-grid">
            <div v-for="survey in filteredSurveys" :key="survey.id" class="survey-card">
                <div class="card-status" :class="{ 'closed': survey.is_closed }">
                    {{ survey.is_closed ? 'Закрыт' : 'Активен' }}
                </div>

                <div v-if="survey.needsCheck" class="card-check-badge">
                    🔍 {{ survey.uncheckedCount }} на проверку
                </div>

                <div class="card-main">
                    <h3 class="survey-title">{{ survey.title }}</h3>
                    <p class="survey-desc">{{ survey.description || 'Без описания' }}</p>

                    <div class="survey-meta">
                        <span class="meta-item">📅 {{ new Date(survey.created_at).toLocaleDateString('ru-RU') }}</span>
                        <span v-if="survey.departments?.name" class="meta-dept">🏢 {{ survey.departments.name }}</span>
                        <span v-if="survey.is_for_interns" class="meta-tag">🎓 Стажировка</span>
                    </div>
                </div>

                <div class="card-actions">
                    <button @click="editSurvey(survey.id)" class="btn-action edit" title="Редактировать">✏️</button>
                    <button @click="viewResults(survey.id)" class="btn-action results" title="Результаты">
                        📊
                        <span v-if="survey.needsCheck" class="btn-badge">{{ survey.uncheckedCount }}</span>
                    </button>
                    <button @click="toggleVisibility(survey)" class="btn-action toggle" :class="{ 'is-closed': survey.is_closed }" :title="survey.is_closed ? 'Открыть' : 'Закрыть'">
                        {{ survey.is_closed ? '🔓' : '🔒' }}
                    </button>
                    <button @click="deleteSurvey(survey.id)" class="btn-action delete" title="Удалить">🗑️</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { supabase } from '../supabase'
    import { useRouter } from 'vue-router'

    const router = useRouter()
    const mySurveys = ref([])
    const loading = ref(true)

    // Фильтры
    const searchQuery = ref('')
    const filterDepartment = ref('')
    const filterStatus = ref('')
    const filterType = ref('')
    const departments = ref([])

    const hasFilters = computed(() => {
        return searchQuery.value || filterDepartment.value || filterStatus.value || filterType.value
    })

    const filteredSurveys = computed(() => {
        let result = [...mySurveys.value]

        // Поиск по названию
        if (searchQuery.value.trim()) {
            const q = searchQuery.value.toLowerCase()
            result = result.filter(s => s.title?.toLowerCase().includes(q))
        }

        // Фильтр по департаменту
        if (filterDepartment.value) {
            result = result.filter(s => s.department_id === filterDepartment.value)
        }

        // Фильтр по статусу
        if (filterStatus.value === 'active') {
            result = result.filter(s => !s.is_closed)
        } else if (filterStatus.value === 'closed') {
            result = result.filter(s => s.is_closed)
        }

        // Фильтр по типу
        if (filterType.value === 'intern') {
            result = result.filter(s => s.is_for_interns)
        } else if (filterType.value === 'anketa') {
            const ANKETA_ID = 'f4bb9a82-31d2-4b53-bf7c-48d814bca84c'
            result = result.filter(s => s.id === ANKETA_ID)
        } else if (filterType.value === 'own') {
            result = result.filter(s => !s.is_for_interns && s.id !== 'f4bb9a82-31d2-4b53-bf7c-48d814bca84c')
        }

        return result
    })

    const applyFilters = () => {
        // computed сам обновится
    }

    const resetFilters = () => {
        searchQuery.value = ''
        filterDepartment.value = ''
        filterStatus.value = ''
        filterType.value = ''
    }

    const loadMySurveys = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        // Загружаем департаменты
        const { data: depts } = await supabase.from('departments').select('*').order('name')
        departments.value = depts || []

        // Свои опросы
        const { data: ownSurveys } = await supabase
            .from('surveys')
            .select('*, departments(name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        // Проверяем, создатель ли пользователь
        const { data: profile } = await supabase
            .from('profiles')
            .select('can_create, department_id')
            .eq('id', user.id)
            .single()

        let specialSurveys = []
        if (profile?.can_create) {
            const creatorDeptId = profile?.department_id

            if (creatorDeptId) {
                const { data: special } = await supabase
                    .from('surveys')
                    .select('*, departments(name)')
                    .eq('is_for_interns', true)
                    .eq('department_id', creatorDeptId)
                    .order('created_at', { ascending: false })

                specialSurveys = special || []
            }

            const { data: anketa } = await supabase
                .from('surveys')
                .select('*, departments(name)')
                .eq('is_visible_to_creators', true)
                .order('created_at', { ascending: false })

            specialSurveys = [...specialSurveys, ...(anketa || [])]
        }

        const allSurveys = [...(ownSurveys || []), ...specialSurveys]
        const unique = allSurveys.filter((s, i, arr) => arr.findIndex(t => t.id === s.id) === i)

        const enriched = await Promise.all(unique.map(async (survey) => {
            const { data: textQuestions } = await supabase
                .from('questions')
                .select('id')
                .eq('survey_id', survey.id)
                .eq('question_type', 'text')

            if (!textQuestions || textQuestions.length === 0) {
                return { ...survey, needsCheck: false, uncheckedCount: 0 }
            }

            const questionIds = textQuestions.map(q => q.id)
            const { data: uncheckedAnswers } = await supabase
                .from('answers')
                .select('response_id')
                .in('question_id', questionIds)
                .is('score', null)

            const uniqueResponses = new Set((uncheckedAnswers || []).map(a => a.response_id))
            return { ...survey, needsCheck: uniqueResponses.size > 0, uncheckedCount: uniqueResponses.size }
        }))

        mySurveys.value = enriched
        loading.value = false
    }

    const viewResults = (id) => router.push(`/results/${id}/admin`)
    const editSurvey = (id) => router.push(`/edit/${id}`)

    const toggleVisibility = async (survey) => {
        const { error } = await supabase
            .from('surveys')
            .update({ is_closed: !survey.is_closed, is_active: survey.is_closed })
            .eq('id', survey.id)

        if (!error) survey.is_closed = !survey.is_closed
        else alert('Ошибка при изменении видимости')
    }

    const deleteSurvey = async (id) => {
        if (!confirm('Удалить опрос? Все результаты будут удалены.')) return
        const { error } = await supabase.from('surveys').delete().eq('id', id)
        if (!error) mySurveys.value = mySurveys.value.filter(s => s.id !== id)
        else alert('Не удалось удалить опрос')
    }

    onMounted(loadMySurveys)
</script>

<style scoped>
    .my-surveys-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 40px 20px;
        background-color: #FDFDF1;
        min-height: 90vh;
    }

    .content-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 16px;
    }

    .page-title {
        font-size: 2.8rem;
        font-weight: 900;
        color: #212844;
    }

    .header-buttons {
        display: flex;
        gap: 10px;
    }

    .btn-create-template {
        background: white;
        color: #212844;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 16px;
        font-weight: 800;
        border: 3px solid #212844;
        transition: transform 0.2s ease;
    }

        .btn-create-template:hover {
            transform: translate(-4px, -4px);
            box-shadow: 4px 4px 0px #B0D7FF;
        }

    .btn-create-new {
        background: #212844;
        color: #F2C4CE;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 16px;
        font-weight: 800;
        border: 3px solid #212844;
        transition: transform 0.2s ease;
    }

        .btn-create-new:hover {
            transform: translate(-4px, -4px);
            box-shadow: 4px 4px 0px #DF2935;
        }

    /* Фильтры */
    .filters-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 24px;
        flex-wrap: wrap;
        align-items: center;
    }

    .search-wrapper {
        position: relative;
        flex: 1;
        min-width: 200px;
    }

    .search-input {
        width: 100%;
        height: 42px;
        padding: 0 40px 0 16px;
        border: 2px solid #212844;
        border-radius: 14px;
        font-size: 0.9rem;
        font-weight: 500;
        background: white;
        box-sizing: border-box;
    }

        .search-input:focus {
            outline: none;
            border-color: #DF2935;
        }

    .search-icon {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0.3;
        pointer-events: none;
    }

    .filter-select {
        height: 42px;
        padding: 0 14px;
        border: 2px solid #212844;
        border-radius: 14px;
        font-size: 0.85rem;
        font-weight: 600;
        background: white;
        cursor: pointer;
    }

    .filter-reset {
        height: 42px;
        padding: 0 14px;
        border: none;
        background: transparent;
        color: #DF2935;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
    }

    .surveys-grid {
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
        box-shadow: 6px 6px 0px rgba(33, 40, 68, 0.05);
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
        font-size: 1.4rem;
        font-weight: 800;
        color: #212844;
        margin-bottom: 10px;
        padding-right: 70px;
    }

    .survey-desc {
        color: rgba(33, 40, 68, 0.7);
        font-size: 0.95rem;
        line-height: 1.4;
        margin-bottom: 20px;
    }

    .survey-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.85rem;
        font-weight: 700;
        color: #212844;
        opacity: 0.6;
        margin-bottom: 5px;
    }

    .meta-tag {
        background: #B0D7FF;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        opacity: 1;
    }

    .card-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
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
        transition: all 0.2s;
    }

        .btn-action.results {
            position: relative;
        }

            .btn-action.results:hover {
                background: #d1e7dd;
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

    .btn-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: #DF2935;
        color: white;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        font-size: 0.6rem;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .card-check-badge {
        position: absolute;
        top: -12px;
        left: 20px;
        background: #fdf6e3;
        color: #212844;
        padding: 4px 12px;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 800;
        border: 2px solid #212844;
    }

    .loader-wrapper, .empty-state {
        text-align: center;
        padding: 80px 0;
    }

    .custom-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #FDFDF1;
        border-top: 5px solid #212844;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
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
        font-size: 4rem;
        margin-bottom: 20px;
    }

    .empty-state h2 {
        font-weight: 900;
        color: #212844;
    }
</style>
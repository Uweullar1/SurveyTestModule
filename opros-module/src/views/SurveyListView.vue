<template>
    <div class="page-wrapper">
        <section class="container surveys-section">
            <div class="section-header">
                <h2>Доступные опросы</h2>
                <button @click="refreshStatuses" class="btn-refresh" title="Обновить статусы">
                    🔄 Обновить
                </button>
                <div class="line"></div>
            </div>

            <!-- ПОДСКАЗКИ ПО СТАТУСАМ -->
            <div class="status-legend">
                <div class="legend-item">
                    <span class="legend-icon">📝</span>
                    <span class="legend-text">Пройдите опрос, чтобы получить доступ к тестам</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot status-completed"></span>
                    <span class="legend-text">Пройден — ожидает проверки</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot status-pending"></span>
                    <span class="legend-text">На проверке — отправлен руководителю</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot status-reviewed"></span>
                    <span class="legend-text">Проверен — есть фидбек</span>
                </div>
            </div>

            <!-- УМНАЯ ПОДСКАЗКА -->
            <div v-if="bannerInfo.show && !isAdmin" class="info-banner" :class="'banner-' + bannerInfo.type">
                <div class="info-banner-icon">{{ bannerInfo.icon }}</div>
                <div class="info-banner-text">
                    <strong>{{ bannerInfo.title }}</strong>
                    <p>{{ bannerInfo.message }}</p>
                </div>
                <router-link v-if="bannerInfo.link" :to="bannerInfo.link" class="btn-banner">
                    {{ bannerInfo.buttonText }}
                </router-link>
            </div>

            <!-- ПОИСК И ФИЛЬТРЫ -->
            <div class="filters-bar">
                <div class="search-wrapper">
                    <input v-model="searchQuery"
                           type="text"
                           placeholder="Поиск по названию..."
                           class="search-input"
                           @input="filterSurveys" />
                    <span class="search-icon">🔍</span>
                </div>
                <button @click="showFilters = !showFilters" class="filter-toggle">
                    <span>⚙ Фильтры</span>
                    <span v-if="activeFiltersCount > 0" class="filter-count">{{ activeFiltersCount }}</span>
                </button>
            </div>

            <div v-if="showFilters" class="filters-panel">
                <div class="filter-group">
                    <label class="filter-label">Департамент</label>
                    <div class="filter-select-wrapper">
                        <select v-model="filterDepartment" class="filter-select" @change="filterSurveys">
                            <option value="">Все департаменты</option>
                            <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                        </select>
                    </div>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Статус</label>
                    <div class="filter-select-wrapper">
                        <select v-model="filterPassed" class="filter-select" @change="filterSurveys">
                            <option value="">Все</option>
                            <option value="passed">Пройденные</option>
                            <option value="not_passed">Не пройденные</option>
                        </select>
                    </div>
                </div>
                <button @click="resetFilters" class="filter-reset">Сбросить</button>
            </div>

            <div v-if="loading" class="loader">Загрузка...</div>

            <div v-else-if="filteredSurveys.length === 0" class="empty-state">Ничего не найдено</div>

            <div v-else>

                <!-- ОПРОСЫ ДЕПАРТАМЕНТА -->
                <div v-if="deptSurveys.length > 0" class="surveys-section">
                    <h3 class="section-title">📋 Опросы департамента</h3>
                    <div class="surveys-grid">
                        <div v-for="survey in deptSurveys" :key="survey.id" class="survey-card-link">
                            <div class="survey-card" @click="handleCardClick(survey)">
                                <div class="card-deco"></div>
                                <div class="card-content">
                                    <div class="title-row">
                                        <span class="survey-label">ОПРОС</span>
                                        <span v-if="survey.departments?.name" class="department-badge">{{ survey.departments.name }}</span>
                                        <span v-if="surveyStatuses[survey.id]" class="status-indicator">
                                            <span :class="'status-dot-' + surveyStatuses[survey.id]"></span>
                                            <span :class="'status-text-' + surveyStatuses[survey.id]">
                                                {{ statusLabels[surveyStatuses[survey.id]] }}
                                            </span>
                                        </span>
                                    </div>
                                    <h3 class="survey-title">{{ survey.title }}</h3>
                                    <p class="survey-desc">{{ survey.description || 'Нет описания' }}</p>
                                    <div class="card-footer">
                                        <span class="date">{{ new Date(survey.created_at).toLocaleDateString('ru-RU') }}</span>
                                        <span class="open-btn">
                                            {{ passedSurveyIds.includes(survey.id) ? 'Смотреть →' : 'Открыть →' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ОБЩИЕ ОПРОСЫ -->
                <div v-if="generalSurveys.length > 0" class="surveys-section">
                    <h3 class="section-title">🌐 Общие опросы</h3>
                    <div class="surveys-grid">
                        <div v-for="survey in generalSurveys" :key="survey.id" class="survey-card-link">
                            <div class="survey-card" @click="handleCardClick(survey)">
                                <div class="card-deco"></div>
                                <div class="card-content">
                                    <div class="title-row">
                                        <span class="survey-label">ОПРОС</span>
                                        <span v-if="survey.departments?.name" class="department-badge">{{ survey.departments.name }}</span>
                                        <span v-if="surveyStatuses[survey.id]" class="status-indicator">
                                            <span :class="'status-dot-' + surveyStatuses[survey.id]"></span>
                                            <span :class="'status-text-' + surveyStatuses[survey.id]">
                                                {{ statusLabels[surveyStatuses[survey.id]] }}
                                            </span>
                                        </span>
                                    </div>
                                    <h3 class="survey-title">{{ survey.title }}</h3>
                                    <p class="survey-desc">{{ survey.description || 'Нет описания' }}</p>
                                    <div class="card-footer">
                                        <span class="date">{{ new Date(survey.created_at).toLocaleDateString('ru-RU') }}</span>
                                        <span class="open-btn">
                                            {{ passedSurveyIds.includes(survey.id) ? 'Смотреть →' : 'Открыть →' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
    import { ref, onMounted, computed } from 'vue'
    import { useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const router = useRouter()
    const user = ref(null)
    const surveys = ref([])
    const filteredSurveys = ref([])
    const loading = ref(true)
    const userDepartmentId = ref(null)
    const departments = ref([])
    const passedSurveyIds = ref([])

    const canCreate = ref(false)
    const isAdmin = ref(false)

    const surveyStatuses = ref({})

    const showFilters = ref(false)
    const searchQuery = ref('')
    const filterDepartment = ref('')
    const filterPassed = ref('')
    const ANKETA_ID = 'f4bb9a82-31d2-4b53-bf7c-48d814bca84c'
    const educationCompleted = ref(false)
    const isIntern = ref(false)


    // Умный баннер
    const bannerInfo = computed(() => {
        // Админам и создателям не показываем
        if (isAdmin.value || canCreate.value) {
            return { show: false }
        }

        // 1. Анкета не пройдена
        if (!educationCompleted.value) {
            return {
                show: true,
                type: 'welcome',
                icon: '👋',
                title: 'Добро пожаловать!',
                message: 'Заполните анкету соискателя, чтобы открыть доступ к тестам по вакансиям.',
                link: `/take/${ANKETA_ID}`,
                buttonText: 'Заполнить анкету →'
            }
        }

        // 2. Анкета пройдена, но нет департамента (ожидает проверки)
        if (educationCompleted.value && !userDepartmentId.value) {
            return {
                show: true,
                type: 'pending',
                icon: '⏳',
                title: 'Анкета на проверке',
                message: 'Ваша анкета отправлена на рассмотрение. Ожидайте назначения на стажировку. Это может занять до 3 рабочих дней.',
                link: null,
                buttonText: ''
            }
        }

        // 3. Стажёр — показываем непройденные опросы
        if (isIntern.value && userDepartmentId.value) {
            const unpassedSurveys = surveys.value.filter(s =>
                s.is_for_interns &&
                s.department_id === userDepartmentId.value &&
                !passedSurveyIds.value.includes(s.id)
            )

            if (unpassedSurveys.length > 0) {
                const nextSurvey = unpassedSurveys[0] // Берём первый непройденный
                return {
                    show: true,
                    type: 'intern',
                    icon: '📝',
                    title: 'Пройдите тесты стажировки',
                    message: `Осталось пройти ${unpassedSurveys.length} тест(ов): "${nextSurvey.title}"`,
                    link: `/take/${nextSurvey.id}`,
                    buttonText: 'Пройти тест →'
                }
            } else {
                // Все стажировочные пройдены
                return {
                    show: true,
                    type: 'completed',
                    icon: '✅',
                    title: 'Все тесты пройдены!',
                    message: 'Ваши ответы проверят. Ожидайте решения руководителя.',
                    link: null,
                    buttonText: ''
                }
            }
        }

        // 4. Обычный сотрудник (уже не стажёр) — не показываем баннер
        return { show: false }
    })

    const handleCardClick = (survey) => {
        router.push(`/take/${survey.id}`)
    }

    const statusLabels = {
        completed: 'Пройден',
        pending: 'На проверке',
        reviewed: 'Проверен'
    }

    const filterSurveys = () => {
        let result = [...surveys.value]
        // ВРЕМЕННО отключаем фильтр закрытых/истекших для диагностики
        // const now = new Date()
        // result = result.filter(s => {
        //     if (s.is_closed) return false
        //     if (s.expires_at && new Date(s.expires_at) < now) return false
        //     return true
        // })

        if (searchQuery.value.trim()) {
            const q = searchQuery.value.toLowerCase()
            result = result.filter(s => s.title?.toLowerCase().includes(q))
        }
        if (filterDepartment.value) {
            result = result.filter(s => s.department_id === filterDepartment.value)
        }

        filteredSurveys.value = result
    }

    const activeFiltersCount = computed(() => {
        let count = 0
        if (filterDepartment.value) count++
        if (filterPassed.value) count++
        return count
    })

    const resetFilters = () => {
        filterDepartment.value = ''
        filterPassed.value = ''
        searchQuery.value = ''
        showFilters.value = false
        filterSurveys()
    }

    const mySurveys = computed(() => {
        if (!user.value?.id) return []
        return filteredSurveys.value.filter(s => s.user_id === user.value.id)
    })

    const deptSurveys = computed(() => {
        if (!userDepartmentId.value) return []
        return filteredSurveys.value.filter(s =>
            s.department_id === userDepartmentId.value &&
            s.id !== ANKETA_ID  // Скрываем анкету
        )
    })

    const generalSurveys = computed(() => {
        return filteredSurveys.value.filter(s =>
            !s.department_id &&
            s.id !== ANKETA_ID  // Скрываем анкету
        )
    })

    onMounted(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        user.value = session?.user ?? null
        if (!user.value) { router.push('/login'); return }

        loading.value = true
        try {
            const { data: depts } = await supabase.from('departments').select('*').order('name')
            departments.value = depts || []

            // ОДИН запрос профиля
            const { data: profile } = await supabase
                .from('profiles')
                .select('department_id, can_create, is_intern, education_completed')
                .eq('id', user.value.id)
                .single()

            userDepartmentId.value = profile?.department_id || null
            canCreate.value = profile?.can_create || false

            const { data: adminCheck } = await supabase
                .from('admins')
                .select('user_id')
                .eq('user_id', user.value.id)
                .maybeSingle()
            isAdmin.value = !!adminCheck

            const { data: responses } = await supabase
                .from('responses')
                .select('survey_id, feedback, sent_to_admin')
                .eq('user_id', user.value.id)

            passedSurveyIds.value = (responses || []).map(r => r.survey_id)

            // Исправлено — без висячей точки с запятой
            const statuses = {}
                ; (responses || []).forEach(r => {
                    if (r.feedback) {
                        statuses[r.survey_id] = 'reviewed'
                    } else if (r.sent_to_admin) {
                        statuses[r.survey_id] = 'pending'
                    } else {
                        statuses[r.survey_id] = 'completed'
                    }
                })
            surveyStatuses.value = statuses

            // ОДИН запрос опросов
            let query = supabase.from('surveys').select(`*, departments (name)`).order('created_at', { ascending: false })

            // Используем ref-значения, а не локальные const
            if (educationCompleted.value && !userDepartmentId.value && !canCreate.value) {
                query = query.eq('user_id', user.value.id)
            } else if (isIntern.value && userDepartmentId.value) {
                query = query.or(
                    `and(is_for_interns.eq.true,department_id.eq.${userDepartmentId.value}),` +
                    `user_id.eq.${user.value.id}`
                )
            } else if (userDepartmentId.value) {
                query = query.or(
                    `and(is_private.eq.false,department_id.eq.${userDepartmentId.value},is_for_interns.eq.false),` +
                    `and(is_private.eq.false,department_id.is.null,is_for_interns.eq.false),` +
                    `user_id.eq.${user.value.id}`
                )
            } else {
                query = query.or(
                    `and(is_private.eq.false,department_id.is.null,is_for_interns.eq.false),` +
                    `user_id.eq.${user.value.id}`
                )
            }

            const { data, error } = await query
            if (error) throw error
            surveys.value = (data || []).filter(s => {
                // Если анкета пройдена — скрываем её
                if (s.id === ANKETA_ID && educationCompleted.value) return false
                return true
            })

            // Если анкета уже пройдена — убираем её из списка
            if (educationCompleted.value) {
                surveys.value = surveys.value.filter(s => s.id !== ANKETA_ID)
            }

            // Фильтр для стажеров — используем ref
            if (isIntern.value) {
                const passedIds = (responses || []).map(r => r.survey_id)
                surveys.value = surveys.value.filter(s => {
                    if (!s.is_for_interns) return false
                    if (!s.prerequisite_survey_id) return true
                    return passedIds.includes(s.prerequisite_survey_id)
                })
            }

            filterSurveys()
        } catch (e) {
            console.error('Ошибка загрузки опросов:', e)
        } finally {
            loading.value = false
        }
    })

    const refreshStatuses = async () => {
        if (!user.value) return

        const { data: responses } = await supabase
            .from('responses')
            .select('survey_id, feedback, sent_to_admin')
            .eq('user_id', user.value.id)

        passedSurveyIds.value = (responses || []).map(r => r.survey_id)

        const statuses = {}
            ; (responses || []).forEach(r => {
                if (r.feedback) {
                    statuses[r.survey_id] = 'reviewed'
                } else if (r.sent_to_admin) {
                    statuses[r.survey_id] = 'pending'
                } else {
                    statuses[r.survey_id] = 'completed'
                }
            })
        surveyStatuses.value = statuses
    }
</script>

<style scoped>
    .filters-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 16px;
        align-items: center;
    }

    .search-wrapper {
        position: relative;
        flex: 1;
    }

    .search-input {
        width: 100%;
        height: 42px;
        padding: 0 40px 0 16px;
        border: 2px solid #212844;
        border-radius: 14px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #212844;
        background: white;
        transition: border-color 0.2s;
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

    .filter-toggle {
        height: 42px;
        padding: 0 16px;
        border: 2px solid #212844;
        border-radius: 14px;
        background: white;
        font-weight: 700;
        font-size: 0.85rem;
        color: #212844;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        transition: all 0.2s;
    }

        .filter-toggle:hover {
            background: #FDFDF1;
        }

    .filter-count {
        background: #DF2935;
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        font-size: 0.7rem;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .filters-panel {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        padding: 16px;
        background: white;
        border: 2px solid #212844;
        border-radius: 16px;
        flex-wrap: wrap;
        align-items: flex-end;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .filter-label {
        font-size: 0.65rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #212844;
        opacity: 0.5;
        padding-left: 4px;
    }

    .filter-select-wrapper {
        position: relative;
    }

    .filter-select {
        height: 38px;
        padding: 0 32px 0 12px;
        border: 2px solid #212844;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #212844;
        background: #FDFDF1;
        appearance: none;
        cursor: pointer;
    }

        .filter-select:focus {
            outline: none;
            border-color: #DF2935;
        }

    .filter-reset {
        height: 38px;
        padding: 0 14px;
        border: none;
        background: transparent;
        color: #888;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
        margin-left: auto;
    }

        .filter-reset:hover {
            color: #DF2935;
        }

    .status-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.7rem;
        font-weight: 700;
    }
    .status-dot-completed,
    .status-dot-pending,
    .status-dot-reviewed {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .status-dot-completed {
        background: #adb5bd; /* серый */
    }

    .status-dot-pending {
        background: #ffc107; /* жёлтый */
    }

    .status-dot-reviewed {
        background: #198754; /* зелёный */
    }

    /* Цветной текст */
    .status-text-completed {
        color: #6c757d; /* серый */
    }

    .status-text-pending {
        color: #cc9a06; /* тёмно-жёлтый */
    }

    .status-text-reviewed {
        color: #198754; /* зелёный */
    }


    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #888;
        font-size: 1.1rem;
    }

    .surveys-section {
        margin-bottom: 30px;
    }

    .section-title {
        font-size: 1.2rem;
        font-weight: 800;
        color: #212844;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #eee;
    }

    .surveys-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 30px;
        padding: 20px 0;
        width: 100%;
    }

    @media (max-width: 900px) {
        .surveys-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 600px) {
        .surveys-grid {
            grid-template-columns: 1fr;
        }
    }

    .survey-card-link {
        text-decoration: none;
        color: inherit;
        display: block;
        width: 100%;
    }

    .survey-card {
        position: relative;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

        .survey-card:hover {
            transform: translate(-4px, -4px);
        }

            .survey-card:hover .card-deco {
                transform: translate(4px, 4px);
                background: #F2C4CE;
            }

    .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
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

    .card-deco {
        position: absolute;
        top: 10px;
        left: 10px;
        width: 100%;
        height: 100%;
        background: #B0D7FF;
        border: 2px solid #212844;
        border-radius: 20px;
        z-index: 1;
    }

    .card-content {
        position: relative;
        background: white;
        border: 2px solid #212844;
        border-radius: 20px;
        padding: 25px;
        z-index: 2;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .survey-title {
        font-size: 1.25rem;
        font-weight: 800;
        margin-bottom: 8px;
        line-height: 1.2;
        color: #212844;
    }

    .survey-desc {
        opacity: 0.6;
        font-size: 0.85rem;
        margin-bottom: 15px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(33, 40, 68, 0.1);
        padding-top: 12px;
    }

    .date {
        font-size: 0.75rem;
        font-weight: 600;
        opacity: 0.4;
    }

    .open-btn {
        font-weight: 800;
        font-size: 0.8rem;
        color: #212844;
        text-decoration: none;
        cursor: pointer;
    }

    @media (max-width: 500px) {
        .card-content {
            padding: 16px;
            min-height: 160px;
        }

        .survey-title {
            font-size: 1rem;
        }

        .survey-desc {
            font-size: 0.75rem;
        }

        .date {
            font-size: 0.65rem;
        }
    }

    .status-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        padding: 16px 20px;
        background: white;
        border: 2px solid #e9ecef;
        border-radius: 16px;
        margin-bottom: 20px;
        align-items: center;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        color: #495057;
        font-weight: 500;
    }

    .legend-icon {
        font-size: 1.1rem;
    }

    .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 1.5px solid #212844;
        flex-shrink: 0;
    }

        .legend-dot.status-completed {
            background: #e9ecef;
        }

        .legend-dot.status-pending {
            background: #fff3cd;
        }

        .legend-dot.status-reviewed {
            background: #d1e7dd;
        }

    .legend-text {
        white-space: nowrap;
    }

    .info-banner {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 24px;
        border-radius: 16px;
        margin-bottom: 24px;
        border: 2px solid;
    }

    .banner-welcome {
        background: linear-gradient(135deg, #FDFDF1 0%, #fff 100%);
        border-color: #B0D7FF;
    }

    .banner-pending {
        background: #fffbea;
        border-color: #ffc107;
    }

    .banner-intern {
        background: linear-gradient(135deg, #f0f8ff 0%, #fff 100%);
        border-color: #0d6efd;
    }

    .banner-completed {
        background: #f0fff4;
        border-color: #198754;
    }


    .info-banner-icon {
        font-size: 2rem;
        flex-shrink: 0;
    }

    .info-banner-text {
        flex: 1;
    }

        .info-banner-text strong {
            font-size: 1rem;
            color: #212844;
        }

        .info-banner-text p {
            margin: 4px 0 0;
            font-size: 0.85rem;
            color: #666;
        }

    .btn-banner {
        background: #212844;
        color: #F2C4CE;
        padding: 10px 20px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.85rem;
        text-decoration: none;
        white-space: nowrap;
        transition: all 0.2s;
    }

        .btn-banner:hover {
            background: #DF2935;
            color: white;
        }

    .btn-refresh {
        background: none;
        border: 2px solid #212844;
        border-radius: 10px;
        padding: 6px 14px;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }

        .btn-refresh:hover {
            background: #212844;
            color: #F2C4CE;
        }
</style>
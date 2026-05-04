<template>
    <div class="history-page">
        <div class="container py-5" style="max-width: 850px;">
            <div class="d-flex align-items-center mb-5">
                <h2 class="fw-bold m-0 survey-title">История прохождений</h2>
            </div>

            <div v-if="loading" class="text-center py-5">
                <div class="spinner-border custom-spinner" role="status"></div>
                <p class="mt-3 text-muted">Загружаем историю...</p>
            </div>

            <div v-else-if="error" class="alert alert-custom text-center shadow-sm">
                <i class="bi bi-exclamation-circle me-2"></i> {{ error }}
            </div>

            <div v-else-if="myResponses.length === 0" class="empty-state text-center py-5 shadow-sm rounded-4">
                <i class="bi bi-journal-x display-1 text-muted mb-4 d-block"></i>
                <p class="text-muted fs-5">Вы ещё не прошли ни одного опроса.</p>
                <button @click="router.push('/')" class="btn btn-submit mt-2 px-4">
                    Найти первый опрос
                </button>
            </div>

            <div v-else class="responses-list">
                <div v-for="res in myResponses"
                     :key="res.id"
                     @click="goToResults(res.id)"
                     class="response-card p-4 mb-3 shadow-sm">

                    <!-- Заголовок опроса -->
                    <h5 class="fw-bold mb-2 card-survey-title">
                        {{ res.survey_title || 'Завершенный опрос' }}
                    </h5>

                    <!-- Дата -->
                    <div class="text-muted small mb-2">
                        <i class="bi bi-calendar3 me-2"></i>
                        {{ formatDate(res.submitted_at) }}
                    </div>

                    <!-- Результат и статус -->
                    <div class="d-flex align-items-center justify-content-between mt-3">
                        <div class="d-flex align-items-center gap-3">
                            <!-- Статус -->
                            <span :class="res.passed ? 'badge-passed' : 'badge-failed'">
                                {{ res.passed ? '✅ Сдано' : '❌ Не сдано' }}
                            </span>
                            <!-- Баллы -->
                            <span class="score-text">
                                {{ res.total_score }} / {{ res.max_score }}
                            </span>
                        </div>

                        <!-- Ссылка на результаты -->
                        <span class="view-link fw-bold">
                            Результаты <i class="bi bi-chevron-right ms-1"></i>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { supabase } from '../supabase'
    import { useRouter } from 'vue-router'

    const router = useRouter()
    const loading = ref(true)
    const error = ref(null)
    const myResponses = ref([])

    const goToResults = (responseId) => {
        router.push(`/my-results/${responseId}`)
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    onMounted(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user?.id) {
                error.value = "Вы не авторизованы"
                loading.value = false
                return
            }

            // Загружаем ответы с названием опроса
            const { data, error: fetchError } = await supabase
                .from('responses')
                .select(`
                    id,
                    submitted_at,
                    survey_id,
                    surveys!inner(title)
                `)
                .eq('user_id', session.user.id)
                .order('submitted_at', { ascending: false })

            if (fetchError) {
                console.error('Fetch error:', fetchError)
                error.value = 'Не удалось загрузить историю'
                loading.value = false
                return
            }

            // Для каждого ответа считаем баллы
            const enriched = await Promise.all((data || []).map(async (res) => {
                // Загружаем вопросы опроса
                const { data: questions } = await supabase
                    .from('questions')
                    .select('id, question_type, choices(id, is_correct)')
                    .eq('survey_id', res.survey_id)

                // Загружаем ответы пользователя
                const { data: answers } = await supabase
                    .from('answers')
                    .select('*')
                    .eq('response_id', res.id)

                let totalScore = 0
                let maxScore = 0

                questions?.forEach(q => {
                    if (q.question_type === 'scale') return
                    maxScore++

                    const ansList = (answers || []).filter(a => a.question_id === q.id)
                    if (ansList.length === 0) return

                    if (q.question_type === 'text') {
                        const ans = ansList[0]
                        if (ans.score) totalScore += Number(ans.score)
                        return
                    }

                    const correctIds = (q.choices || []).filter(c => c.is_correct).map(c => String(c.id))
                    const userIds = ansList.map(a => String(a.choice_id)).filter(id => id !== 'null')

                    if (correctIds.length > 0 && userIds.length === correctIds.length &&
                        userIds.every(id => correctIds.includes(id))) {
                        totalScore++
                    }
                })

                const passed = maxScore > 0 ? (totalScore / maxScore) >= 0.6 : true

                return {
                    id: res.id,
                    submitted_at: res.submitted_at,
                    survey_title: res.surveys?.title || 'Завершенный опрос',
                    total_score: totalScore,
                    max_score: maxScore,
                    passed: passed
                }
            }))

            myResponses.value = enriched
        } catch (err) {
            console.error(err)
            error.value = 'Ошибка сервера'
        } finally {
            loading.value = false
        }
    })
</script>

<style scoped>
    .history-page {
        background-color: #FDFDF1;
        min-height: 100vh;
        padding-bottom: 2rem;
    }

    .survey-title {
        color: #212844;
    }

    .responses-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .response-card {
        background: #ffffff;
        border-radius: 20px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        padding: 1.5rem 2rem !important;
    }

        .response-card:hover {
            transform: translateX(8px);
            border-color: #F2C4CE;
            box-shadow: 0 10px 25px rgba(33, 40, 68, 0.1) !important;
        }

    .card-survey-title {
        color: #212844;
        font-size: 1.15rem;
    }

    /* Статусы */
    .badge-passed {
        background: #d1e7dd;
        color: #0f5132;
        padding: 5px 14px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.85rem;
    }

    .badge-failed {
        background: #F2C4CE;
        color: #212844;
        padding: 5px 14px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.85rem;
    }

    .score-text {
        font-weight: 700;
        color: #212844;
        font-size: 1rem;
    }

    .view-link {
        color: #212844;
        font-size: 0.9rem;
        padding: 8px 18px;
        background: #F2C4CE;
        border-radius: 12px;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .response-card:hover .view-link {
        background: #212844;
        color: #F2C4CE;
    }

    @media (max-width: 576px) {
        .response-card {
            padding: 1.2rem !important;
        }
    }

    .custom-spinner {
        color: #212844;
    }

    .alert-custom {
        background-color: #F2C4CE;
        color: #212844;
        border: none;
        border-radius: 15px;
        padding: 1.5rem;
    }
</style>
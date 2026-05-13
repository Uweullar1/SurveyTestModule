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
                     class="response-card">

                    <!-- Заголовок опроса -->
                    <h5 class="card-survey-title">{{ res.survey_title || 'Завершенный опрос' }}</h5>

                    <!-- Дата -->
                    <div class="card-date">
                        <i class="bi bi-calendar3 me-1"></i>
                        {{ formatDate(res.submitted_at) }}
                    </div>

                    <!-- Нижняя строка: статус + баллы + кнопка -->
                    <div class="card-bottom">
                        <div class="card-info">
                            <span v-if="res.isSurvey" class="badge-survey">📋 Пройден</span>
                            <span v-else :class="res.passed ? 'badge-passed' : 'badge-failed'">
                                {{ res.passed ? 'Сдано' : 'Не сдано' }}
                            </span>
                            <span v-if="!res.isSurvey" class="score-text">{{ res.total_score }} / {{ res.max_score }}</span>
                        </div>
                        <span class="view-link" @click="goToResults(res.id)">
                            {{ res.isSurvey ? 'Подробнее' : 'Результаты' }} →
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
                const { data: questions } = await supabase
                    .from('questions')
                    .select('id, question_type, no_evaluation, choices(id, is_correct)')
                    .eq('survey_id', res.survey_id)

                const { data: answers } = await supabase
                    .from('answers')
                    .select('*')
                    .eq('response_id', res.id)

                // Проверяем тип опроса
                const { data: surveyData } = await supabase
                    .from('surveys')
                    .select('is_survey')
                    .eq('id', res.survey_id)
                    .single()

                const isSurvey = surveyData?.is_survey || false

                let totalScore = 0
                let maxScore = 0

                if (!isSurvey) {
                    questions?.forEach(q => {
                        if (q.question_type === 'scale') return
                        if (q.no_evaluation) return
                        maxScore++
                        const ansList = (answers || []).filter(a => a.question_id === q.id)
                        if (ansList.length === 0) return
                        if (q.question_type === 'text') {
                            if (ansList[0]?.score > 0) totalScore += Number(ansList[0].score)
                            return
                        }
                        const correctIds = (q.choices || []).filter(c => c.is_correct).map(c => String(c.id))
                        const userIds = ansList.map(a => String(a.choice_id)).filter(id => id !== 'null')
                        if (correctIds.length && userIds.length === correctIds.length && userIds.every(id => correctIds.includes(id))) totalScore++
                    })
                }

                const passed = isSurvey ? null : (maxScore > 0 ? totalScore / maxScore >= 0.6 : true)

                return {
                    id: res.id,
                    submitted_at: res.submitted_at,
                    survey_title: res.surveys?.title || 'Завершенный опрос',
                    total_score: totalScore,
                    max_score: maxScore,
                    passed: passed,
                    isSurvey: isSurvey
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
    .responses-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .response-card {
        background: #ffffff;
        border-radius: 20px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 20px 24px !important;
    }

        .response-card:hover {
            transform: translateX(6px);
            border-color: #F2C4CE;
            box-shadow: 0 8px 20px rgba(33, 40, 68, 0.08);
        }

    .card-survey-title {
        color: #212844;
        font-size: 1.1rem;
        font-weight: 800;
        margin-bottom: 4px;
    }

    .card-date {
        color: #888;
        font-size: 0.8rem;
        margin-bottom: 14px;
    }

    .card-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .card-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .badge-passed {
        background: #d1e7dd;
        color: #0f5132;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.8rem;
    }

    .badge-failed {
        background: #F2C4CE;
        color: #212844;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.8rem;
    }

    .badge-survey {
        background: #B0D7FF;
        color: #212844;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.8rem;
    }

    .score-text {
        font-weight: 700;
        color: #212844;
        font-size: 0.95rem;
    }

    .view-link {
        color: #212844;
        font-size: 0.85rem;
        font-weight: 700;
        padding: 6px 16px;
        background: #F2C4CE;
        border-radius: 10px;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .response-card:hover .view-link {
        background: #212844;
        color: #F2C4CE;
    }
</style>
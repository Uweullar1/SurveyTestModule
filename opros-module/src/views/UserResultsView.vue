<template>
    <div class="container py-5 text-center">
        <div v-if="loading" class="text-center p-5">
            <div class="spinner-border text-dark"></div>
            <p class="mt-3">Загрузка результатов...</p>
        </div>

        <div v-else>
            <h2 class="fw-bold mb-4">Результаты: {{ surveyTitle }}</h2>

            <!-- Итоговый балл -->
            <div class="card border-0 shadow-sm bg-white rounded-4 mb-5 p-4">
                <div class="score-display fw-bold">
                    {{ totalScore }} <span style="font-size: 1.5rem; color: #6c757d;">из {{ maxScore }}</span>
                </div>
                <div :class="passed ? 'text-success' : 'text-danger'" class="fw-bold text-uppercase mt-1">
                    {{ passed ? '✅ Сдано' : '❌ Не сдано' }}
                </div>
            </div>

            <div v-if="questions.length === 0" class="text-muted p-5">
                Вопросы не найдены
            </div>

            <!-- Список вопросов -->
            <div v-for="(q, i) in questions" :key="q?.id || i" class="question-card">

                <!-- Номер и текст вопроса -->
                <div class="question-header mb-3">
                    <span class="question-num">{{ i + 1 }}</span>
                    <span class="question-text">{{ q?.text || 'Вопрос без текста' }}</span>
                    <!-- Статус -->
                    <span :class="isCorrect(q) ? 'status-ok' : 'status-fail'">
                        {{ isCorrect(q) ? '✓ Верно' : '✗ Неверно' }}
                    </span>
                </div>

                <!-- Ответ пользователя -->
                <div class="answer-section" :class="isCorrect(q) ? 'answer-correct' : 'answer-wrong'">
                    <strong>Ваш ответ:</strong> {{ formatUserAnswer(q) }}
                </div>

                <!-- Фидбек для текстовых -->
                <div v-if="q?.question_type === 'text'" class="feedback-block">
                    <div class="feedback-row">
                        <span class="feedback-label">Оценка проверяющего</span>
                        <span class="feedback-score">{{ getScore(q) }}/10</span>
                    </div>
                    <div class="feedback-text" v-if="getFeedback(q)">
                        «{{ getFeedback(q) }}»
                    </div>
                    <div class="feedback-text text-muted" v-else>
                        Ещё не проверено
                    </div>
                </div>

                <!-- Правильный ответ (для выбора) -->
                <div v-if="q?.question_type !== 'text' && q?.question_type !== 'scale'"
                     class="correct-answer mt-3">
                    <strong>Правильный ответ:</strong> {{ getCorrectAnswerText(q) }}
                </div>
            </div>

            <div class="publish-bottom">
                <button @click="goBack" class="btn-back">
                    ← Вернуться в историю
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, computed } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const route = useRoute()
    const router = useRouter()

    const surveyTitle = ref('Опрос')
    const questions = ref([])
    const allAnswers = ref([])
    const loading = ref(true)

    const goBack = () => router.push('/my-history')

    onMounted(async () => {
        const responseId = route.params.id
        if (!responseId) { loading.value = false; return }

        try {
            const { data: responseData } = await supabase
                .from('responses').select('survey_id').eq('id', responseId).single()
            if (!responseData) { loading.value = false; return }

            const surveyId = responseData.survey_id

            const { data: sData } = await supabase.from('surveys').select('title').eq('id', surveyId).single()
            surveyTitle.value = sData?.title || 'Опрос'

            const { data: qData } = await supabase
                .from('questions').select('id, text, question_type, choices(id, text, is_correct)')
                .eq('survey_id', surveyId).order('order')
            questions.value = (qData || []).filter(q => q?.id)

            const { data: aData } = await supabase.from('answers').select('*').eq('response_id', responseId)
            allAnswers.value = aData || []
        } catch (err) {
            console.error('Ошибка загрузки:', err)
        } finally {
            loading.value = false
        }
    })

    const formatUserAnswer = (q) => {
        if (!q) return '—'
        const ansList = allAnswers.value.filter(a => a.question_id === q.id)
        if (ansList.length === 0) return '—'
        if (q.question_type === 'text') return ansList[0].text_answer || '—'
        if (q.question_type === 'scale') return (ansList[0].scale_value || '—') + '/10'

        const ids = ansList.map(a => a.choice_id).filter(id => id)
        const texts = (q.choices || []).filter(c => ids.some(id => String(id) === String(c.id))).map(c => c.text)
        return texts.length ? texts.join(', ') : '—'
    }

    const getCorrectAnswerText = (q) => {
        if (!q?.choices) return '—'
        const correct = q.choices.filter(c => c.is_correct).map(c => c.text)
        return correct.length ? correct.join(', ') : '—'
    }

    const getScore = (q) => {
        const ans = allAnswers.value.find(a => a.question_id === q.id)
        return ans?.score ?? '—'
    }

    const getFeedback = (q) => {
        const ans = allAnswers.value.find(a => a.question_id === q.id)
        return ans?.feedback || ''
    }

    const isCorrect = (q) => {
        if (!q?.question_type) return false
        if (q.question_type === 'text') {
            const ans = allAnswers.value.find(a => a.question_id === q.id)
            return ans?.score > 0
        }
        if (q.question_type === 'scale') return true
        return formatUserAnswer(q) === getCorrectAnswerText(q)
    }

    const maxScore = computed(() => questions.value.filter(q => q?.question_type !== 'scale').length)
    const totalScore = computed(() => {
        let score = 0
        questions.value.forEach(q => {
            if (!q?.question_type || q.question_type === 'scale') return
            const ansList = allAnswers.value.filter(a => a.question_id === q.id)
            if (ansList.length === 0) return
            if (q.question_type === 'text') {
                const s = Number(ansList[0]?.score)
                if (s > 0) score += s
                return
            }
            const correctIds = (q.choices || []).filter(c => c.is_correct).map(c => String(c.id))
            const userIds = ansList.map(a => String(a.choice_id)).filter(id => id !== 'null')
            if (correctIds.length && userIds.length === correctIds.length && userIds.every(id => correctIds.includes(id))) score++
        })
        return score
    })
    const passed = computed(() => maxScore.value > 0 ? (totalScore.value / maxScore.value) >= 0.6 : true)
</script>

<style scoped>
    .container {
        max-width: 700px;
        margin: 0 auto;
    }

    h2 {
        color: #212844;
        font-weight: 900;
    }

    .score-display {
        font-size: 3rem;
        color: #212844;
    }

    .question-card {
        background: #fff;
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 16px;
        text-align: left;
        border: 1px solid #eee;
    }

    .question-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }

    .question-num {
        background: #212844;
        color: #fff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.8rem;
        flex-shrink: 0;
    }

    .question-text {
        flex: 1;
        font-weight: 700;
        color: #212844;
    }

    .status-ok {
        color: #198754;
        font-weight: 700;
        font-size: 0.8rem;
        white-space: nowrap;
    }

    .status-fail {
        color: #dc3545;
        font-weight: 700;
        font-size: 0.8rem;
        white-space: nowrap;
    }

    .answer-section {
        border-radius: 10px;
        padding: 12px 16px;
        margin-top: 12px;
        font-size: 0.9rem;
    }

    .answer-correct {
        background: #d1e7dd;
        color: #0f5132;
    }

    .answer-wrong {
        background: #f8d7da;
        color: #842029;
    }

    .correct-answer {
        font-size: 0.85rem;
        color: #198754;
        background: #d1e7dd44;
        padding: 8px 14px;
        border-radius: 8px;
    }

    .feedback-block {
        background: #fff;
        border: 2px solid #F2C4CE;
        border-radius: 14px;
        padding: 16px;
        margin-top: 12px;
    }

    .feedback-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .feedback-label {
        font-size: 0.7rem;
        text-transform: uppercase;
        font-weight: 800;
        color: #888;
    }

    .feedback-score {
        font-size: 1.2rem;
        font-weight: 900;
        color: #212844;
    }

    .feedback-text {
        font-size: 0.9rem;
        color: #444;
        font-style: italic;
    }

    .btn-back {
        background: #212844;
        color: #F2C4CE;
        border: none;
        border-radius: 16px;
        padding: 14px 40px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
    }

        .btn-back:hover {
            background: #1a2036;
        }

    .publish-bottom {
        margin-top: 40px;
        padding-bottom: 40px;
    }
</style>
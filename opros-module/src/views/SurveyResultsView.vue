<template>
    <div class="container my-5">
        <h1 class="mb-4 text-center">Результаты опроса</h1>

        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка результатов...</span>
            </div>
            <p class="mt-3">Подгружаем ваши ответы...</p>
        </div>

        <div v-else-if="error" class="alert alert-danger text-center">
            {{ error }}
        </div>

        <div v-else class="card shadow-lg border-0">
            <div class="card-body p-5">
                <h3 class="card-title text-center mb-4">
                    {{ store.lastSurveyTitle || 'Опрос завершён' }}
                </h3>

                <div class="text-center mb-5">
                    <h4>Вы ответили на <strong>{{ totalQuestions }}</strong> вопросов</h4>

                    <div v-if="correctCount !== null" class="mt-4">
                        <h5 class="mb-3">
                            Правильных ответов: <span class="text-success fw-bold">{{ correctCount }}</span> из {{ totalQuestions }}
                        </h5>
                        <div class="progress" style="height: 35px; font-size: 1.1rem;">
                            <div class="progress-bar bg-success"
                                 role="progressbar"
                                 :style="{ width: correctPercent + '%' }"
                                 :aria-valuenow="correctPercent"
                                 aria-valuemin="0"
                                 aria-valuemax="100">
                                {{ correctPercent }}%
                            </div>
                        </div>
                    </div>

                    <div v-else class="alert alert-info mt-4">
                        Это анкета без правильных ответов — спасибо за участие!
                    </div>
                </div>

                <h5 class="mt-5 mb-3">Ваши ответы:</h5>
                <div class="accordion" id="answersAccordion">
                    <div v-for="(q, index) in questions" :key="q.id" class="accordion-item">
                        <h2 class="accordion-header" :id="'heading-' + index">
                            <button class="accordion-button"
                                    type="button"
                                    data-bs-toggle="collapse"
                                    :data-bs-target="'#collapse-' + index"
                                    aria-expanded="true"
                                    aria-controls="'collapse-' + index">
                                Вопрос {{ index + 1 }}: {{ q.text }}
                            </button>
                        </h2>
                        <div :id="'collapse-' + index"
                             class="accordion-collapse collapse show"
                             :aria-labelledby="'heading-' + index"
                             data-bs-parent="#answersAccordion">
                            <div class="accordion-body">
                                <strong>Ваш ответ:</strong> {{ getUserAnswerText(q) }}<br>

                                <div v-if="q.choices && q.choices.length > 0">
                                    <strong>Правильный ответ:</strong>
                                    {{ getCorrectAnswerText(q) || 'Нет правильного ответа' }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-5">
                    <button class="btn btn-primary btn-lg px-5" @click="router.push('/')">
                        Вернуться к списку опросов
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { useSurveyStore } from '../stores/survey'
    import { supabase } from '../supabase'

    const route = useRoute()
    const router = useRouter()
    const store = useSurveyStore()

    const survey = ref({})
    const questions = ref([])
    const responses = ref({})
    const correctCount = ref(null)
    const totalQuestions = ref(0)
    const correctPercent = ref(0)
    const loading = ref(true)
    const error = ref(null)

    onMounted(async () => {
        const surveyId = route.params.id

        // Проверяем, есть ли сохранённые результаты в Pinia
        if (store.lastSurveyId !== surveyId || !store.lastResponses) {
            error.value = 'Результаты для этого опроса недоступны. Пройдите опрос заново.'
            loading.value = false
            return
        }

        try {
            // Загружаем название опроса (если нужно)
            const { data: surveyData } = await supabase
                .from('surveys')
                .select('title')
                .eq('id', surveyId)
                .single()

            survey.value.title = surveyData?.title || 'Результаты опроса'

            // Загружаем вопросы и варианты (для отображения правильных ответов)
            const { data: questionsData } = await supabase
                .from('questions')
                .select(`
        id,
        text,
        question_type,
        choices (id, text, is_correct)
      `)
                .eq('survey_id', surveyId)
                .order('order')

            questions.value = questionsData || []
            totalQuestions.value = questions.value.length

            // Берём сохранённые ответы из Pinia
            responses.value = { ...store.lastResponses }
            correctCount.value = store.lastCorrectCount
            correctPercent.value = totalQuestions.value > 0
                ? Math.round((correctCount.value / totalQuestions.value) * 100)
                : 0

            // Очищаем Pinia после отображения (чтобы не хранить старые данные)
            store.clearLastResponses()
        } catch (err) {
            console.error('Ошибка загрузки результатов:', err)
            error.value = 'Не удалось загрузить результаты'
        } finally {
            loading.value = false
        }
    })

    const getUserAnswerText = (question) => {
        const answer = responses.value[question.id]
        if (answer === null || answer === undefined) return '—'

        if (question.question_type === 'single') {
            const choice = question.choices?.find(c => c.id === answer)
            return choice ? choice.text : '—'
        } else if (question.question_type === 'multiple') {
            if (!Array.isArray(answer) || answer.length === 0) return '—'
            return answer.map(id => {
                const choice = question.choices?.find(c => c.id === id)
                return choice ? choice.text : '—'
            }).join(', ')
        } else if (question.question_type === 'text') {
            return answer || '—'
        } else if (question.question_type === 'scale') {
            return answer + '/10'
        }
        return '—'
    }

    const getCorrectAnswerText = (question) => {
        if (!question.choices || question.choices.length === 0) return null

        const correct = question.choices.filter(c => c.is_correct).map(c => c.text)
        if (correct.length === 0) return null

        return correct.join(', ')
    }
</script>

<style scoped>
    .progress-bar {
        font-weight: bold;
    }

    .accordion-button:not(.collapsed) {
        background-color: #e7f1ff;
        color: #0c63e4;
    }
</style>
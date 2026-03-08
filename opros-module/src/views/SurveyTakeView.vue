<template>
    <div class="container my-5">
        <h1 class="mb-4">{{ survey.title || 'Опрос' }}</h1>

        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка опроса...</span>
            </div>
            <p class="mt-3">Подгружаем вопросы...</p>
        </div>

        <div v-else-if="error" class="alert alert-danger text-center">
            {{ error }}
        </div>

        <div v-else>
            <p class="lead mb-5">{{ survey.description || 'Без описания' }}</p>

            <form @submit.prevent="submitResponses">
                <div v-for="question in questions" :key="question.id" class="mb-5">
                    <h5 class="mb-3">
                        {{ question.text }}
                        <span v-if="question.required" class="text-danger">*</span>
                    </h5>

                    <div v-if="question.question_type === 'single'" class="mb-3">
                        <div class="form-check" v-for="choice in question.choices" :key="choice.id">
                            <input class="form-check-input"
                                   type="radio"
                                   :name="`q-${question.id}`"
                                   :id="`choice-${choice.id}`"
                                   v-model="responses[question.id]"
                                   :value="choice.id"
                                   :required="question.required" />
                            <label class="form-check-label" :for="`choice-${choice.id}`">
                                {{ choice.text }}
                            </label>
                        </div>
                    </div>

                    <div v-else-if="question.question_type === 'multiple'" class="mb-3">
                        <div class="form-check" v-for="choice in question.choices" :key="choice.id">
                            <input class="form-check-input"
                                   type="checkbox"
                                   :id="`choice-${choice.id}`"
                                   v-model="responses[question.id]"
                                   :value="choice.id" />
                            <label class="form-check-label" :for="`choice-${choice.id}`">
                                {{ choice.text }}
                            </label>
                        </div>
                    </div>

                    <div v-else-if="question.question_type === 'text'" class="mb-3">
                        <textarea v-model="responses[question.id]"
                                  class="form-control"
                                  rows="3"
                                  :required="question.required"
                                  placeholder="Введите ваш ответ..."></textarea>
                    </div>

                    <div v-else-if="question.question_type === 'scale'" class="mb-3">
                        <label class="form-label">Оцените от 1 до 10</label>
                        <input type="range"
                               class="form-range"
                               min="1"
                               max="10"
                               step="1"
                               v-model.number="responses[question.id]"
                               :required="question.required" />
                        <div class="text-center mt-2 fw-bold">{{ responses[question.id] || '—' }}/10</div>
                    </div>
                </div>

                <div class="d-grid mt-5">
                    <button type="submit"
                            class="btn btn-success btn-lg"
                            :disabled="submitting || loading">
                        <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                        Отправить ответы
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'  // ← относительный путь, как у тебя
    import { useSurveyStore } from '../stores/survey'  // ← относительный путь

    const route = useRoute()
    const router = useRouter()
    const store = useSurveyStore()

    const survey = ref({})
    const questions = ref([])
    const responses = ref({})
    const submitting = ref(false)
    const loading = ref(true)
    const error = ref(null)

    onMounted(async () => {
        const surveyId = route.params.id

        if (!surveyId) {
            error.value = 'ID опроса не указан'
            loading.value = false
            return
        }

        try {
            // 1. Опрос
            const { data: surveyData, error: surveyError } = await supabase
                .from('surveys')
                .select('*')
                .eq('id', surveyId)
                .single()

            if (surveyError) throw surveyError
            survey.value = surveyData || {}

            // 2. Вопросы + варианты
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select(`
        id,
        text,
        question_type,
        order,
        required,
        choices (id, text, order, is_correct)
      `)
                .eq('survey_id', surveyId)
                .order('order')

            if (questionsError) throw questionsError
            questions.value = questionsData || []

            // Инициализация ответов
            questions.value.forEach(q => {
                if (q.question_type === 'multiple') {
                    responses.value[q.id] = []
                } else {
                    responses.value[q.id] = null
                }
            })
        } catch (err) {
            console.error('Ошибка загрузки:', err)
            error.value = err.message || 'Не удалось загрузить опрос'
        } finally {
            loading.value = false
        }
    })

    const submitResponses = async () => {
        if (submitting.value) return

        // Проверка обязательных
        const unanswered = questions.value.filter(q => {
            const ans = responses.value[q.id]
            return q.required && (
                ans === null ||
                ans === '' ||
                (Array.isArray(ans) && ans.length === 0)
            )
        })

        if (unanswered.length > 0) {
            alert('Ответьте на все обязательные вопросы!')
            return
        }

        submitting.value = true

        try {
            // 1. Создаём response
            const { data: responseData, error: responseError } = await supabase
                .from('responses')
                .insert({
                    survey_id: route.params.id,
                    submitted_at: new Date().toISOString()
                })
                .select('id')
                .single()

            if (responseError) throw responseError

            const responseId = responseData.id

            // 2. Собираем ответы
            const answersToInsert = []

            for (const q of questions.value) {
                const answer = responses.value[q.id]

                if (answer === null || (Array.isArray(answer) && answer.length === 0)) continue

                if (q.question_type === 'multiple') {
                    answer.forEach(choiceId => {
                        answersToInsert.push({
                            response_id: responseId,
                            question_id: q.id,
                            choice_id: choiceId
                        })
                    })
                } else {
                    const answerRow = {
                        response_id: responseId,
                        question_id: q.id
                    }

                    if (q.question_type === 'single') answerRow.choice_id = answer
                    if (q.question_type === 'text') answerRow.text_answer = answer
                    if (q.question_type === 'scale') answerRow.scale_value = parseInt(answer, 10)

                    answersToInsert.push(answerRow)
                }
            }

            if (answersToInsert.length > 0) {
                const { error: answersError } = await supabase
                    .from('answers')
                    .insert(answersToInsert)

                if (answersError) throw answersError
            }

            // Подсчёт правильных (для результатов)
            let correct = 0
            questions.value.forEach(q => {
                if (q.question_type === 'single') {
                    const userChoice = responses.value[q.id]
                    const correctChoice = q.choices.find(c => c.is_correct)
                    if (userChoice && correctChoice && userChoice === correctChoice.id) correct++
                } else if (q.question_type === 'multiple') {
                    const userChoices = responses.value[q.id] || []
                    const correctChoices = q.choices.filter(c => c.is_correct).map(c => c.id)
                    if (correctChoices.length > 0 && userChoices.length === correctChoices.length &&
                        userChoices.every(id => correctChoices.includes(id))) correct++
                }
            })

            // Сохраняем в Pinia для страницы результатов
            store.saveLastResponses(
                responses.value,
                route.params.id,
                correct,
                questions.value.length,
                survey.value.title
            )

            alert('Спасибо за прохождение опроса!')
            router.push(`/results/${route.params.id}`)
        } catch (err) {
            console.error('Ошибка отправки:', err)
            alert('Не удалось отправить ответы: ' + (err.message || 'Неизвестная ошибка'))
        } finally {
            submitting.value = false
        }
    }
</script>
<template>
    <div class="container my-5">
        <h1 class="mb-4 text-primary fw-bold">{{ survey.title || 'Прохождение опроса' }}</h1>

        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
            <p class="mt-3 text-muted">Подгружаем вопросы, подождите...</p>
        </div>

        <div v-else-if="error" class="alert alert-danger shadow-sm text-center">
            <i class="bi bi-exclamation-triangle me-2"></i> {{ error }}
        </div>

        <div v-else>
            <p class="lead mb-5 text-secondary">{{ survey.description || 'Пожалуйста, ответьте на вопросы ниже.' }}</p>

            <form @submit.prevent="submitResponses">
                <div v-for="(question, index) in questions" :key="question.id" class="card shadow-sm border-0 mb-4">
                    <div class="card-body p-4">
                        <h5 class="card-title mb-4">
                            <span class="badge bg-primary me-2">{{ index + 1 }}</span>
                            {{ question.text }}
                            <span v-if="question.required" class="text-danger">*</span>
                        </h5>

                        <div v-if="question.question_type === 'single' || question.question_type === 'radio'" class="mb-3">
                            <div class="form-check custom-radio" v-for="choice in question.choices" :key="choice.id">
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

                        <div v-else-if="question.question_type === 'multiple' || question.question_type === 'checkbox'" class="mb-3">
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
                            <input type="range"
                                   class="form-range"
                                   min="1"
                                   max="10"
                                   v-model.number="responses[question.id]" />
                            <div class="d-flex justify-content-between px-2 text-muted small">
                                <span>1</span>
                                <span class="fw-bold text-primary fs-5">{{ responses[question.id] || 5 }}</span>
                                <span>10</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-grid gap-2 mt-5">
                    <button type="submit"
                            class="btn btn-success btn-lg shadow"
                            :disabled="submitting || loading">
                        <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                        {{ submitting ? 'Сохранение...' : 'Завершить и посмотреть результат' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'
    import { useSurveyStore } from '../stores/survey'

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
            error.value = 'ID опроса не найден'
            loading.value = false
            return
        }

        try {
            // 1. Загружаем данные опроса
            const { data: sData, error: sErr } = await supabase
                .from('surveys')
                .select('*')
                .eq('id', surveyId)
                .single()
            if (sErr) throw sErr
            survey.value = sData

            // 2. Загружаем вопросы и варианты ответов
            const { data: qData, error: qErr } = await supabase
                .from('questions')
                .select(`
        id, text, question_type, order, required,
        choices (id, text, is_correct)
      `)
                .eq('survey_id', surveyId)
                .order('order')
            if (qErr) throw qErr
            questions.value = qData

            // Инициализируем реактивные поля для ответов
            questions.value.forEach(q => {
                if (q.question_type === 'multiple' || q.question_type === 'checkbox') {
                    responses.value[q.id] = []
                } else if (q.question_type === 'scale') {
                    responses.value[q.id] = 5
                } else {
                    responses.value[q.id] = null
                }
            })
        } catch (err) {
            console.error(err)
            error.value = 'Ошибка загрузки: ' + err.message
        } finally {
            loading.value = false
        }
    })

    // === ЭТОТ БЛОК ЗАМЕНИ ЦЕЛИКОМ ===
    const submitResponses = async () => {
        if (submitting.value) return
        submitting.value = true

        const surveyId = route.params.id

        try {
            // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
            // Получаем текущую сессию пользователя
            const { data: { session } } = await supabase.auth.getSession()
            // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

            // Создаём прохождение с user_id
            const { data: rData, error: rErr } = await supabase
                .from('responses')
                .insert({
                    survey_id: surveyId,
                    user_id: session?.user?.id || null,   // ← вот сюда вставляется user_id
                    submitted_at: new Date().toISOString()
                })
                .select('id')
                .single()

            if (rErr) throw rErr

            const responseId = rData.id

            // ... остальной код с answersToInsert остаётся как был ...

            const answersToInsert = []

            questions.value.forEach(q => {
                const userVal = responses.value[q.id]
                if (userVal === null || (Array.isArray(userVal) && userVal.length === 0)) return

                if (q.question_type === 'single' || q.question_type === 'radio') {
                    answersToInsert.push({
                        response_id: responseId,
                        question_id: q.id,
                        choice_id: userVal,
                        text_answer: q.choices.find(c => c.id === userVal)?.text || null
                    })
                }
                else if (q.question_type === 'multiple' || q.question_type === 'checkbox') {
                    userVal.forEach(cid => {
                        answersToInsert.push({
                            response_id: responseId,
                            question_id: q.id,
                            choice_id: cid,
                            text_answer: q.choices.find(c => c.id === cid)?.text || null
                        })
                    })
                }
                else if (q.question_type === 'text') {
                    answersToInsert.push({
                        response_id: responseId,
                        question_id: q.id,
                        text_answer: userVal
                    })
                }
                else if (q.question_type === 'scale') {
                    answersToInsert.push({
                        response_id: responseId,
                        question_id: q.id,
                        scale_value: parseInt(userVal),
                        text_answer: String(userVal)
                    })
                }
            })

            if (answersToInsert.length > 0) {
                const { error: aErr } = await supabase.from('answers').insert(answersToInsert)
                if (aErr) throw aErr
            }

            // Переходим на страницу результатов
            router.push(`/my-results/${responseId}`)   // ← важно: передаём responseId, а не surveyId

        } catch (err) {
            console.error(err)
            alert('Ошибка при сохранении: ' + err.message)
        } finally {
            submitting.value = false
        }
    }
</script>

<style scoped>
    .card {
        transition: transform 0.2s ease;
    }

        .card:hover {
            transform: translateY(-5px);
        }

    .form-check-input:checked {
        background-color: #0d6efd;
        border-color: #0d6efd;
    }
</style>
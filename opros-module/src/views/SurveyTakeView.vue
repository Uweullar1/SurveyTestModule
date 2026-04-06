<template>
    <div class="survey-taking-page">
        <div class="progress-container sticky-top shadow-sm">
            <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <div class="container py-5" style="max-width: 850px;">
            <div class="mb-5 text-center">
                <h1 class="display-5 fw-bold survey-main-title">{{ survey.title || 'Прохождение опроса' }}</h1>
                <p class="lead text-secondary">{{ survey.description || 'Пожалуйста, ответьте на вопросы ниже.' }}</p>
            </div>

            <div v-if="loading" class="text-center my-5">
                <div class="spinner-border text-dark" role="status"></div>
                <p class="mt-3">Загрузка вопросов...</p>
            </div>

            <div v-else-if="error" class="alert alert-danger shadow-sm text-center">
                <i class="bi bi-exclamation-triangle me-2"></i> {{ error }}
            </div>

            <div v-else>
                <form @submit.prevent="submitResponses">
                    <div v-for="(question, index) in questions" :key="question.id" class="question-block">
                        <div class="question-header">
                            <span class="question-number">{{ index + 1 }}</span>
                            <h3 class="question-text m-0">
                                {{ question.text }}
                                <span v-if="question.required" class="text-danger small">*</span>
                            </h3>
                        </div>

                        <div v-if="question.question_type === 'single' || question.question_type === 'radio'" class="options-list">
                            <div v-for="choice in question.choices" :key="choice.id" class="option-item">
                                <input type="radio"
                                       :id="`choice-${choice.id}`"
                                       :name="`q-${question.id}`"
                                       v-model="responses[question.id]"
                                       :value="choice.id"
                                       class="hidden-input"
                                       :required="question.required" />
                                <label :for="`choice-${choice.id}`" class="option-label">
                                    <span class="indicator radio-indicator"></span>
                                    {{ choice.text }}
                                </label>
                            </div>
                        </div>

                        <div v-else-if="question.question_type === 'multiple' || question.question_type === 'checkbox'" class="options-list">
                            <div v-for="choice in question.choices" :key="choice.id" class="option-item">
                                <input type="checkbox"
                                       :id="`choice-${choice.id}`"
                                       v-model="responses[question.id]"
                                       :value="choice.id"
                                       class="hidden-input" />
                                <label :for="`choice-${choice.id}`" class="option-label">
                                    <span class="indicator check-indicator"></span>
                                    {{ choice.text }}
                                </label>
                            </div>
                        </div>

                        <div v-else-if="question.question_type === 'text'" class="mt-3">
                            <textarea v-model="responses[question.id]"
                                      class="form-control custom-textarea"
                                      rows="3"
                                      :required="question.required"
                                      placeholder="Введите ваш ответ..."></textarea>
                        </div>

                        <div v-else-if="question.question_type === 'scale'" class="mt-3">
                            <div class="scale-wrapper">
                                <div class="scale-buttons">
                                    <button v-for="num in 10" :key="num"
                                            type="button"
                                            class="scale-btn"
                                            :class="{ active: responses[question.id] === num }"
                                            @click="responses[question.id] = num">
                                        {{ num }}
                                    </button>
                                </div>
                                <div class="scale-labels">
                                    <span>Совсем плохо</span>
                                    <span>Отлично</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="submit-section">
                        <button type="submit" class="btn-finish" :disabled="submitting">
                            {{ submitting ? 'Сохранение...' : 'Завершить прохождение' }}
                        </button>
                        <p class="text-muted mt-3">Все ответы будут сохранены автоматически в истории</p>
                    </div>
                </form>
            </div>
        </div>

    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const route = useRoute()
    const router = useRouter()

    const survey = ref({})
    const questions = ref([])
    const responses = ref({})
    const submitting = ref(false)
    const loading = ref(true)
    const error = ref(null)

    // Проверка: если пользователь не авторизован — сразу отправляем на логин
    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            alert('Для прохождения опроса необходимо войти в аккаунт')
            router.push('/login')
            return false
        }
        return true
    }

    // Проверка ограничения по количеству прохождений
    const checkMaxResponsesLimit = async (surveyId) => {
        if (!surveyId) return true

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user?.id) return true

            const { count, error } = await supabase
                .from('responses')
                .select('*', { count: 'exact', head: true })
                .eq('survey_id', surveyId)
                .eq('user_id', session.user.id)

            if (error) {
                console.error("Ошибка проверки лимита:", error)
                return true
            }

            const currentAttempts = count || 0
            const maxAllowed = survey.value.max_responses || 0

            if (maxAllowed > 0 && currentAttempts >= maxAllowed) {
                alert(`Вы уже прошли этот опрос максимальное количество раз (${maxAllowed}).`)
                router.push('/my-history')
                return false
            }
            return true
        } catch (err) {
            console.error(err)
            return true
        }
    }

    onMounted(async () => {
    const surveyId = route.params.id
    if (!surveyId) {
        error.value = 'ID опроса не найден'
        loading.value = false
        return
    }

    // 1. Проверяем авторизацию
    const isAuthenticated = await checkAuth()
    if (!isAuthenticated) return

    try {
        // Загружаем опрос
        const { data, error: sErr } = await supabase
            .from('surveys')
            .select('*, user_id, questions(*, choices(*))')
            .eq('id', surveyId)
            .single()

        if (sErr) throw sErr
        if (!data) throw new Error('Опрос не найден')

        survey.value = data

        // === УВЕДОМЛЕНИЕ О ЗАКРЫТИИ ОПРОСА ===
        if (data.is_closed) {
            const { data: { user } } = await supabase.auth.getUser()
            const isCreator = user && user.id === data.user_id

            if (!isCreator) {
                // Красивое уведомление для обычных пользователей
                const closedMessage = `
                    <div style="text-align: center; padding: 20px;">
                        <h2 style="color: #DF2935; margin-bottom: 15px;">⛔ Опрос закрыт</h2>
                        <p style="font-size: 1.1rem; color: #212844;">
                            Автор закрыл этот опрос.<br>
                            Прохождение больше недоступно.
                        </p>
                    </div>
                `
                alert('Этот опрос был закрыт автором и недоступен для прохождения.')
                // Можно заменить на более красивый модальный диалог позже
                router.push('/')
                return
            } else {
                // Для создателя — мягкое уведомление
                alert('Этот опрос закрыт. Его могут видеть только вы.')
            }
        }

        // 2. Проверка лимита прохождений
        const canProceed = await checkMaxResponsesLimit(surveyId)
        if (!canProceed) return

        // 3. Загружаем вопросы
        const { data: qData, error: qErr } = await supabase
            .from('questions')
            .select(`
                id, text, question_type, order, required,
                choices (id, text, is_correct)
            `)
            .eq('survey_id', surveyId)
            .order('order')

        if (qErr) throw qErr

        questions.value = qData || []

        // Инициализация ответов
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
        error.value = 'Ошибка загрузки опроса: ' + (err.message || 'Неизвестная ошибка')
    } finally {
        loading.value = false
    }
})

    const submitResponses = async () => {
        if (submitting.value) return
        submitting.value = true

        const surveyId = route.params.id

        try {
            const { data: { session } } = await supabase.auth.getSession()

            const { data: rData, error: rErr } = await supabase
                .from('responses')
                .insert({
                    survey_id: surveyId,
                    user_id: session?.user?.id || null,
                    submitted_at: new Date().toISOString()
                })
                .select('id')
                .single()

            if (rErr) throw rErr

            const responseId = rData.id

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
                } else if (q.question_type === 'multiple' || q.question_type === 'checkbox') {
                    userVal.forEach(cid => {
                        answersToInsert.push({
                            response_id: responseId,
                            question_id: q.id,
                            choice_id: cid,
                            text_answer: q.choices.find(c => c.id === cid)?.text || null
                        })
                    })
                } else if (q.question_type === 'text') {
                    answersToInsert.push({
                        response_id: responseId,
                        question_id: q.id,
                        text_answer: userVal
                    })
                } else if (q.question_type === 'scale') {
                    answersToInsert.push({
                        response_id: responseId,
                        question_id: q.id,
                        scale_value: parseInt(userVal) || 0,
                        text_answer: String(userVal)
                    })
                }
            })

            if (answersToInsert.length > 0) {
                const { error: aErr } = await supabase.from('answers').insert(answersToInsert)
                if (aErr) throw aErr
            }

            router.push(`/my-results/${responseId}`)

        } catch (err) {
            console.error("Ошибка при submitResponses:", err)
            alert('Ошибка при сохранении: ' + (err.message || 'Неизвестная ошибка'))
        } finally {
            submitting.value = false
        }
    }
</script>

<style scoped>
    .survey-taking-page {
        background-color: #FDFDF1; /* Крем */
        min-height: 100vh;
    }

    .progress-container {
        height: 6px;
        background: rgba(255, 255, 255, 0.5);
        z-index: 1000;
    }

    .progress-bar {
        height: 100%;
        background-color: #F2C4CE; /* Розовый */
        transition: width 0.3s ease;
    }

    .survey-main-title {
        color: #212844;
    }

    /* Блок вопроса */
    .question-block {
        padding: 3rem 0; /* Больше отступа, чтобы вопросы не слипались */
        border-bottom: 1px solid rgba(33, 40, 68, 0.1);
    }

    /* Шапка вопроса: ИСПРАВЛЕНИЕ, чтобы текст не съезжал */
    .question-header {
        display: flex;
        align-items: center; /* Центрируем номер и текст по вертикали */
        margin-bottom: 2rem; /* Отступ до вариантов ответов */
    }

    .question-number {
        background-color: #212844;
        color: #F2C4CE;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.95rem;
        margin-right: 15px; /* Вот этот отступ отодвигает текст */
        flex-shrink: 0; /* Чтобы номер не сжимался */
    }

    .question-text {
        color: #212844;
        font-weight: 700;
        font-size: 1.4rem;
        line-height: 1.2;
    }

    /* Опции выбора */
    .options-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .hidden-input {
        position: absolute;
        opacity: 0;
        width: 0;
    }

    .option-label {
        display: flex;
        align-items: center;
        padding: 14px 20px;
        border: 2px solid rgba(33, 40, 68, 0.1);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        background: rgba(255, 255, 255, 0.3);
        color: #212844;
    }

        .option-label:hover {
            background: rgba(255, 255, 255, 0.6);
            border-color: #F2C4CE;
        }

    .hidden-input:checked + .option-label {
        background-color: #212844;
        color: #F2C4CE;
        border-color: #212844;
    }

    .indicator {
        width: 18px;
        height: 18px;
        border: 2px solid currentColor;
        margin-right: 12px;
        flex-shrink: 0;
    }

    .radio-indicator {
        border-radius: 50%;
    }

    .check-indicator {
        border-radius: 4px;
    }

    /* Шкала */
    .scale-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center; /* Центрируем всё содержимое внутри wrapper */
        margin-top: 1rem;
        width: 100%;
    }

    .scale-buttons {
        display: flex;
        flex-direction: row;
        justify-content: center; /* Центрируем кнопки */
        gap: 10px;
        margin-bottom: 10px;
    }

    .scale-btn {
        width: 45px;
        height: 45px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 2px solid rgba(33, 40, 68, 0.2);
        color: #212844;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
    }

        .scale-btn.active {
            background: #212844;
            color: #F2C4CE;
            border-color: #212844;
        }

    .scale-labels {
        display: flex;
        justify-content: space-between;
        width: 100%;
        max-width: 540px; /* Равно ширине ряда кнопок (10*45 + 9*10) */
        color: #6c757d;
        font-size: 0.85rem;
    }

    /* Поле текста */
    .custom-textarea {
        width: 100%; /* Принудительно на всю ширину */
        max-width: 600px; /* Ограничим, чтобы не было "колбасой" */
        border: 2px solid rgba(33, 40, 68, 0.2);
        border-radius: 12px;
        padding: 15px;
        background: transparent;
        color: #212844;
    }

        .custom-textarea:focus {
            border-color: #F2C4CE;
            box-shadow: none;
            background-color: #ffffff;
        }


    .submit-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4rem 0;
    }


    /* Кнопка */
    .btn-finish {
        background-color: #212844;
        color: #F2C4CE;
        border: none;
        border-radius: 18px;
        padding: 20px 60px;
        font-weight: 700;
        font-size: 1.2rem;
        transition: all 0.3s ease;
    }

        .btn-finish:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(33, 40, 68, 0.2);
            background-color: #2d365a;
        }
</style>
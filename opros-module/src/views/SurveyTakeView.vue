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
                                      maxlength="500"
                                      :required="question.required"
                                      placeholder="Введите ваш ответ..."></textarea>

                            <!-- Текстовый вопрос -->

                                <!-- Если это телефон (определяем по ключевому слову в тексте вопроса) -->
                                <div v-if="isPhoneQuestion(question)" class="phone-input-wrapper">
                                    <input v-model="responses[question.id]"
                                           type="tel"
                                           class="form-control custom-input"
                                           placeholder="+7 (___) ___-__-__"
                                           maxlength="18"
                                           @input="formatPhoneInput(question.id)"
                                           :required="question.required" />
                                </div>

                                <!-- Если это email -->
                                <div v-else-if="isEmailQuestion(question)" class="email-input-wrapper">
                                    <input v-model="responses[question.id]"
                                           type="email"
                                           class="form-control custom-input"
                                           placeholder="example@mail.ru"
                                           :required="question.required" />
                                </div>

                                <!-- Обычный текст -->
                                <div v-else>
                                    <textarea v-model="responses[question.id]"
                                              class="form-control custom-textarea"
                                              rows="3"
                                              maxlength="500"
                                              :required="question.required"
                                              placeholder="Введите ваш ответ..."></textarea>
                                    <div class="text-end small text-muted mt-1">
                                        {{ (responses[question.id] || '').length }}/500
                                    </div>
                                </div>

                            <div class="text-end small text-muted mt-1">
                                {{ (responses[question.id] || '').length }}/500
                            </div>
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
    import { ref, onMounted, watch } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'
    import { notificationsService } from '../utils/notifications'

    const route = useRoute()
    const router = useRouter()

    const STORAGE_KEY = 'survey_draft'

    const survey = ref({})
    const questions = ref([])
    const responses = ref({})
    const submitting = ref(false)
    const loading = ref(true)
    const error = ref(null)


    // Проверка, является ли вопрос телефоном
    const isPhoneQuestion = (question) => {
        const text = question.text?.toLowerCase() || ''
        return text.includes('телефон') || text.includes('номер телефона') || text.includes('контактный номер')
    }

    // Проверка, является ли вопрос email
    const isEmailQuestion = (question) => {
        const text = question.text?.toLowerCase() || ''
        return text.includes('почта') || text.includes('email') || text.includes('e-mail') || text.includes('адрес почты')
    }

    // Форматирование телефона при вводе
    const formatPhoneInput = (questionId) => {
        let value = responses[questionId] || ''

        // Убираем всё кроме цифр
        let numbers = value.replace(/\D/g, '')

        // Ограничиваем 11 цифрами (российский номер)
        if (numbers.length > 11) numbers = numbers.slice(0, 11)

        // Форматируем
        let formatted = '+7'
        if (numbers.length > 1) formatted += ' (' + numbers.slice(1, 4)
        if (numbers.length >= 4) formatted += ') ' + numbers.slice(4, 7)
        if (numbers.length >= 7) formatted += '-' + numbers.slice(7, 9)
        if (numbers.length >= 9) formatted += '-' + numbers.slice(9, 11)

        responses[questionId] = formatted
    }

    // Валидация перед отправкой
    const validateForm = () => {
        for (const question of questions.value) {
            const answer = responses[question.id]

            if (question.required && !answer) {
                alert(`Вопрос "${question.text}" обязателен для ответа`)
                return false
            }

            // Валидация email
            if (isEmailQuestion(question) && answer) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(answer)) {
                    alert('Пожалуйста, введите корректный email')
                    return false
                }
            }

            // Валидация телефона
            if (isPhoneQuestion(question) && answer) {
                const numbers = answer.replace(/\D/g, '')
                if (numbers.length < 11) {
                    alert('Пожалуйста, введите полный номер телефона')
                    return false
                }
            }
        }
        return true
    }

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            alert('Для прохождения опроса необходимо войти в аккаунт')
            router.push('/login')
            return false
        }
        return true
    }

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
            if (error) return true
            const maxAllowed = survey.value.max_responses || 0
            if (maxAllowed > 0 && (count || 0) >= maxAllowed) {
                alert(`Вы уже прошли этот опрос максимальное количество раз (${maxAllowed}).`)
                router.push('/my-history')
                return false
            }
            return true
        } catch (err) { return true }
    }

    onMounted(async () => {
        const surveyId = route.params.id
        if (!surveyId) { error.value = 'ID опроса не найден'; loading.value = false; return }

        const isAuthenticated = await checkAuth()
        if (!isAuthenticated) return

        try {
            const { data, error: sErr } = await supabase
                .from('surveys').select('*').eq('id', surveyId).single()
            if (sErr) throw sErr
            if (!data) throw new Error('Опрос не найден')
            survey.value = data

            if (survey.value.is_private) {
               
            }

            if (data.is_closed) {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user || user.id !== data.user_id) {
                    alert('Этот опрос закрыт автором и недоступен для прохождения.')
                    router.push('/')
                    return
                }
            }

            if (data.expires_at && new Date() > new Date(data.expires_at)) {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user || user.id !== data.user_id) {
                    alert('Срок прохождения этого опроса истёк.')
                    router.push('/')
                    return
                }
            }

            const canProceed = await checkMaxResponsesLimit(surveyId)
            if (!canProceed) return

            const { data: qData, error: qErr } = await supabase
                .from('questions')
                .select(`id, text, question_type, order, required, choices (id, text, is_correct)`)
                .eq('survey_id', surveyId)
                .order('order')
            if (qErr) throw qErr
            questions.value = qData || []

            // Проверяем черновик ДО инициализации
            const draftKey = `${STORAGE_KEY}_${surveyId}`
            const draftData = localStorage.getItem(draftKey)
            let draftObj = null

            if (draftData) {
                try { draftObj = JSON.parse(draftData) } catch { }
            }

            const hasRealAnswers = draftObj && Object.values(draftObj).some(v =>
                v !== null && v !== 5 && !(Array.isArray(v) && v.length === 0)
            )

            if (hasRealAnswers) {
                const confirmed = confirm('У вас есть незавершенное прохождение. Продолжить?')
                if (confirmed) {
                    // Восстанавливаем ответы
                    Object.keys(draftObj).forEach(key => {
                        responses.value[key] = draftObj[key]
                    })
                    // Дополняем недостающие ответы для новых вопросов
                    questions.value.forEach(q => {
                        if (!(q.id in responses.value)) {
                            responses.value[q.id] = q.question_type === 'checkbox' || q.question_type === 'multiple' ? [] :
                                q.question_type === 'scale' ? 5 : null
                        }
                    })
                    loading.value = false
                    return // ← выходим, не перезаписываем ответы
                }
            }

            // Обычная инициализация
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
            error.value = 'Ошибка загрузки опроса: ' + err.message
        } finally {
            loading.value = false
        }
    })

    const submitResponses = async () => {
        if (submitting.value) return
        submitting.value = true

        for (const q of questions.value) {
            if (q.required) {
                const val = responses.value[q.id]
                if (!val || (Array.isArray(val) && val.length === 0)) {
                    alert(`Вопрос "${q.text}" обязателен для ответа.`)
                    submitting.value = false
                    return
                }
            }
        }

        const surveyId = route.params.id
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const { data: rData, error: rErr } = await supabase
                .from('responses')
                .insert({ survey_id: surveyId, user_id: session?.user?.id || null, submitted_at: new Date().toISOString() })
                .select('id').single()
            if (rErr) throw rErr

            const responseId = rData.id
            const answersToInsert = []

            questions.value.forEach(q => {
                const userVal = responses.value[q.id]
                if (userVal === null || (Array.isArray(userVal) && userVal.length === 0)) return
                if (q.question_type === 'single' || q.question_type === 'radio') {
                    answersToInsert.push({ response_id: responseId, question_id: q.id, choice_id: userVal, text_answer: q.choices.find(c => c.id === userVal)?.text || null })
                } else if (q.question_type === 'multiple' || q.question_type === 'checkbox') {
                    userVal.forEach(cid => {
                        answersToInsert.push({ response_id: responseId, question_id: q.id, choice_id: cid, text_answer: q.choices.find(c => c.id === cid)?.text || null })
                    })
                } else if (q.question_type === 'text') {
                    answersToInsert.push({ response_id: responseId, question_id: q.id, text_answer: userVal })
                } else if (q.question_type === 'scale') {
                    answersToInsert.push({ response_id: responseId, question_id: q.id, scale_value: parseInt(userVal) || 0, text_answer: String(userVal) })
                }
            })

            if (answersToInsert.length > 0) {
                const { error: aErr } = await supabase.from('answers').insert(answersToInsert)
                if (aErr) throw aErr
            }

            localStorage.removeItem(`${STORAGE_KEY}_${surveyId}`)

            const ANKETA_ID = 'f4bb9a82-31d2-4b53-bf7c-48d814bca84c'

            // === АНКЕТА КАНДИДАТА ===
            if (surveyId === ANKETA_ID) {
                await supabase.from('profiles').update({ education_completed: true }).eq('id', session.user.id)

                // Уведомление кандидату
                await notificationsService.send(session.user.id, 'Анкета отправлена!', {
                    message: 'Ваша анкета будет рассмотрена в течение 3 рабочих дней. Мы свяжемся с вами.',
                    icon: '📋',
                    link: '/'
                })

                // Уведомление всем создателям и админам
                const { data: creators } = await supabase.from('profiles').select('id').eq('can_create', true)
                const { data: admins } = await supabase.from('admins').select('user_id')
                const notifyIds = new Set()
                creators?.forEach(c => notifyIds.add(c.id))
                admins?.forEach(a => notifyIds.add(a.user_id))

                for (const userId of notifyIds) {
                    if (userId !== session?.user?.id) {
                        await notificationsService.send(userId, 'Новая анкета кандидата', {
                            message: 'Кандидат заполнил анкету. Требуется проверка.',
                            icon: '📋',
                            link: `/results/${ANKETA_ID}/admin`
                        })
                    }
                }

                alert('Анкета отправлена! Ожидайте дальнейших инструкций.')
                router.push('/')
                return
            }

            // === ОПРОСЫ ДЛЯ СТАЖЕРОВ ===
            if (survey.value.is_for_interns && survey.value.department_id) {
                const { data: internSurveys } = await supabase
                    .from('surveys')
                    .select('id')
                    .eq('department_id', survey.value.department_id)
                    .eq('is_for_interns', true)

                const internSurveyIds = (internSurveys || []).map(s => s.id)
                const { data: passedAll } = await supabase
                    .from('responses')
                    .select('survey_id')
                    .eq('user_id', session.user.id)
                    .in('survey_id', internSurveyIds)

                const passedIds = [...new Set((passedAll || []).map(r => r.survey_id))]

                if (passedIds.length === internSurveyIds.length && internSurveyIds.length > 0) {
                    await notificationsService.send(session.user.id, 'Все тесты пройдены!', {
                        message: 'Ваши ответы проверят в течение 3 рабочих дней. Мы свяжемся с вами.',
                        icon: '✅',
                        link: '/my-history'
                    })

                    const { data: deptCreators } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('department_id', survey.value.department_id)
                        .eq('can_create', true)

                    if (deptCreators) {
                        for (const creator of deptCreators) {
                            await notificationsService.send(creator.id, 'Стажер завершил все тесты', {
                                message: 'Кандидат прошел все опросы стажировки. Требуется проверка.',
                                icon: '🎓',
                                link: `/results/${surveyId}/admin`
                            })
                        }
                    }
                }
            }

            // === УВЕДОМЛЕНИЕ АДМИНАМ О ПРОХОЖДЕНИИ ===
            const { data: admins } = await supabase.from('admins').select('user_id')
            if (admins) {
                for (const admin of admins) {
                    if (admin.user_id !== session?.user?.id) {
                        await notificationsService.send(admin.user_id, 'Новое прохождение опроса', {
                            message: `Пользователь прошел опрос "${survey.value.title}"`,
                            icon: '📋',
                            link: `/results/${surveyId}/admin`
                        })
                    }
                }
            }

            // === ТЕКСТОВЫЕ ВОПРОСЫ ===
            const hasTextQuestions = questions.value.some(q => q.question_type === 'text')
            if (hasTextQuestions && session?.user?.id !== survey.value.user_id) {
                await notificationsService.send(survey.value.user_id, 'Требуется проверка ответов', {
                    message: `Новые ответы в опросе "${survey.value.title}"`,
                    icon: '🔍',
                    link: `/results/${surveyId}/admin`
                })
            }

            // === РЕДИРЕКТ ===
            if (survey.value.is_survey) {
                alert('Спасибо за прохождение опроса!')
                router.push('/my-history')
            } else {
                router.push(`/my-results/${responseId}`)
            }


        } catch (err) {
            console.error("Ошибка при submitResponses:", err)
            alert('Ошибка при сохранении: ' + err.message)
        } finally {
            submitting.value = false
        }
    }

    watch(responses, (newVal) => {
        const surveyId = route.params.id
        if (!surveyId) return
        const key = `${STORAGE_KEY}_${surveyId}`
        const hasAnswers = Object.values(newVal).some(v =>
            v !== null && v !== 5 && !(Array.isArray(v) && v.length === 0)
        )
        if (hasAnswers) {
            localStorage.setItem(key, JSON.stringify(newVal))
        }
    }, { deep: true })
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

    @media (max-width: 600px) {
        .scale-buttons {
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
        }

        .scale-btn {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
            border-radius: 8px;
        }

        .scale-labels {
            font-size: 0.7rem;
            padding: 0;
        }

        .question-text {
            font-size: 1.1rem;
        }

        .btn-finish {
            padding: 16px 40px;
            font-size: 1rem;
        }

        .container {
            padding-left: 12px;
            padding-right: 12px;
        }
    }

    .phone-input-wrapper,
    .email-input-wrapper {
        position: relative;
    }

        .phone-input-wrapper::before {
            content: '📱';
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.1rem;
            z-index: 2;
        }

        .email-input-wrapper::before {
            content: '📧';
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.1rem;
            z-index: 2;
        }

    .custom-input {
        width: 100%;
        padding: 14px 16px 14px 44px;
        border: 2px solid #dee2e6;
        border-radius: 14px;
        font-size: 1rem;
        font-weight: 500;
        color: #212844;
        background: white;
        transition: border-color 0.2s;
    }

        .custom-input:focus {
            outline: none;
            border-color: #212844;
        }

    .custom-textarea {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #dee2e6;
        border-radius: 14px;
        font-size: 1rem;
        color: #212844;
        background: white;
        resize: vertical;
        min-height: 80px;
        font-family: inherit;
    }

        .custom-textarea:focus {
            outline: none;
            border-color: #212844;
        }
</style>
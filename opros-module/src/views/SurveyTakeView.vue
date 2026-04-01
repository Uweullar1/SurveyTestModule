<template>
    <div class="take-container">
        <div v-if="loading" class="status-message">
            <div class="spinner"></div>
            <p>Загрузка опроса...</p>
        </div>

        <div v-else-if="error" class="status-message error-box">
            <h2>Упс! Ошибка</h2>
            <p>{{ error }}</p>
            <router-link to="/" class="btn-tool">Вернуться на главную</router-link>
        </div>

        <div v-else-if="survey" class="survey-content">
            <header class="survey-header">
                <h1 class="main-title">{{ survey.title }}</h1>
                <div class="title-underline"></div>
                <p v-if="survey.description" class="survey-desc">{{ survey.description }}</p>
            </header>

            <form @submit.prevent="submitResponses" class="questions-form">
                <div v-for="(q, idx) in questions" :key="q.id" class="question-block">
                    <h3 class="question-text">
                        <span class="q-num">{{ idx + 1 }}.</span> {{ q.text }}
                    </h3>

                    <div v-if="q.question_type === 'radio'" class="options-list">
                        <label v-for="c in q.choices" :key="c.id" class="option-item" :class="{ 'active-opt': responses[q.id] === c.id }">
                            <input type="radio" :value="c.id" v-model="responses[q.id]" class="hidden-input">
                            <span class="custom-radio"></span>
                            {{ c.text }}
                        </label>
                    </div>

                    <div v-else-if="q.question_type === 'checkbox'" class="options-list">
                        <label v-for="c in q.choices" :key="c.id" class="option-item" :class="{ 'active-opt': responses[q.id]?.includes(c.id) }">
                            <input type="checkbox" :value="c.id" v-model="responses[q.id]" class="hidden-input">
                            <span class="custom-checkbox"></span>
                            {{ c.text }}
                        </label>
                    </div>

                    <div v-else-if="q.question_type === 'scale'" class="scale-wrapper">
                        <div class="scale-grid">
                            <label v-for="n in 10" :key="n" class="scale-node">
                                <input type="radio" :value="n" v-model="responses[q.id]" class="hidden-input">
                                <span class="scale-circle" :class="{ 'selected': responses[q.id] === n }">{{ n }}</span>
                            </label>
                        </div>
                        <div class="scale-labels">
                            <span>Минимум</span>
                            <span>Максимум</span>
                        </div>
                    </div>

                    <div v-else-if="q.question_type === 'text'" class="text-answer">
                        <textarea v-model="responses[q.id]" placeholder="Введите ваш ответ..." class="minimal-textarea"></textarea>
                    </div>
                </div>

                <div class="form-footer">
                    <button type="submit" class="btn-submit" :disabled="submitting">
                        {{ submitting ? 'Отправка...' : 'Завершить опрос' }}
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

    const route = useRoute()
    const router = useRouter()
    const survey = ref(null)
    const questions = ref([])
    const responses = ref({})
    const loading = ref(true)
    const submitting = ref(false)
    const error = ref(null)
    const user = ref(null)

    onMounted(async () => {
        // Получаем сессию пользователя
        const { data: { session } } = await supabase.auth.getSession()
        user.value = session?.user ?? null

        const surveyId = route.params.id
        if (!surveyId) {
            error.value = "ID опроса не указан"
            loading.value = false
            return
        }

        try {
            const { data: sData, error: sErr } = await supabase
                .from('surveys')
                .select('*')
                .eq('id', surveyId)
                .single()

            if (sErr) throw new Error("Опрос не найден")
            survey.value = sData

            const { data: qData, error: qErr } = await supabase
                .from('questions')
                .select('*')
                .eq('survey_id', surveyId)
                .order('order', { ascending: true })

            if (qErr) throw qErr

            const qIds = qData.map(q => q.id)
            const { data: cData, error: cErr } = await supabase
                .from('choices')
                .select('*')
                .in('question_id', qIds)
                .order('order', { ascending: true })

            if (cErr) throw cErr

            questions.value = qData.map(q => {
                // Инициализация моделей ответов
                if (q.question_type === 'checkbox') {
                    responses.value[q.id] = []
                } else {
                    responses.value[q.id] = null
                }

                return {
                    ...q,
                    choices: cData.filter(c => c.question_id === q.id)
                }
            })

        } catch (err) {
            console.error(err)
            error.value = err.message
        } finally {
            loading.value = false
        }
    })

    const submitResponses = async () => {
        if (!user.value) {
            alert("Пожалуйста, войдите в систему, чтобы отправить ответ.")
            return
        }

        submitting.value = true
        const surveyId = route.params.id

        try {
            // 1. Создаем запись в таблице responses
            const { data: responseData, error: responseErr } = await supabase
                .from('responses')
                .insert({
                    survey_id: surveyId,
                    user_id: user.value.id,
                    submitted_at: new Date().toISOString()
                })
                .select()
                .single()

            if (responseErr) throw responseErr
            const responseRecordId = responseData.id

            // 2. Формируем массив ответов
            const answersToInsert = questions.value.map(q => {
                const val = responses.value[q.id]
                const answerObj = {
                    response_id: responseRecordId,
                    question_id: q.id,
                    text_answer: null,
                    choice_id: null,
                    scale_value: null
                }

                if (q.question_type === 'radio' || q.question_type === 'select') {
                    answerObj.choice_id = val
                    // Сохраняем текст для истории
                    answerObj.text_answer = q.choices.find(c => c.id === val)?.text || null
                }
                else if (q.question_type === 'checkbox') {
                    answerObj.text_answer = JSON.stringify(val)
                    // Для чекбоксов choice_id обычно не заполняется в этой схеме, либо берется первый
                }
                else if (q.question_type === 'scale') {
                    answerObj.scale_value = parseInt(val)
                    answerObj.text_answer = String(val)
                }
                else {
                    answerObj.text_answer = val
                }

                return answerObj
            })

            // 3. Массовая вставка в таблицу answers
            const { error: answersErr } = await supabase
                .from('answers')
                .insert(answersToInsert)

            if (answersErr) throw answersErr

            // Перенаправляем на страницу результата, которую мы настроили
            router.push(`/my-results/${responseRecordId}`)

        } catch (err) {
            console.error("Ошибка сохранения:", err)
            alert("Ошибка: " + err.message)
        } finally {
            submitting.value = false
        }
    }
</script>

<style scoped>
    .take-container {
        max-width: 700px;
        margin: 0 auto;
        padding: 60px 20px;
        color: #212844;
    }

    .survey-header {
        margin-bottom: 60px;
        text-align: center;
    }

    .main-title {
        font-size: 2.5rem;
        font-weight: 800;
    }

    .title-underline {
        width: 60px;
        height: 5px;
        background: #212844;
        margin: 15px auto;
    }

    .survey-desc {
        opacity: 0.7;
        font-size: 1.1rem;
    }

    .question-block {
        margin-bottom: 80px;
    }

    .question-text {
        font-size: 1.4rem;
        font-weight: 700;
        margin-bottom: 25px;
    }

    .q-num {
        opacity: 0.3;
        margin-right: 10px;
    }

    /* Варианты ответов */
    .options-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .option-item {
        padding: 18px 25px;
        border: 2px solid rgba(33, 40, 68, 0.1);
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 15px;
        transition: all 0.2s ease;
        font-weight: 600;
    }

        .option-item:hover {
            border-color: #212844;
            background: rgba(33, 40, 68, 0.02);
        }

    .active-opt {
        border-color: #212844;
        background: #212844 !important;
        color: white;
    }

    .hidden-input {
        display: none;
    }

    /* Кастомные индикаторы */
    .custom-radio, .custom-checkbox {
        width: 18px;
        height: 18px;
        border: 2px solid currentColor;
        flex-shrink: 0;
    }

    .custom-radio {
        border-radius: 50%;
    }

    .custom-checkbox {
        border-radius: 4px;
    }

    /* Шкала */
    .scale-wrapper {
        background: #FDFDF1;
        padding: 30px;
        border-radius: 20px;
        border: 2px solid #212844;
    }

    .scale-grid {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
    }

    .scale-circle {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #212844;
        border-radius: 50%;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s;
    }

        .scale-circle:hover {
            background: rgba(33, 40, 68, 0.1);
        }

        .scale-circle.selected {
            background: #212844;
            color: white;
        }

    .scale-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        opacity: 0.6;
    }

    /* Текстовое поле */
    .minimal-textarea {
        width: 100%;
        min-height: 120px;
        background: transparent;
        border: 2px solid rgba(33, 40, 68, 0.1);
        border-radius: 12px;
        padding: 15px;
        font-family: inherit;
        font-size: 1rem;
        resize: vertical;
    }

        .minimal-textarea:focus {
            outline: none;
            border-color: #212844;
        }

    /* Кнопка отправки */
    .btn-submit {
        width: 100%;
        background: #212844;
        color: white;
        border: none;
        padding: 20px;
        border-radius: 50px;
        font-size: 1.1rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.3s;
    }

        .btn-submit:hover:not(:disabled) {
            background: #DF2935;
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(223, 41, 53, 0.2);
        }

    /* Служебное */
    .status-message {
        text-align: center;
        padding: 100px 0;
    }

    .error-box {
        color: #DF2935;
    }
</style>
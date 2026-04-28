<template>
    <div class="create-container">
        <div class="header-flex">
            <div class="title-group">
                <h1 class="main-title">{{ isEditMode ? 'Редактирование опроса' : 'Создание нового опроса' }}</h1>
                <div class="title-underline"></div>
            </div>
        </div>

        <!-- Основная информация -->
        <div class="base-info-section">
            <input v-model="survey.title" type="text" placeholder="Заголовок опроса *" class="minimal-input title-field">
            <textarea v-model="survey.description" placeholder="Описание опроса (необязательно)" class="minimal-input desc-field"></textarea>
        </div>

        <!-- Настройки -->
        <div class="settings-section">
            <h3 class="section-title">Настройки публикации и доступа</h3>

            <div class="setting-row dept-row">
                <label class="setting-label">Департамент</label>
                <div class="dept-select-wrapper">
                    <select v-model="survey.department_id" class="dept-select">
                        <option value="">Все департаменты</option>
                        <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                            {{ dept.name }}
                        </option>
                    </select>
                    <span class="dept-arrow">▾</span>
                </div>
            </div>

            <div class="setting-row">
                <label><input type="checkbox" v-model="survey.is_private"> Приватный опрос (доступен только по прямой ссылке)</label>
            </div>
            <div class="setting-row">
                <label><input type="checkbox" v-model="survey.show_correct_answers"> Показывать правильные ответы после прохождения</label>
            </div>
            <div class="setting-row">
                <label>Ограничение по количеству прохождений на одного пользователя:</label>
                <input v-model="survey.max_responses" type="number" min="0" placeholder="0 = без ограничения" class="minimal-input">
            </div>
            <div class="setting-row">
                <label>Дата и время окончания опроса:</label>
                <input v-model="survey.expires_at" type="datetime-local" class="minimal-input">
            </div>
            <div class="setting-row">
                <label><input type="checkbox" v-model="survey.is_closed"> Закрыть опрос (никто не сможет его пройти, кроме создателя)</label>
            </div>
        </div>

        <!-- Вопросы -->
        <div class="questions-list">
            <div v-for="(question, qIndex) in survey.questions" :key="question.id" class="question-item">
                <div class="question-header">
                    <span class="question-number">Вопрос №{{ qIndex + 1 }}</span>
                    <div class="question-controls">
                        <select v-model="question.type" class="type-select">
                            <option value="radio">Один вариант</option>
                            <option value="checkbox">Несколько вариантов</option>
                            <option value="text">Текстовый ответ</option>
                            <option value="scale">Шкала (1-10)</option>
                        </select>
                        <button @click="removeQuestion(qIndex)" v-if="survey.questions.length > 1" class="btn-remove-question">Удалить</button>
                    </div>
                </div>

                <input v-model="question.text" type="text" placeholder="Введите ваш вопрос здесь *" class="minimal-input question-field">

                <div class="answer-content">
                    <div v-if="question.type === 'radio' || question.type === 'checkbox'" class="options-container">
                        <div v-for="(choice, cIndex) in question.choices" :key="cIndex" class="option-row">
                            <label class="custom-check-container">
                                <input v-if="question.type === 'radio'"
                                       type="radio"
                                       :name="'correct-' + qIndex"
                                       :checked="choice.is_correct"
                                       @change="setCorrectChoice(qIndex, cIndex)">
                                <input v-else
                                       type="checkbox"
                                       v-model="choice.is_correct">
                                <span class="checkmark"></span>
                            </label>
                            <input v-model="choice.text" type="text" placeholder="Вариант ответа" class="minimal-input option-field">
                            <button @click="removeChoice(qIndex, cIndex)" v-if="question.choices.length > 1" class="btn-icon-delete">✕</button>
                        </div>
                        <button @click="addChoice(qIndex)" class="btn-add-choice">+ Добавить вариант</button>
                    </div>

                    <div v-if="question.type === 'text'" class="text-answer-preview">
                        <p>Поле для ввода развёрнутого текста</p>
                    </div>

                    <div v-if="question.type === 'scale'" class="scale-container">
                        <div class="scale-buttons">
                            <button v-for="n in 10" :key="n" class="scale-item" type="button">{{ n }}</button>
                        </div>
                        <div class="scale-labels">
                            <span>Минимум</span>
                            <span>Максимум</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Тулбар добавления вопросов -->
        <div class="toolbar-container">
            <p class="toolbar-title">Добавить вопрос:</p>
            <div class="toolbar-grid">
                <button @click="addQuestion('radio')" class="btn-tool">● Один выбор</button>
                <button @click="addQuestion('checkbox')" class="btn-tool">■ Множество</button>
                <button @click="addQuestion('text')" class="btn-tool">¶ Текст</button>
                <button @click="addQuestion('scale')" class="btn-tool">↔ Шкала</button>
            </div>
        </div>

        <!-- Кнопка сохранения -->
        <div class="publish-bottom">
            <button @click="saveSurvey" :disabled="loading || !survey.title.trim()" class="btn-publish">
                {{ loading ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Опубликовать опрос') }}
            </button>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRouter, useRoute } from 'vue-router'
    import { supabase } from '../supabase'
    import DepartmentSelect from '../components/DepartmentSelect.vue'

    const router = useRouter()
    const route = useRoute()

    const loading = ref(false)
    const isEditMode = ref(false)
    const surveyId = ref(null)
    const user = ref(null)

    const survey = ref({
        title: '',
        description: '',
        is_private: false,
        show_correct_answers: false,
        is_closed: false,
        max_responses: 0,
        expires_at: null,
        department_id: '',
        questions: []
    })

    // Загрузка опроса для редактирования
    const loadSurveyForEdit = async () => {
        const id = route.params.id
        if (!id) return

        isEditMode.value = true
        surveyId.value = id

        const { data: surveyData, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', id)
            .single()

        if (surveyError || !surveyData) {
            alert('Опрос не найден')
            router.push('/my-surveys')
            return
        }

        const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('survey_id', id)
            .order('order')

        if (questionsError) {
            console.error('Ошибка загрузки вопросов:', questionsError)
            return
        }

        const questionIds = questionsData.map(q => q.id)
        let choicesData = []

        if (questionIds.length > 0) {
            const { data: choices, error: choicesError } = await supabase
                .from('choices')
                .select('*')
                .in('question_id', questionIds)
                .order('order')

            if (!choicesError) {
                choicesData = choices || []
            }
        }

        survey.value.title = surveyData.title || ''
        survey.value.description = surveyData.description || ''
        survey.value.is_private = !!surveyData.is_private
        survey.value.show_correct_answers = !!surveyData.show_correct_answers
        survey.value.is_closed = !!surveyData.is_closed
        survey.value.max_responses = surveyData.max_responses || 0
        survey.value.expires_at = surveyData.expires_at ? surveyData.expires_at.slice(0, 16) : null
        survey.value.department_id = surveyData.department_id || ''

        survey.value.questions = questionsData.map(q => {
            const questionChoices = choicesData
                .filter(c => c.question_id === q.id)
                .map(c => ({
                    id: c.id,
                    text: c.text || '',
                    is_correct: c.is_correct === true || c.is_correct === 'true'
                }))

            // ВАЖНО: Для radio типа убеждаемся что только один правильный
            if (q.question_type === 'radio' && questionChoices.length > 0) {
                const correctIndex = questionChoices.findIndex(c => c.is_correct)
                if (correctIndex >= 0) {
                    questionChoices.forEach((c, i) => {
                        c.is_correct = (i === correctIndex)
                    })
                }
            }

            return {
                id: q.id,
                text: q.text || '',
                type: q.question_type || 'radio',
                choices: questionChoices.length > 0
                    ? questionChoices
                    : [{ text: '', is_correct: false }]
            }
        })
    }

    onMounted(async () => {
        const { data: { user: u } } = await supabase.auth.getUser()
        user.value = u
        if (!u) return router.push('/login')

        if (route.params.id) {
            await loadSurveyForEdit()
        } else {
            survey.value.questions = [{
                id: Date.now(),
                text: '',
                type: 'radio',
                choices: [{ text: '', is_correct: false }]
            }]
        }
    })

    // Добавление вопроса
    const addQuestion = (type) => {
        survey.value.questions.push({
            id: Date.now() + Math.random(),
            text: '',
            type,
            choices: (type === 'text' || type === 'scale') ? [] : [{ text: '', is_correct: false }]
        })
    }

    // Удаление вопроса
    const removeQuestion = (index) => {
        if (survey.value.questions.length > 1) survey.value.questions.splice(index, 1)
    }

    // Добавление варианта ответа
    const addChoice = (qIndex) => {
        survey.value.questions[qIndex].choices.push({ text: '', is_correct: false })
    }

    // Удаление варианта ответа
    const removeChoice = (qIndex, cIndex) => {
        if (survey.value.questions[qIndex].choices.length > 1)
            survey.value.questions[qIndex].choices.splice(cIndex, 1)
    }

    // Сохранение опроса
    const saveSurvey = async () => {
        if (!survey.value.title?.trim()) return alert('Введите заголовок опроса')

        loading.value = true

        try {
            const expiresAt = survey.value.expires_at ? new Date(survey.value.expires_at).toISOString() : null

            const surveyData = {
                title: survey.value.title.trim(),
                description: survey.value.description?.trim() || null,
                is_private: !!survey.value.is_private,
                is_public: !survey.value.is_private,
                is_active: !survey.value.is_closed,
                show_correct_answers: !!survey.value.show_correct_answers,
                max_responses: parseInt(survey.value.max_responses) || 0,
                expires_at: expiresAt,
                is_closed: !!survey.value.is_closed,
                department_id: survey.value.department_id || null 
            }

            let savedId = surveyId.value

            if (isEditMode.value) {
                const { error: updateError } = await supabase
                    .from('surveys')
                    .update(surveyData)
                    .eq('id', surveyId.value)

                if (updateError) throw updateError

                const { error: deleteError } = await supabase
                    .from('questions')
                    .delete()
                    .eq('survey_id', surveyId.value)

                if (deleteError) throw deleteError
            } else {
                const { data, error: insertError } = await supabase
                    .from('surveys')
                    .insert({ ...surveyData, user_id: user.value.id })
                    .select()
                    .single()

                if (insertError) throw insertError
                savedId = data.id
            }

            // Создаем вопросы с вариантами
            for (const [order, q] of survey.value.questions.entries()) {
                if (!q.text?.trim()) continue

                const { data: qData, error: qError } = await supabase
                    .from('questions')
                    .insert({
                        survey_id: savedId,
                        text: q.text.trim(),
                        question_type: q.type,
                        order
                    })
                    .select()
                    .single()

                if (qError) throw qError

                // Сохраняем варианты ответов
                if (q.choices && q.choices.length > 0) {
                    const choicesToInsert = q.choices
                        .filter(c => c.text?.trim())
                        .map((c, i) => {
                            // ВАЖНО: Для radio только первый отмеченный правильный
                            let isCorrect = false
                            if (q.type === 'radio') {
                                // Для radio - только один правильный (первый отмеченный)
                                isCorrect = (i === q.choices.findIndex(ch => ch.is_correct))
                            } else if (q.type === 'checkbox') {
                                // Для checkbox - все отмеченные правильные
                                isCorrect = Boolean(c.is_correct)
                            }

                            return {
                                question_id: qData.id,
                                text: c.text.trim(),
                                is_correct: isCorrect,
                                order: i
                            }
                        })

                    if (choicesToInsert.length > 0) {
                        const { error: choicesError } = await supabase
                            .from('choices')
                            .insert(choicesToInsert)

                        if (choicesError) throw choicesError
                    }
                }
            }

            alert(isEditMode.value ? 'Опрос успешно обновлён!' : 'Опрос успешно опубликован!')
            router.push('/my-surveys')

        } catch (e) {
            console.error('Ошибка сохранения:', e)
            alert('Ошибка: ' + (e.message || 'Неизвестная ошибка'))
        } finally {
            loading.value = false
        }
    }
    const setCorrectChoice = (qIndex, cIndex) => {
        // Для radio - сбрасываем все и ставим только выбранный
        survey.value.questions[qIndex].choices.forEach((c, i) => {
            c.is_correct = (i === cIndex)
        })
    }
</script>


<style scoped>
    /* Контейнер */
    .create-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 80px 20px;
        display: flex;
        flex-direction: column;
        gap: 80px;
    }

    .header-flex {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .main-title {
        font-size: 2.4rem;
        font-weight: 800;
        color: #212844;
    }

    .title-underline {
        width: 50px;
        height: 4px;
        background: #212844;
        margin-top: 10px;
    }

    /* Инпуты */
    .minimal-input {
        width: 100%;
        background: transparent;
        border: none;
        border-bottom: 2px solid rgba(33, 40, 68, 0.1);
        padding: 15px 0;
        color: #212844;
        font-size: 1.1rem;
        transition: border-color 0.2s;
    }

        .minimal-input:focus {
            outline: none;
            border-bottom-color: #DF2935; /* Используем твой акцентный красный при фокусе */
        }

    .title-field {
        font-size: 2rem;
        font-weight: 700;
        border-bottom-width: 3px;
    }

    /* Список вопросов */
    .questions-list {
        display: flex;
        flex-direction: column;
        gap: 100px;
    }

    .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
    }

    .question-number {
        font-weight: 900;
        opacity: 0.3;
        text-transform: uppercase;
    }

    /* Управление вопросом (Select и Удаление) */
    .question-controls {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .type-select {
        padding: 8px 15px;
        border-radius: 8px;
        border: 1px solid rgba(33, 40, 68, 0.2);
        background: white;
        color: #212844;
        font-family: inherit;
        cursor: pointer;
    }

    /* Варианты ответов */
    .option-row {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
        position: relative;
    }

    /* Кастомные чекбоксы/радио */
    .custom-check-container {
        position: relative;
        cursor: pointer;
        width: 22px;
        height: 22px;
        flex-shrink: 0;
    }

        .custom-check-container input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
        }

    .checkmark {
        position: absolute;
        top: 0;
        left: 0;
        height: 22px;
        width: 22px;
        background-color: transparent;
        border: 2px solid #212844;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .custom-check-container input[type="radio"] + .checkmark {
        border-radius: 50%;
    }

    .custom-check-container input:checked + .checkmark {
        background-color: #212844;
        box-shadow: inset 0 0 0 3px #FDFDF1; /* Светлый ободок внутри для четкости */
    }

    /* Кнопки */
    .btn-publish {
        background-color: #212844;
        color: #F2C4CE;
        border: none;
        border-radius: 18px;
        padding: 20px 60px;
        font-weight: 700;
        font-size: 1.2rem;
        transition: all 0.3s ease;
    }

        .btn-publish:hover:not(:disabled) {
            background: #DF2935;
            transform: translateY(-2px);
        }

        .btn-publish:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

    .btn-icon-delete {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        padding: 5px;
        transition: color 0.2s;
    }

        .btn-icon-delete:hover {
            color: #DF2935;
        }

    .btn-add-choice {
        background: none;
        border: 1px dashed rgba(33, 40, 68, 0.3);
        color: #212844;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 700;
        margin-top: 10px;
        margin-left: 37px; /* Смещение, чтобы кнопка была под текстом инпутов */
        transition: all 0.2s;
    }

        .btn-add-choice:hover {
            background: rgba(33, 40, 68, 0.05);
            border-color: #212844;
        }

    .btn-remove-question {
        background: none;
        border: none;
        color: #DF2935;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.2s;
    }

        .btn-remove-question:hover {
            opacity: 1;
        }

    /* Нижний тулбар */
    .toolbar-container {
        margin-top: 50px;
        padding: 30px;
        background: #FDFDF1; /* Твой фоновый цвет */
        border-radius: 20px;
        border: 2px solid #212844;
    }

    .toolbar-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 15px;
    }

    .btn-tool {
        padding: 12px 25px;
        border: 2px solid #212844;
        border-radius: 50px;
        background: white;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }

        .btn-tool:hover {
            background: #212844;
            color: white;
        }

    /* Контейнер шкалы */
    .scale-container {
        margin-top: 20px;
        padding: 20px;
        background: rgba(33, 40, 68, 0.03); /* Легкий фон для выделения зоны */
        border-radius: 15px;
    }

    /* Ряд кнопок */
    .scale-buttons {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 15px;
    }

    /* Сами кружочки */
    .scale-item {
        width: 40px;
        height: 40px;
        border: 2px solid #212844;
        background: white;
        color: #212844;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        cursor: default; /* В режиме создания они просто для превью */
        transition: all 0.2s;
    }

    /* Подписи Минимум/Максимум */
    .scale-labels {
        display: flex;
        justify-content: space-between;
        padding: 0 5px;
    }

        .scale-labels span {
            font-size: 0.85rem;
            font-weight: 600;
            color: #212844;
            opacity: 0.6;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

    /* Адаптивность для мобилок, чтобы кнопки не слипались */
    @media (max-width: 600px) {
        .scale-buttons {
            gap: 5px;
        }

        .scale-item {
            width: 30px;
            height: 30px;
            font-size: 0.8rem;
        }
    }

    .publish-bottom {
        margin-top: 80px;
        text-align: center;
        padding-bottom: 60px;
    }

    .settings-section {
        background: #FDFDF1;
        padding: 30px;
        border-radius: 20px;
        border: 2px solid #212844;
        margin-bottom: 60px;
    }

    .section-title {
        font-size: 1.4rem;
        margin-bottom: 20px;
        color: #212844;
    }

    .setting-row {
        margin-bottom: 18px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

        .setting-row label {
            font-weight: 600;
            color: #212844;
        }

    .dept-row {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 8px;
        margin-bottom: 22px;
        padding-bottom: 22px;
        border-bottom: 1px solid rgba(33, 40, 68, 0.1);
    }

    .setting-label {
        font-weight: 800;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.5px;
        color: #212844;
        opacity: 0.7;
    }

    .dept-select-wrapper {
        position: relative;
        width: 100%;
        max-width: 350px;
    }

    .dept-select {
        width: 100%;
        height: 48px;
        padding: 0 40px 0 16px;
        border: 2px solid #212844;
        border-radius: 14px;
        background: white;
        font-size: 0.95rem;
        font-weight: 600;
        color: #212844;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

        .dept-select:focus {
            outline: none;
            border-color: #DF2935;
            box-shadow: 3px 3px 0px rgba(33, 40, 68, 0.08);
        }

        .dept-select option {
            background: white;
            color: #212844;
            font-weight: 500;
        }

    .dept-arrow {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 0.9rem;
        color: #212844;
        font-weight: 900;
    }
</style>
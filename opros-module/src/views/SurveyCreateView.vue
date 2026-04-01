<template>
    <div class="create-container">
        <div class="header-flex">
            <div class="title-group">
                <h1 class="main-title">Создание нового опроса</h1>
                <div class="title-underline"></div>
            </div>
            <button @click="createSurvey"
                    :disabled="loading || !user"
                    class="btn-publish">
                {{ loading ? 'Сохранение...' : 'Опубликовать опрос' }}
            </button>
        </div>

        <div class="base-info-section">
            <input v-model="survey.title"
                   type="text"
                   placeholder="Заголовок опроса *"
                   class="minimal-input title-field">
            <textarea v-model="survey.description"
                      placeholder="Описание опроса (необязательно)"
                      class="minimal-input desc-field"></textarea>
        </div>

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
                        <button @click="removeQuestion(qIndex)"
                                v-if="survey.questions.length > 1"
                                class="btn-remove-question"
                                title="Удалить вопрос">
                            Удалить
                        </button>
                    </div>
                </div>

                <input v-model="question.text"
                       type="text"
                       placeholder="Введите ваш вопрос здесь *"
                       class="minimal-input question-field">

                <div class="answer-content">

                    <div v-if="question.type === 'radio' || question.type === 'checkbox'" class="options-container">
                        <div v-for="(choice, cIndex) in question.choices" :key="cIndex" class="option-row">

                            <label class="custom-check-container" :title="choice.is_correct ? 'Правильный ответ' : 'Пометить как правильный'">
                                <input :type="question.type === 'radio' ? 'radio' : 'checkbox'"
                                       :name="'correct-' + qIndex"
                                       v-model="choice.is_correct">
                                <span class="checkmark"></span>
                            </label>

                            <input v-model="choice.text"
                                   type="text"
                                   placeholder="Вариант ответа"
                                   class="minimal-input option-field">

                            <button @click="removeChoice(qIndex, cIndex)"
                                    v-if="question.choices.length > 1"
                                    class="btn-icon-delete"
                                    title="Удалить вариант">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <button @click="addChoice(qIndex)" class="btn-add-choice">
                            <span class="plus-icon">+</span> Добавить вариант
                        </button>
                    </div>

                    <div v-if="question.type === 'text'" class="text-answer-preview">
                        <p>Поле для ввода развернутого текста (будет доступно респонденту)</p>
                    </div>

                    <div v-if="question.type === 'scale'" class="scale-container">
                        <div class="scale-buttons">
                            <button v-for="n in 10"
                                    :key="n"
                                    class="scale-item"
                                    type="button">
                                {{ n }}
                            </button>
                        </div>
                        <div class="scale-labels">
                            <span class="label-min">Минимум</span>
                            <span class="label-max">Максимум</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="toolbar-container">
            <p class="toolbar-title">Добавить вопрос:</p>
            <div class="toolbar-grid">
                <button @click="addQuestion('radio')" class="btn-tool">● Один выбор</button>
                <button @click="addQuestion('checkbox')" class="btn-tool">■ Множество</button>
                <button @click="addQuestion('text')" class="btn-tool">¶ Текст</button>
                <button @click="addQuestion('scale')" class="btn-tool">↔ Шкала</button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const router = useRouter()
    const loading = ref(false)
    const user = ref(null)

    // Изначально создаем один готовый вопрос (Один вариант)
    const survey = ref({
        title: '',
        description: '',
        questions: [
            {
                id: Date.now(),
                text: '',
                type: 'radio',
                choices: [{ text: '', is_correct: false }]
            }
        ]
    })

    onMounted(async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        user.value = currentUser
        // Если пользователя нет, отправляем логиниться, чтобы не было ошибок с ID
        if (!currentUser) router.push('/login')
    })

    const addQuestion = (type) => {
        survey.value.questions.push({
            id: Date.now() + Math.random(),
            text: '',
            type: type,
            choices: (type === 'text' || type === 'scale') ? [] : [{ text: '', is_correct: false }]
        })
    }

    const removeQuestion = (index) => survey.value.questions.splice(index, 1)
    const addChoice = (index) => survey.value.questions[index].choices.push({ text: '', is_correct: false })
    const removeChoice = (qIdx, cIdx) => survey.value.questions[qIdx].choices.splice(cIdx, 1)

    const createSurvey = async () => {
        if (!survey.value.title) return alert('Введите заголовок')
        if (!user.value) return alert('Вы не авторизованы. Перезайдите в аккаунт.')

        loading.value = true
        try {
            // 1. Создаем сам опрос
            const { data: sData, error: sErr } = await supabase
                .from('surveys')
                .insert({
                    title: survey.value.title,
                    description: survey.value.description,
                    user_id: user.value.id,
                    is_public: true,
                    is_active: true
                })
                .select().single()

            if (sErr) throw sErr

            // 2. Цикл по вопросам
            for (const [i, q] of survey.value.questions.entries()) {
                // Создаем объект вопроса. 
                // ВАЖНО: Добавляем user_id, если такая колонка есть в таблице questions
                const questionPayload = {
                    survey_id: sData.id,
                    text: q.text,
                    question_type: q.type,
                    order: i,
                }

                const { data: qData, error: qErr } = await supabase
                    .from('questions')
                    .insert({
                        survey_id: sData.id,
                        text: q.text,
                        question_type: q.type,
                        order: i
                    })
                    .select().single()

                if (qErr) throw qErr // Ошибка вылетает здесь

                // 3. Варианты ответов
                if (q.choices && q.choices.length > 0) {
                    const choicesToInsert = q.choices.map((c, ci) => ({
                        question_id: qData.id,
                        text: c.text,
                        is_correct: c.is_correct,
                        order: ci
                    }))

                    const { error: cErr } = await supabase
                        .from('choices')
                        .insert(choicesToInsert)

                    if (cErr) throw cErr
                }
            }

            alert('Опрос и вопросы успешно созданы!')
            router.push('/')
        } catch (e) {
            console.error('Полная ошибка:', e)
            alert('Ошибка сохранения: ' + e.message)
        } finally {
            loading.value = false
        }
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
        background: #212844;
        color: white;
        padding: 14px 35px;
        border-radius: 50px;
        font-weight: 800;
        border: none;
        cursor: pointer;
        transition: transform 0.2s, background 0.2s;
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
</style>
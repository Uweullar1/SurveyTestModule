<template>
    <div class="container my-5">
        <h1 class="mb-4">Создать новый опрос / анкету</h1>

        <form @submit.prevent="createSurvey">
            <!-- Название и описание -->
            <div class="mb-4">
                <label class="form-label fw-bold">Название опроса *</label>
                <input v-model="form.title"
                       type="text"
                       class="form-control"
                       placeholder="Например: Опрос удовлетворённости курсом"
                       required />
            </div>

            <div class="mb-5">
                <label class="form-label fw-bold">Описание (необязательно)</label>
                <textarea v-model="form.description"
                          class="form-control"
                          rows="3"
                          placeholder="Кратко опишите цель опроса"></textarea>
            </div>

            <!-- Вопросы -->
            <h3 class="mb-4">Вопросы</h3>

            <div v-for="(q, qIndex) in form.questions" :key="qIndex" class="card mb-4 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title m-0">Вопрос №{{ qIndex + 1 }}</h5>
                        <button type="button"
                                class="btn btn-outline-danger btn-sm"
                                @click="removeQuestion(qIndex)"
                                :disabled="form.questions.length === 1">
                            Удалить вопрос
                        </button>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Текст вопроса *</label>
                        <input v-model="q.text"
                               type="text"
                               class="form-control"
                               placeholder="Например: Как вы оцениваете качество преподавания?"
                               required />
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Тип ответа</label>
                        <select v-model="q.type" class="form-select">
                            <option value="single">Один вариант (радио-кнопки)</option>
                            <option value="multiple">Несколько вариантов (чекбоксы)</option>
                            <option value="text">Открытый текст</option>
                            <option value="scale">Шкала (1–10)</option>
                        </select>
                    </div>

                    <!-- Варианты ответов — только для single и multiple -->
                    <div v-if="q.type === 'single' || q.type === 'multiple'" class="mt-4">
                        <label class="form-label fw-bold">Варианты ответа</label>
                        <div v-for="(choice, cIndex) in q.choices" :key="cIndex" class="input-group mb-2">
                            <input v-model="choice.text"
                                   type="text"
                                   class="form-control"
                                   placeholder="Вариант ответа"
                                   required />
                            <div class="input-group-text">
                                <input type="checkbox"
                                       :checked="choice.is_correct"
                                       @change="choice.is_correct = $event.target.checked" />
                                <label class="ms-2">Правильный</label>
                            </div>
                            <button type="button"
                                    class="btn btn-outline-danger"
                                    @click="removeChoice(qIndex, cIndex)"
                                    :disabled="q.choices.length === 1">
                                ×
                            </button>
                        </div>

                        <button type="button"
                                class="btn btn-outline-secondary btn-sm mt-2"
                                @click="addChoice(qIndex)">
                            + Добавить вариант
                        </button>
                    </div>
                </div>
            </div>

            <button type="button" class="btn btn-outline-primary mb-4" @click="addQuestion">
                + Добавить ещё вопрос
            </button>

            <div class="d-grid mt-5">
                <button type="submit" class="btn btn-success btn-lg" :disabled="loading">
                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                    Сохранить опрос
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'
    import { supabase } from '../supabase'  // ← твой путь

    const router = useRouter()
    const loading = ref(false)

    const form = ref({
        title: '',
        description: '',
        questions: [
            {
                text: '',
                type: 'single',
                choices: [
                    { text: '', is_correct: false }
                ]
            }
        ]
    })

    const addQuestion = () => {
        form.value.questions.push({
            text: '',
            type: 'single',
            choices: [{ text: '', is_correct: false }]
        })
    }

    const removeQuestion = (qIndex) => {
        if (form.value.questions.length > 1) {
            form.value.questions.splice(qIndex, 1)
        }
    }

    const addChoice = (qIndex) => {
        form.value.questions[qIndex].choices.push({ text: '', is_correct: false })
    }

    const removeChoice = (qIndex, cIndex) => {
        if (form.value.questions[qIndex].choices.length > 1) {
            form.value.questions[qIndex].choices.splice(cIndex, 1)
        }
    }

    const createSurvey = async () => {
        // Валидация
        if (!form.value.title.trim()) return alert('Введите название опроса!')
        if (form.value.questions.some(q => !q.text.trim())) return alert('Заполните текст всех вопросов!')

        loading.value = true

        try {
            // 1. Создаём опрос
            const { data: surveyData, error: surveyError } = await supabase
                .from('surveys')
                .insert({
                    title: form.value.title,
                    description: form.value.description || null,
                    is_public: true,
                    is_active: true
                })
                .select('id')
                .single()

            if (surveyError) throw surveyError

            const surveyId = surveyData.id

            // 2. Добавляем вопросы
            const questionsToInsert = form.value.questions.map((q, index) => ({
                survey_id: surveyId,
                text: q.text.trim(),
                question_type: q.type,
                order: index,
                required: true
            }))

            const { data: insertedQuestions, error: questionsError } = await supabase
                .from('questions')
                .insert(questionsToInsert)
                .select('id, order')

            if (questionsError) throw questionsError

            // Связываем вопросы с их ID
            const questionMap = {}
            insertedQuestions.forEach(q => {
                questionMap[q.order] = q.id
            })

            // 3. Добавляем варианты ответов (только для single/multiple)
            const choicesToInsert = []

            form.value.questions.forEach((q, qIndex) => {
                if (q.type === 'single' || q.type === 'multiple') {
                    q.choices.forEach(choice => {
                        if (choice.text.trim()) {
                            choicesToInsert.push({
                                question_id: questionMap[qIndex],
                                text: choice.text.trim(),
                                order: q.choices.indexOf(choice),
                                is_correct: !!choice.is_correct
                            })
                        }
                    })
                }
            })

            if (choicesToInsert.length > 0) {
                const { error: choicesError } = await supabase
                    .from('choices')
                    .insert(choicesToInsert)

                if (choicesError) throw choicesError
            }

            alert('Опрос успешно создан!')
            router.push('/')
        } catch (err) {
            console.error('Полная ошибка при создании:', err)
            console.log('Status:', err.status)
            console.log('Message:', err.message)
            console.log('Details:', err.details)
            alert('Ошибка при создании: ' + (err.message || 'Неизвестная ошибка') + '\nСмотри консоль (F12)')
        } finally {
            loading.value = false
        }
    }
</script>
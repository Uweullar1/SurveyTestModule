<template>
    <div class="container my-5">
        <div class="header-admin d-flex justify-content-between align-items-center mb-4">
            <h1 class="fw-bold">Проверка: {{ surveyTitle }}</h1>
            <button @click="router.push('/')" class="btn btn-outline-dark">Назад</button>
        </div>

        <div v-if="loading" class="text-center p-5">
            <div class="spinner-border"></div>
        </div>

        <div v-else class="row">
            <!-- Список участников -->
            <div class="col-md-4">
                <div class="list-group shadow-sm">
                    <button v-for="(resp, idx) in allResponses" :key="resp.id"
                            @click="selectUser(resp)"
                            class="list-group-item list-group-item-action border-2 mb-2"
                            :class="{ active: selectedResponse?.id === resp.id }">
                        Участник #{{ allResponses.length - idx }}
                        <small class="d-block opacity-75">{{ formatDate(resp.submitted_at) }}</small>
                    </button>
                </div>
            </div>

            <!-- Детали ответов выбранного пользователя -->
            <div class="col-md-8">
                <div v-if="selectedResponse" class="results-detail p-4 border rounded-4 bg-white shadow">
                    <h4 class="mb-4">Анкета №{{ allResponses.length - allResponses.indexOf(selectedResponse) }}</h4>

                    <div v-for="q in questions" :key="q.id" class="border-bottom py-3">
                        <p class="fw-bold">{{ q.text }}</p>
                        <p><strong>Ответ:</strong> {{ formatAnswer(q, selectedResponse.id) }}</p>

                        <!-- Для текстовых вопросов — возможность поставить баллы и фидбек -->
                        <div v-if="q.question_type === 'text'" class="bg-light p-3 rounded mt-2">
                            <div class="row">
                                <div class="col-md-3">
                                    <label class="small">Баллы (0-10):</label>
                                    <input type="number" v-model="editData[q.id].score" class="form-control" min="0" max="10">
                                </div>
                                <div class="col-md-9">
                                    <label class="small">Комментарий:</label>
                                    <input type="text" v-model="editData[q.id].feedback" class="form-control" placeholder="Напишите фидбек...">
                                </div>
                            </div>
                        </div>

                        <div v-else class="small text-muted mt-1">
                            Проверяется автоматически
                        </div>
                    </div>

                    <div class="mt-5 p-4 bg-dark rounded-4 text-center">
                        <button @click="saveEvaluation" :disabled="submitting"
                                class="btn btn-warning btn-lg px-5 fw-bold">
                            {{ submitting ? 'Сохранение...' : 'СОХРАНИТЬ И ОТПРАВИТЬ ФИДБЕК' }}
                        </button>
                    </div>
                </div>

                <div v-else class="text-center p-5 text-muted">
                    Выберите участника слева
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, reactive } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const route = useRoute()
    const router = useRouter()

    const loading = ref(true)
    const submitting = ref(false)
    const surveyTitle = ref('')
    const questions = ref([])
    const allResponses = ref([])
    const allAnswers = ref([])
    const selectedResponse = ref(null)
    const editData = reactive({})

    onMounted(async () => {
        const surveyId = route.params.id
        if (!surveyId) {
            console.error("ID опроса не найден в параметрах пути")
            loading.value = false
            return
        }

        try {
            loading.value = true
            console.log("Начинаю загрузку для ID:", surveyId)

            // 1. Загружаем вопросы и варианты (БЕЗ джойна с surveys, чтобы не было ошибки questions_1)
            const { data: qData, error: qError } = await supabase
                .from('questions')
                .select(`
                id,
                text,
                question_type,
                order,
                choices (id, text, is_correct)
            `)
                .eq('survey_id', surveyId)
                .order('order')

            if (qError) throw qError
            questions.value = qData || []
            console.log("Вопросы загружены:", qData.length)

            // 2. Отдельно берем заголовок, раз Supabase путается в связях
            const { data: sData } = await supabase
                .from('surveys')
                .select('title')
                .eq('id', surveyId)
                .maybeSingle()

            surveyTitle.value = sData?.title || 'Опрос без названия'

            // 3. Загружаем ответы пользователей (responses)
            const { data: rData, error: rError } = await supabase
                .from('responses')
                .select('*')
                .eq('survey_id', surveyId)
                .order('submitted_at', { ascending: false })

            if (rError) throw rError
            allResponses.value = rData || []

            // 4. Загружаем все ответы из таблицы answers
            if (allResponses.value.length > 0) {
                const respIds = allResponses.value.map(r => r.id)
                const { data: aData, error: aError } = await supabase
                    .from('answers')
                    .select('*')
                    .in('response_id', respIds)

                if (aError) throw aError
                allAnswers.value = aData || []
            }

            // Если есть участники, выбираем первого
            if (allResponses.value.length > 0) {
                selectUser(allResponses.value[0])
            }

        } catch (err) {
            console.error("Критическая ошибка загрузки:", err.message)
            alert("Ошибка при получении данных: " + err.message)
        } finally {
            loading.value = false
        }
    })

    const selectUser = (resp) => {
        selectedResponse.value = resp

        // Инициализируем поля для оценки
        questions.value.forEach(q => {
            const existing = allAnswers.value.find(a => a.question_id === q.id && a.response_id === resp.id)
            editData[q.id] = {
                id: existing?.id,
                score: existing?.score || 0,
                feedback: existing?.feedback || ''
            }
        })
    }

    const saveEvaluation = async () => {
        submitting.value = true
        try {
            for (const qId in editData) {
                const item = editData[qId]

                // Сохраняем только если есть ID ответа
                if (item.id) {
                    const { error } = await supabase
                        .from('answers')
                        .update({
                            score: Number(item.score), // Принудительно число
                            feedback: item.feedback
                        })
                        .eq('id', item.id)

                    if (error) throw error

                    // Обновляем локальный массив allAnswers, чтобы данные "приклеились"
                    const localIdx = allAnswers.value.findIndex(a => a.id === item.id)
                    if (localIdx !== -1) {
                        allAnswers.value[localIdx].score = Number(item.score)
                        allAnswers.value[localIdx].feedback = item.feedback
                    }
                }
            }
            alert('Фидбек успешно сохранён в базе и обновлен в списке!')
        } catch (e) {
            console.error("Ошибка при сохранении:", e)
            alert('Ошибка сохранения: ' + e.message)
        } finally {
            submitting.value = false
        }
    }

    const formatAnswer = (q, responseId) => {
        const ans = allAnswers.value.find(a => a.question_id === q.id && a.response_id === responseId)
        if (!ans) return '—'

        // Для текстовых полей выводим сразу
        if (q.question_type === 'text') return ans.text_answer || '—'
        if (q.question_type === 'scale') return ans.scale_value || '—'

        // Обработка вариантов выбора (радио и чекбоксы)
        let selectedIds = []

        // Если в базе лежит UUID в choice_id
        if (ans.choice_id) {
            selectedIds = [String(ans.choice_id)]
        }
        // Если в базе лежит JSON массив (для чекбоксов)
        else if (ans.text_answer && ans.text_answer.startsWith('[')) {
            try {
                selectedIds = JSON.parse(ans.text_answer).map(String)
            } catch {
                selectedIds = [String(ans.text_answer)]
            }
        }
        // Если просто один ID в текстовом поле
        else if (ans.text_answer) {
            selectedIds = [String(ans.text_answer)]
        }

        const texts = q.choices
            .filter(c => selectedIds.includes(String(c.id)))
            .map(c => c.text)

        return texts.length ? texts.join(', ') : 'Ответ не найден в списке вариантов'
    }

    const formatDate = (date) => new Date(date).toLocaleString('ru-RU')
</script>

<style scoped>
    .list-group-item.active {
        background-color: #212844 !important;
        border-color: #212844 !important;
        color: white;
    }
</style>
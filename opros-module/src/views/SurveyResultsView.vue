<template>
    <div class="container my-5">
        <div class="header-admin d-flex justify-content-between align-items-center mb-4">
            <h1 class="fw-bold">Проверка: {{ questions[0]?.surveys?.title || 'Опрос' }}</h1>
            <button @click="router.push('/')" class="btn btn-outline-dark">Назад</button>
        </div>

        <div v-if="loading" class="text-center p-5"><div class="spinner-border"></div></div>

        <div v-else class="row">
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

            <div class="col-md-8">
                <div v-if="selectedResponse" class="results-detail p-4 border rounded-4 bg-white shadow">
                    <h4 class="mb-4">Анкета №{{ allResponses.length - allResponses.indexOf(selectedResponse) }}</h4>

                    <div v-for="q in surveyQuestions" :key="q.id" class="border-bottom py-3">
                        <p class="fw-bold">{{ q.text }}</p>
                        <p>Ответ: {{ formatAnswer(q, selectedResponseId) }}</p>

                        <div v-if="q.type === 'text'" class="bg-light p-3 rounded">
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

                        <div v-else class="small text-muted">
                            Проверяется автоматически системой
                        </div>
                    </div>

                    <div class="mt-5 p-4 bg-dark rounded-4 text-center">
                        <button @click="saveEvaluation" :disabled="submitting"
                                class="btn btn-warning btn-lg px-5 fw-bold">
                            {{ submitting ? 'Сохранение...' : 'СОХРАНИТЬ И ОТПРАВИТЬ ФИДБЕК' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, reactive } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const route = useRoute(); const router = useRouter()
    const loading = ref(true); const submitting = ref(false)
    const questions = ref([]); const allResponses = ref([]); const allAnswers = ref([])
    const selectedResponse = ref(null)
    const editData = reactive({}) // Храним оценки здесь

    onMounted(async () => {
        const surveyId = route.params.id
        try {
            const { data: qData } = await supabase.from('questions').select('*, surveys(title), choices(*)').eq('survey_id', surveyId).order('order')
            questions.value = qData || []

            const { data: rData } = await supabase.from('responses').select('*').eq('survey_id', surveyId).order('submitted_at', { ascending: false })
            allResponses.value = rData || []

            const respIds = allResponses.value.map(r => r.id)
            if (respIds.length > 0) {
                const { data: aData } = await supabase.from('answers').select('*').in('response_id', respIds)
                allAnswers.value = aData || []
            }
            if (allResponses.value.length > 0) selectUser(allResponses.value[0])
        } finally { loading.value = false }
    })

    const selectUser = (resp) => {
        selectedResponse.value = resp
        // Инициализируем поля оценки для текущего пользователя
        questions.value.forEach(q => {
            const existing = allAnswers.value.find(a => a.question_id === q.id && a.response_id === resp.id)
            editData[q.id] = {
                id: existing?.id, // ID записи в таблице answers
                score: existing?.score || 1,
                feedback: existing?.feedback || ''
            }
        })
    }

    const saveEvaluation = async () => {
        submitting.value = true
        try {
            for (const qId in editData) {
                const item = editData[qId]
                if (item.id) {
                    await supabase.from('answers').update({
                        score: item.score,
                        feedback: item.feedback
                    }).eq('id', item.id)
                }
            }
            alert('Фидбек успешно сохранен в базе!')
        } catch (e) {
            alert('Ошибка: ' + e.message)
        } finally { submitting.value = false }
    }

    // Логика форматирования и проверки (оставляем твою рабочую)
    const isCorrect = (q, rId) => {
        if (q.type === 'text') return false
        const ans = allAnswers.value.find(a => a.question_id === q.id && a.response_id === rId)
        if (!ans) return false
        const correctIds = q.choices.filter(c => c.is_correct).map(c => String(c.id))
        try {
            const userIds = ans.text_answer.startsWith('[') ? JSON.parse(ans.text_answer).map(String) : [String(ans.text_answer)]
            return userIds.every(id => correctIds.includes(id)) && userIds.length === correctIds.length
        } catch { return correctIds.includes(String(ans.text_answer)) }
    }

    const formatAnswer = (q, rId) => {
        const ans = allAnswers.value.find(a => String(a.question_id) === String(q.id) && String(a.response_id) === String(rId));
        if (!ans) return 'Пустой ответ';

        // 1. Если это текстовый вопрос или шкала — возвращаем как есть
        if (q.type === 'text' || q.type === 'number' || q.type === 'rating') {
            return ans.text_answer || '—';
        }

        // 2. Если это выбор вариантов
        try {
            // Проверяем, массив это (множественный выбор) или одиночный ID
            const selectedIds = ans.text_answer.startsWith('[')
                ? JSON.parse(ans.text_answer).map(String)
                : [String(ans.text_answer)];

            // Сопоставляем ID с текстом из q.choices
            const matchedTexts = q.choices
                .filter(c => selectedIds.includes(String(c.id)))
                .map(c => c.text);

            return matchedTexts.length > 0 ? matchedTexts.join(', ') : 'Вариант не найден';
        } catch (e) {
            // На случай, если в базе лежит странный формат
            return ans.text_answer;
        }
    }
    const formatDate = (s) => new Date(s).toLocaleString('ru-RU')
</script>

<style scoped>
    .bg-success-light {
        background-color: #f0fff4;
        border: 1px solid #c6f6d5;
    }

    .bg-light {
        background-color: #f8f9fa;
    }

    .btn-warning {
        background-color: #ffc107;
        color: #212844;
    }

    .list-group-item.active {
        background-color: #212844 !important;
        border-color: #212844 !important;
    }
</style>
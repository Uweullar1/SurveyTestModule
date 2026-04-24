<template>
    <div class="admin-check-page">
        <div class="container py-5">
            <div class="row justify-content-center mb-5">
                <div class="col-lg-10">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h1 class="fw-bold survey-title mb-2">{{ surveyTitle }}</h1>
                            <p class="text-muted">Панель проверки ответов</p>
                        </div>
                        <button @click="router.push('/')" class="btn btn-back shadow-sm">
                            <i class="bi bi-arrow-left"></i> Назад
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="text-center p-5">
                <div class="spinner-border text-navy"></div>
            </div>

            <div v-else class="row justify-content-center g-5">
                <div class="col-lg-3">
                    <div class="participants-sidebar shadow-sm">
                        <div class="sidebar-label">Список участников</div>
                        <div class="scroll-area p-3">
                            <button v-for="(resp, idx) in allResponses" :key="resp.id"
                                    @click="selectUser(resp)"
                                    class="user-nav-card"
                                    :class="{ active: selectedResponse?.id === resp.id }">
                                <div class="fw-bold">
                                    {{ resp.profiles?.full_name || `Участник #${allResponses.length - idx}` }}
                                </div>
                                <small class="d-block opacity-75">{{ formatDate(resp.submitted_at) }}</small>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="col-lg-7">
                    <div v-if="selectedResponse" class="results-container">
                        <div class="user-info-header mb-5">
                            <h2 class="fw-bold mb-3">
                                Ответы: {{ selectedResponse.profiles?.full_name || `Участник #${allResponses.length - allResponses.indexOf(selectedResponse)}` }}
                            </h2>
                            <div class="info-badge">Завершено: {{ formatDate(selectedResponse.submitted_at) }}</div>
                        </div>

                        <div v-for="q in questions" :key="q.id" class="question-block mb-5">
                            <h5 class="question-heading mb-3">{{ q.text }}</h5>

                            <div class="answer-display mb-3">
                                <div class="answer-label">Ответ пользователя:</div>
                                <div class="answer-text">{{ formatAnswer(q, selectedResponse.id) }}</div>
                            </div>

                            <div v-if="q.question_type === 'text'" class="admin-eval-box mt-3 p-3 rounded-4">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="small fw-bold opacity-50">Баллы</label>
                                        <input type="number" v-model="editData[q.id].score" class="form-control admin-input" placeholder="0-10">
                                    </div>
                                    <div class="col-md-9">
                                        <label class="small fw-bold opacity-50">Комментарий</label>
                                        <input type="text" v-model="editData[q.id].feedback" class="form-control admin-input" placeholder="Напишите фидбек...">
                                    </div>
                                </div>
                            </div>
                            <div v-else class="auto-status mt-2">
                                <i class="bi bi-patch-check-fill text-success"></i> Проверено автоматически
                            </div>
                        </div>

                        <div class="publish-bottom">
                            <button @click="saveEvaluation" :disabled="submitting" class="btn-save-final shadow-lg">
                                <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                                СОХРАНИТЬ РЕЗУЛЬТАТЫ
                            </button>
                        </div>
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
            console.error("ID опроса не найден")
            loading.value = false
            return
        }

        try {
            loading.value = true

            // Загружаем заголовок опроса
            const { data: sData } = await supabase
                .from('surveys')
                .select('title')
                .eq('id', surveyId)
                .single()

            surveyTitle.value = sData?.title || 'Опрос без названия'

            // Загружаем вопросы с вариантами
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

            // Загружаем ответы пользователей
            const { data: rData, error: rError } = await supabase
                .from('responses')
                .select('*')
                .eq('survey_id', surveyId)
                .order('submitted_at', { ascending: false })

            if (rError) throw rError
            allResponses.value = rData || []

            // Загружаем все answers
            if (allResponses.value.length > 0) {
                const respIds = allResponses.value.map(r => r.id)
                const { data: aData, error: aError } = await supabase
                    .from('answers')
                    .select('*')
                    .in('response_id', respIds)

                if (aError) throw aError
                allAnswers.value = aData || []
            }

            if (allResponses.value.length > 0) {
                selectUser(allResponses.value[0])
            }

        } catch (err) {
            console.error("Ошибка загрузки:", err.message)
            alert("Ошибка при получении данных: " + err.message)
        } finally {
            loading.value = false
        }
    })

    const selectUser = (resp) => {
        selectedResponse.value = resp

        questions.value.forEach(q => {
            const existing = allAnswers.value.find(
                a => a.question_id === q.id && a.response_id === resp.id
            )
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
                if (item.id) {
                    const { error } = await supabase
                        .from('answers')
                        .update({
                            score: Number(item.score) || 0,
                            feedback: item.feedback || ''
                        })
                        .eq('id', item.id)

                    if (error) throw error
                }
            }
            alert('Результаты сохранены!')
        } catch (e) {
            console.error("Ошибка сохранения:", e)
            alert('Ошибка сохранения: ' + e.message)
        } finally {
            submitting.value = false
        }
    }

    const formatAnswer = (q, responseId) => {
        const ans = allAnswers.value.find(
            a => a.question_id === q.id && a.response_id === responseId
        )
        if (!ans) return '—'

        if (q.question_type === 'text') return ans.text_answer || '—'
        if (q.question_type === 'scale') return ans.scale_value || '—'

        // Для radio - ищем choice_id
        if (ans.choice_id) {
            const choice = q.choices.find(c => c.id === ans.choice_id)
            return choice ? choice.text : 'Ответ не найден'
        }

        // Для checkbox - парсим JSON массив
        if (ans.text_answer) {
            try {
                const selectedIds = JSON.parse(ans.text_answer)
                const texts = q.choices
                    .filter(c => selectedIds.includes(c.id))
                    .map(c => c.text)
                return texts.length ? texts.join(', ') : 'Ответ не найден'
            } catch {
                return ans.text_answer
            }
        }

        return '—'
    }

    const formatDate = (date) => new Date(date).toLocaleString('ru-RU')
</script>

<style scoped>
    .admin-check-page {
        background-color: #FDFDF1;
        min-height: 100vh;
        color: #212844;
    }

    /* Заголовки */
    .survey-title {
        color: #212844;
        font-size: 2.2rem;
    }

    .user-info-header h2 {
        color: #212844;
        font-size: 1.5rem;
    }

    .btn-back {
        background: white;
        border: 2px solid #212844;
        color: #212844;
        border-radius: 12px;
        padding: 8px 20px;
        font-weight: bold;
        transition: 0.2s;
    }

        .btn-back:hover {
            background: #212844;
            color: #F2C4CE;
        }

    /* Боковое меню */
    .participants-sidebar {
        background: rgba(255, 255, 255, 0.4);
        border-radius: 24px;
        border: 1px solid rgba(33, 40, 68, 0.05);
        margin-top: 20px; /* Отступ от кнопки назад */
    }

    .sidebar-label {
        padding: 15px;
        background: #212844;
        color: #F0E8D5;
        font-weight: bold;
        text-align: center;
        border-radius: 24px 24px 0 0;
    }

    .scroll-area {
        max-height: 70vh;
        overflow-y: auto;
        padding: 10px;
    }

    .user-nav-card {
        width: 100%;
        background: white;
        border: 1px solid transparent;
        border-radius: 16px;
        padding: 15px;
        margin-bottom: 10px;
        text-align: left;
        transition: all 0.3s ease;
    }

        .user-nav-card:hover {
            transform: translateY(-2px);
            border-color: #F2C4CE;
        }

        .user-nav-card.active {
            background: #212844;
            color: white;
            box-shadow: 0 8px 15px rgba(33, 40, 68, 0.15);
        }

    /* Основной контент */
    .results-container {
        padding-bottom: 100px;
    }

    .question-block {
        margin-bottom: 50px;
    }

    .question-heading {
        font-weight: 800;
        margin-bottom: 15px;
    }

    /* УБРАЛИ БЕЛУЮ ПОДЛОЖКУ */
    .answer-display {
        padding: 15px 20px;
        background: rgba(255, 255, 255, 0.2);
        border-left: 5px solid #212844;
        border-radius: 0 15px 15px 0;
    }

    .answer-label {
        font-size: 0.7rem;
        letter-spacing: 1px;
        text-transform: uppercase;
        font-weight: 800;
        opacity: 0.6;
        margin-bottom: 5px;
    }

    .answer-text {
        font-size: 1.15rem;
        font-weight: 600;
    }

    /* Ввод админа */
    .admin-input {
        border: 2px solid white;
        border-radius: 12px;
        background: white;
    }

        .admin-input:focus {
            border-color: #212844;
            box-shadow: none;
        }

    .auto-status {
        font-size: 0.8rem;
        color: #6c757d;
        margin-top: 10px;
    }

    .admin-eval-box {
        background: rgba(242, 196, 206, 0.2); /* Твой soft pink с прозрачностью */
        border: 1px solid #F2C4CE;
    }

    /* Кнопка */
    .btn-save-final {
        background-color: #212844;
        color: #F2C4CE;
        border: none;
        border-radius: 18px;
        padding: 20px 60px;
        font-weight: 700;
        font-size: 1.2rem;
        transition: all 0.3s ease;
    }

    .publish-bottom {
        margin-top: 80px;
        text-align: center;
        padding-bottom: 60px;
    }

    .btn-save-final:hover {
        transform: scale(1.03);
        background: #2a3356;
    }

    .info-badge {
        display: inline-block;
        background: #F2C4CE;
        color: #212844;
        padding: 6px 16px;
        border-radius: 50px;
        font-weight: bold;
    }
</style>
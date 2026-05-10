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
                        <button @click="router.push('/')" class="btn btn-back shadow-sm mb-4" ">
                            <i class="bi bi-arrow-left"></i> Назад
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="text-center p-5">
                <div class="spinner-border text-navy"></div>
            </div>

            <div v-else class="row justify-content-center mt-4">
                <!-- СВОДНАЯ ТАБЛИЦА РЕЗУЛЬТАТОВ -->
                <div class="summary-table-wrapper mb-5" style="margin-top: 40px;">
                    <h3 class="fw-bold mb-3">Сводка результатов ({{ allResponses.length }} участников)</h3>
                    <div class="table-responsive">
                        <table class="summary-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Участник</th>
                                    <th>Результат</th>
                                    <th>Статус</th>
                                    <th>Дата</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(resp, idx) in allResponsesWithScores" :key="resp.id"
                                    @click="selectUser(resp)"
                                    :class="{
                                             'selected-row': selectedResponse?.id === resp.id,
                                             'unchecked-row': resp.hasUnchecked}">
                                    <td>{{ idx + 1 }}</td>
                                    <td>
                                        <span v-if="!isSurvey" class="score-badge">{{ resp.totalScore }} / {{ resp.maxScore }}</span>
                                        <span v-else class="text-muted">—</span>
                                    </td>
                                    <td>
                                        <span v-if="!isSurvey" :class="resp.passed ? 'status-passed' : 'status-failed'">
                                            {{ resp.passed ? '✅ Сдал' : '❌ Не сдал' }}
                                        </span>
                                        <span v-else class="badge-survey">📋 Пройден</span>
                                        <span v-if="resp.hasUnchecked && !isSurvey" class="unchecked-dot" title="Требует проверки">🔍</span>
                                    </td>
                                    <td class="text-muted small">{{ formatDate(resp.submitted_at) }}</td>
                                    <td>
                                        <button @click.stop="selectUser(resp)" class="btn-view-sm">
                                            Смотреть ответы
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div v-if="!selectedResponse" class="empty-state text-center py-5">
                <h4 class="fw-bold">Выберите участника из таблицы</h4>
                <p class="text-muted">Нажмите на строку в таблице результатов, чтобы посмотреть ответы</p>
            </div>
            <div class="col-lg-10">
                <div v-if="selectedResponse" class="results-container mt-5">
                    <div class="user-info-header mb-5">
                        <h2 class="fw-bold mb-3">
                            Ответы: {{ getParticipantName(selectedResponse) }}
                        </h2>
                        <div class="info-badge">Завершено: {{ formatDate(selectedResponse.submitted_at) }}</div>
                    </div>

                    <div v-for="q in questions" :key="q.id" class="question-block mb-5">
                        <h5 class="question-heading mb-3">{{ q.text }}</h5>

                        <div class="answer-display mb-3">
                            <div class="answer-label">Ответ пользователя:</div>
                            <div class="answer-text">{{ formatAnswer(q, selectedResponse.id) }}</div>
                        </div>

                        <div v-if="!isSurvey && (q.question_type === 'radio' || q.question_type === 'checkbox')" class="correct-answer mb-3">
                            <div class="answer-label">Правильный ответ:</div>
                            <div class="answer-text correct">{{ getCorrectAnswers(q) }}</div>
                        </div>

                        <!-- Фидбек для текстовых -->
                        <div v-if="q.question_type === 'text' && !isSurvey" class="eval-box mt-3 p-3">
                            <div class="eval-row">
                                <label class="eval-check">
                                    <input type="checkbox" v-model="editData[q.id].passed">
                                    <span class="eval-check-text">Зачтено</span>
                                </label>
                                <div class="eval-comment">
                                    <input type="text" v-model="editData[q.id].feedback" class="eval-input" placeholder="Комментарий...">
                                </div>
                            </div>
                        </div>
                        <div v-if="!isSurvey && q.question_type !== 'text'" class="auto-status mt-2">
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

</template>

<script setup>
    import { ref, onMounted, reactive, computed } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'
    import { notificationsService } from '../utils/notifications'

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
    const profiles = ref({}) // храним профили участников
    const isSurvey = ref(false)

    onMounted(async () => {
        const surveyId = route.params.id
        if (!surveyId) {
            console.error("ID опроса не найден")
            loading.value = false
            return
        }

        try {
            loading.value = true

            // Заголовок опроса
            const { data: sData } = await supabase
                .from('surveys')
                .select('title, is_survey')
                .eq('id', surveyId)
                .single()

            surveyTitle.value = sData?.title || 'Опрос без названия'
            isSurvey.value = sData?.is_survey || false

            // Вопросы
            const { data: qData, error: qError } = await supabase
                .from('questions')
                .select(`id, text, question_type, order, choices (id, text, is_correct)`)
                .eq('survey_id', surveyId)
                .order('order')

            if (qError) throw qError
            questions.value = qData || []

            // Ответы пользователей
            const { data: rData, error: rError } = await supabase
                .from('responses')
                .select('*')
                .eq('survey_id', surveyId)
                .order('submitted_at', { ascending: false })

            if (rError) throw rError
            allResponses.value = rData || []



            // Загружаем профили участников
            if (allResponses.value.length > 0) {
                const userIds = [...new Set(allResponses.value.map(r => r.user_id).filter(Boolean))]
                if (userIds.length > 0) {
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, first_name, last_name')
                        .in('id', userIds)

                    if (profilesData) {
                        profilesData.forEach(p => {
                            profiles.value[p.id] = p
                        })
                    }
                }
                
                // Ответы
                const respIds = allResponses.value.map(r => r.id)
                const { data: aData, error: aError } = await supabase
                    .from('answers')
                    .select('*')
                    .in('response_id', respIds)

                if (aError) throw aError
                allAnswers.value = aData || []
            }


        } catch (err) {
            console.error("Ошибка загрузки:", err.message)
            alert("Ошибка при получении данных: " + err.message)
        } finally {
            loading.value = false
        }
    })

    const allResponsesWithScores = computed(() => {
        return allResponses.value.map(resp => {
            let totalScore = 0
            let maxScore = 0

            questions.value.forEach(q => {
                if (q.question_type === 'scale') return
                maxScore++

                const ansList = allAnswers.value.filter(a => a.response_id === resp.id && a.question_id === q.id)
                if (ansList.length === 0) return

                if (q.question_type === 'text') {
                    const ans = ansList[0]
                    if (ans.score && Number(ans.score) > 0) totalScore += Number(ans.score)
                    return
                }

                const correctIds = (q.choices || []).filter(c => c.is_correct).map(c => String(c.id))
                const userIds = ansList.map(a => String(a.choice_id)).filter(id => id !== 'null')

                if (correctIds.length > 0 && userIds.length === correctIds.length &&
                    userIds.every(id => correctIds.includes(id))) {
                    totalScore++
                }
            })

            const passed = maxScore > 0 ? (totalScore / maxScore) >= 0.6 : true

            const hasUnchecked = allAnswers.value.some(a =>
                a.response_id === resp.id &&
                questions.value.find(q => q.id === a.question_id)?.question_type === 'text' &&
                a.score === null
            )

            const profile = profiles.value[resp.user_id]
            const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null

            const result = {
                ...resp,
                totalScore,
                maxScore,
                passed,
                hasUnchecked,
                profiles: { full_name: fullName || `Участник #${allResponses.value.indexOf(resp) + 1}` }
            }

            return result  // ← только один return

        }).sort((a, b) => b.totalScore - a.totalScore)
    })

    // Получить имя участника
    const getParticipantName = (resp) => {
        if (!resp) return 'Неизвестный участник'
        const profile = profiles.value[resp.user_id]
        if (profile) {
            return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || `Участник`
        }
        return `Участник #${allResponses.value.indexOf(resp) + 1}`
    }

    const selectUser = (resp) => {
        selectedResponse.value = resp
        questions.value.forEach(q => {
            const existing = allAnswers.value.find(
                a => a.question_id === q.id && a.response_id === resp.id
            )
            editData[q.id] = {
                id: existing?.id,
                passed: existing?.score > 0 || false,  // если score > 0 — зачтено
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
                            score: item.passed ? 1 : 0,  // 1 = зачтено, 0 = не зачтено
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

        await notificationsService.send(selectedResponse.value.user_id, 'Ваш ответ проверен', {
            message: `Проверяющий оценил ваш ответ в опросе "${surveyTitle.value}"`,
            icon: '✅',
            link: `/my-results/${selectedResponse.value.id}`
        })
    }

    const formatAnswer = (q, responseId) => {
        const answers = allAnswers.value.filter(
            a => a.question_id === q.id && a.response_id === responseId
        )
        if (answers.length === 0) return '—'

        if (q.question_type === 'text') return answers[0].text_answer || '—'
        if (q.question_type === 'scale') return answers[0].scale_value || '—'

        if (q.question_type === 'radio') {
            const answer = answers.find(a => a.choice_id)
            if (answer?.choice_id) {
                const choice = q.choices?.find(c => c.id === answer.choice_id)
                return choice?.text || 'Ответ не найден'
            }
            return '—'
        }

        if (q.question_type === 'checkbox') {
            const selectedIds = answers.filter(a => a.choice_id).map(a => a.choice_id)
            if (selectedIds.length === 0) {
                const textAnswer = answers.find(a => a.text_answer)
                if (textAnswer?.text_answer) {
                    try {
                        const parsed = JSON.parse(textAnswer.text_answer)
                        const texts = q.choices?.filter(c => parsed.includes(c.id)).map(c => c.text)
                        return texts?.length ? texts.join(', ') : '—'
                    } catch {
                        return textAnswer.text_answer
                    }
                }
                return '—'
            }
            const texts = q.choices?.filter(c => selectedIds.includes(c.id)).map(c => c.text)
            return texts?.length ? texts.join(', ') : '—'
        }
        return '—'
    }

    const getCorrectAnswers = (q) => {
        const correct = (q.choices || []).filter(c => c.is_correct).map(c => c.text)
        return correct.length ? correct.join(', ') : 'Не указан'
    }

    const formatDate = (date) => new Date(date).toLocaleString('ru-RU')
</script>

<style scoped>
    .admin-check-page {
        background-color: #FDFDF1;
        min-height: 100vh;
        color: #212844;
    }

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
        word-break: break-word; /* ← перенос длинных слов */
        overflow-wrap: break-word; /* ← запасной вариант */
        white-space: pre-wrap; /* ← сохраняет пробелы и переносит */
    }

    .admin-input {
        border: 2px solid #dee2e6;
        border-radius: 12px;
        background: white;
        padding: 10px 14px;
        font-weight: 600;
    }

        .admin-input:focus {
            border-color: #212844;
            box-shadow: none;
            outline: none;
        }

    .auto-status {
        font-size: 0.8rem;
        color: #6c757d;
        margin-top: 10px;
    }

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

    .eval-box {
        background: white;
        border: 2px solid #dee2e6;
        border-radius: 14px;
        transition: border-color 0.2s;
    }

        .eval-box:has(input:checked) {
            border-color: #198754;
            background: rgba(25, 135, 84, 0.03);
        }

    .eval-row {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .eval-check {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        flex-shrink: 0;
    }

        .eval-check input[type="checkbox"] {
            width: 22px;
            height: 22px;
            accent-color: #198754;
            cursor: pointer;
        }

    .eval-check-text {
        font-weight: 800;
        font-size: 0.85rem;
        color: #212844;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .eval-comment {
        flex: 1;
        min-width: 0;
    }

    .eval-input {
        width: 100%;
        border: none;
        border-bottom: 1px solid rgba(33, 40, 68, 0.15);
        padding: 8px 0;
        font-size: 0.9rem;
        font-weight: 500;
        color: #212844;
        background: transparent;
        transition: border-color 0.2s;
    }

        .eval-input:focus {
            outline: none;
            border-bottom-color: #212844;
        }

        .eval-input::placeholder {
            color: #adb5bd;
            font-weight: 400;
        }

    .summary-table-wrapper {
        background: white;
        border-radius: 20px;
        border: 2px solid #212844;
        padding: 20px;
    }

    .summary-table {
        width: 100%;
        border-collapse: collapse;
    }

        .summary-table th {
            text-align: left;
            padding: 12px 16px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            color: #888;
            border-bottom: 2px solid #212844;
        }

        .summary-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #eee;
        }

        .summary-table tr:hover {
            background: #FDFDF1;
            cursor: pointer;
        }

    .selected-row {
        background: #F2C4CE44 !important;
    }

    .score-badge {
        font-weight: 800;
        color: #212844;
        font-size: 1rem;
    }

    .status-passed {
        background: #d1e7dd;
        color: #0f5132;
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.8rem;
    }

    .status-failed {
        background: #F2C4CE;
        color: #212844;
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.8rem;
    }

    .btn-view-sm {
        background: #212844;
        color: #F2C4CE;
        border: none;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
    }

        .btn-view-sm:hover {
            background: #2d365a;
        }

    @media (max-width: 768px) {
        .summary-table-wrapper {
            overflow-x: auto;
        }

        .summary-table {
            min-width: 500px;
            font-size: 0.8rem;
        }

        .d-flex.justify-content-between {
            flex-direction: column;
            gap: 12px;
        }

        .btn-back {
            width: 100%;
            text-align: center;
        }
    }

    .unchecked-row {
        background: #fef9e7 !important;
    }

    .unchecked-dot {
        margin-left: 6px;
        font-size: 0.8rem;
    }
</style>
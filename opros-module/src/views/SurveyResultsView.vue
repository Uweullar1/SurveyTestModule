<template>
    <div class="admin-check-page">
        <div class="container py-5">

            <div class="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h1 class="fw-bold survey-title mb-2">{{ surveyTitle }}</h1>
                    <p class="text-muted">Панель проверки ответов</p>
                </div>
                <button @click="router.push('/my-surveys')" class="btn btn-back shadow-sm">
                    ← Назад
                </button>
            </div>

            <div v-if="loading" class="text-center p-5">
                <div class="spinner-border text-navy"></div>
            </div>

            <div v-else>


                <!-- СВОДНАЯ ТАБЛИЦА -->
                <div class="summary-table-wrapper mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="fw-bold m-0">Сводка результатов ({{ allResponses.length }})</h3>
                        <div class="export-bar">
                            <select v-model="filterDate" class="export-select">
                                <option value="all">Всё время</option>
                                <option value="today">Сегодня</option>
                                <option value="week">Неделя</option>
                                <option value="month">Месяц</option>
                            </select>
                            <button @click="exportToCSV" class="export-btn">📥 Экспорт CSV</button>
                        </div>
                    </div>

                    <!-- СТАТИСТИКА ВНУТРИ ТАБЛИЦЫ -->
                    <div class="stats-inline" v-if="!isSurvey && allResponses.length > 0">
                        <span class="stats-item">Средний балл: <strong>{{ averageScore }}/{{ maxPossibleScore }}</strong></span>
                        <span class="stats-divider">·</span>
                        <span class="stats-item">Успешно: <strong>{{ passedCount }} из {{ allResponses.length }}</strong></span>
                        <span class="stats-divider">·</span>
                        <span class="stats-item">Не сдано: <strong>{{ allResponses.length - passedCount }}</strong></span>
                    </div>
                            <div class="table-responsive">
                                <table class="summary-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th @click="toggleSort('name')" class="sortable">Участник {{ sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}</th>
                                            <th v-if="!isSurvey" @click="toggleSort('score')" class="sortable">Результат {{ sortField === 'score' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}</th>
                                            <th>Статус</th>
                                            <th @click="toggleSort('date')" class="sortable">Дата {{ sortField === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(resp, idx) in allResponsesWithScores" :key="resp.id"
                                            @click="selectUser(resp)"
                                            :class="{ 'selected-row': selectedResponse?.id === resp.id, 'unchecked-row': resp.hasUnchecked }">
                                            <td>{{ idx + 1 }}</td>
                                            <td><div class="fw-bold">{{ getParticipantName(resp) }}</div></td>
                                            <td v-if="!isSurvey"><span class="score-badge">{{ resp.totalScore }} / {{ resp.maxScore }}</span></td>
                                            <td>
                                                <span v-if="!isSurvey" :class="resp.passed ? 'status-passed' : 'status-failed'">{{ resp.passed ? '✅ Сдал' : '❌ Не сдал' }}</span>
                                                <span v-else class="badge-survey">📋 Пройден</span>
                                                <span v-if="resp.hasUnchecked && !isSurvey" class="unchecked-dot" title="Требует проверки">🔍</span>
                                            </td>
                                            <td class="text-muted small">{{ formatDate(resp.submitted_at) }}</td>
                                            <td><button @click.stop="selectUser(resp)" class="btn-view-sm">Смотреть ответы</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                    </div>

                    <div v-if="!selectedResponse" class="empty-state text-center py-4">
                        <p class="text-muted">Выберите участника из таблицы, чтобы посмотреть ответы</p>
                    </div>

                    <!-- ДЕТАЛЬНЫЕ ОТВЕТЫ -->
                    <div v-if="selectedResponse" class="results-container mt-4">
                        <div class="user-info-header mb-4">
                            <h2 class="fw-bold mb-2">Ответы: {{ getParticipantName(selectedResponse) }}</h2>
                            <div class="info-badge">Завершено: {{ formatDate(selectedResponse.submitted_at) }}</div>
                        </div>

                        <div v-for="q in questions" :key="q.id" class="question-block mb-4">
                            <h5 class="question-heading mb-2">{{ q.text }}</h5>

                            <div class="answer-display mb-2">
                                <div class="answer-label">Ответ пользователя:</div>
                                <div class="answer-text">{{ formatAnswer(q, selectedResponse.id) }}</div>
                            </div>

                            <div v-if="!isSurvey && !q.no_evaluation && (q.question_type === 'radio' || q.question_type === 'checkbox')" class="correct-answer mb-3">
                                <div class="answer-label">Правильный ответ:</div>
                                <div class="answer-text correct">{{ getCorrectAnswers(q) }}</div>
                            </div>

                            <div v-if="q.question_type === 'text' && !isSurvey" class="eval-box mt-2 p-3">
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
                            <div v-if="!isSurvey && q.question_type !== 'text'" class="auto-status mt-1">
                                <i class="bi bi-patch-check-fill text-success"></i> Проверено автоматически
                            </div>
                        </div>

                        <!-- ФОРМА ПРИНЯТИЯ НА СТАЖИРОВКУ (только для анкеты и только для создателей) -->
                        <div v-if="isAnketa && isCreator && !isAdmin" class="accept-section mt-4">
                            <button v-if="!showAcceptForm"
                                    @click="showAcceptForm = true"
                                    class="btn-accept">
                                ✅ Принять на стажировку
                            </button>

                            <div v-if="showAcceptForm" class="accept-form mt-3 p-4">
                                <h5>🎓 Принять кандидата на стажировку</h5>
                                <p class="text-muted mb-3">Выберите департамент, в который будет зачислен стажер:</p>

                                <div class="form-group mb-3">
                                    <label class="form-label fw-bold">Департамент:</label>
                                    <select v-model="internDepartmentId"
                                            class="form-select dept-select">
                                        <option value="">— выберите департамент —</option>
                                        <option v-for="d in departments"
                                                :key="d.id"
                                                :value="d.id">
                                            {{ d.name }}
                                        </option>
                                    </select>
                                </div>

                                <div class="accept-actions">
                                    <button @click="acceptIntern"
                                            class="btn-confirm"
                                            :disabled="!internDepartmentId">
                                        ✅ Подтвердить и принять
                                    </button>
                                    <button @click="showAcceptForm = false; internDepartmentId = ''"
                                            class="btn-cancel">
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Админ видит фидбек создателя -->
                        <div v-if="isAdmin && existingFeedback" class="overall-feedback-display mt-4 p-3">
                            <h5>💬 Фидбек проверяющего:</h5>
                            <p>{{ existingFeedback }}</p>
                        </div>

                        <!-- Создатель может оставить фидбек -->
                        <div v-if="!isAdmin" class="overall-feedback mt-4 p-3">
                            <h5>Общий комментарий по прохождению</h5>
                            <textarea v-model="overallFeedback" class="eval-input" rows="3" placeholder="Оставьте общий фидбек..."></textarea>
                            <button @click="saveOverallFeedback" class="btn-save-final mt-2">💬 Отправить фидбек</button>
                        </div>

                        <div class="publish-bottom">
                            <div class="action-buttons">
                                <button v-if="!isAnketa && !isAdmin" @click="sendToAdmin" class="btn-send-admin">📤 На рассмотрение руководителю</button>
                                <button @click="exportInternFullData" class="btn-export-full">📥 Экспорт всех данных</button>
                            </div>
                            <button v-if="!isAnketa" @click="saveEvaluation" :disabled="submitting" class="btn-save-final shadow-lg">
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

    const sortField = ref('score') // 'score' | 'name' | 'date'
    const sortOrder = ref('desc') // 'asc' | 'desc'

    const isAdmin = ref(false)
    const existingFeedback = ref('')
    const loading = ref(true)
    const submitting = ref(false)
    const surveyTitle = ref('')
    const questions = ref([])
    const allResponses = ref([])
    const allAnswers = ref([])
    const selectedResponse = ref(null)
    const editData = reactive({})
    const profiles = ref({})
    const isSurvey = ref(false)
    const filterDate = ref('all')
    const overallFeedback = ref('')
    const showAcceptForm = ref(false)
    const internDepartmentId = ref('')
    const departments = ref([])
    const showAcceptForm = ref(false)
    const isAnketa = computed(() => route.params.id === 'f4bb9a82-31d2-4b53-bf7c-48d814bca84c')
    const isCreator = ref(false) // Добавь для проверки роли создателя



    const saveOverallFeedback = async () => {
        if (!overallFeedback.value.trim()) return alert('Введите комментарий')

        const respId = selectedResponse.value.id
        console.log('ID:', respId)
        console.log('Feedback text:', overallFeedback.value)

        const { error } = await supabase.rpc('update_response_feedback', {
            response_id: respId,
            new_feedback: overallFeedback.value
        })

        console.log('RPC ошибка:', error)

        if (error) {
            alert('Ошибка: ' + error.message)
        } else {
            existingFeedback.value = overallFeedback.value
            if (selectedResponse.value) {
                selectedResponse.value.feedback = overallFeedback.value
            }
            alert('Фидбек отправлен!')
            overallFeedback.value = ''
        }

            // Уведомление пользователю
            if (selectedResponse.value?.user_id) {
                await notificationsService.send(selectedResponse.value.user_id, 'Получен новый фидбек', {
                    message: `Проверяющий оставил комментарий к опросу "${surveyTitle.value}"`,
                    icon: '💬',
                    link: `/my-results/${selectedResponse.value.id}`
                })
            }
    }

    onMounted(async () => {
        const surveyId = route.params.id
        if (!surveyId) { loading.value = false; return }

        try {
            loading.value = true

            // Проверяем роль пользователя
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                isCreator.value = profile?.role === 'creator'
            }

            const { data: sData } = await supabase
                .from('surveys')
                .select('title, is_survey')
                .eq('id', surveyId).single()
            surveyTitle.value = sData?.title || 'Опрос без названия'
            isSurvey.value = sData?.is_survey || false

            const { data: qData } = await supabase
                .from('questions')
                .select('id, text, question_type, no_evaluation, choices(id, text, is_correct)')
                .eq('survey_id', surveyId)
                .order('order')
            if (!qData) throw new Error('Questions not loaded')
            questions.value = qData

            // Загружаем департаменты ВСЕГДА
            const { data: depts } = await supabase
                .from('departments')
                .select('*')
                .order('name')
            departments.value = depts || []

            const { data: rData } = await supabase
                .from('responses')
                .select('*')
                .eq('survey_id', surveyId)
                .order('submitted_at', { ascending: false })
            allResponses.value = rData || []

            if (allResponses.value.length > 0) {
                const userIds = [...new Set(allResponses.value.map(r => r.user_id).filter(Boolean))]
                if (userIds.length > 0) {
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, first_name, last_name')
                        .in('id', userIds)
                    if (profilesData) profilesData.forEach(p => { profiles.value[p.id] = p })
                }

                const { data: adminCheck } = await supabase
                    .from('admins')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .maybeSingle()
                isAdmin.value = !!adminCheck

                const respIds = allResponses.value.map(r => r.id)
                const { data: aData } = await supabase
                    .from('answers')
                    .select('*')
                    .in('response_id', respIds)
                allAnswers.value = aData || []
            }

            const selectedUserId = route.query.user
            if (selectedUserId && allResponses.value.length > 0) {
                const resp = allResponsesWithScores.value.find(r => r.user_id === selectedUserId)
                if (resp) selectUser(resp)
            }
        } catch (err) {
            console.error("Ошибка загрузки:", err.message)
            alert("Ошибка при получении данных: " + err.message)
        } finally {
            loading.value = false
        }
    })


    const allResponsesWithScores = computed(() => {
        let result = allResponses.value.map(resp => {
            let totalScore = 0, maxScore = 0
            questions.value.forEach(q => {
                if (q.question_type === 'scale') return
                if (q.no_evaluation) return
                maxScore++
                const ansList = allAnswers.value.filter(a => a.response_id === resp.id && a.question_id === q.id)
                if (ansList.length === 0) return
                if (q.question_type === 'text') {
                    if (ansList[0]?.score > 0) totalScore += Number(ansList[0].score)
                    return
                }
                const correctIds = (q.choices || []).filter(c => c.is_correct).map(c => String(c.id))
                const userIds = ansList.map(a => String(a.choice_id)).filter(id => id !== 'null')
                if (correctIds.length && userIds.length === correctIds.length && userIds.every(id => correctIds.includes(id))) totalScore++
            })
            const profile = profiles.value[resp.user_id]
            return {
                ...resp,
                totalScore, maxScore,
                passed: maxScore > 0 ? totalScore / maxScore >= 0.6 : true,
                hasUnchecked: allAnswers.value.some(a => a.response_id === resp.id && questions.value.find(q => q.id === a.question_id)?.question_type === 'text' && a.score === null),
                profiles: { full_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || `Участник #${allResponses.value.indexOf(resp) + 1}` : `Участник #${allResponses.value.indexOf(resp) + 1}` },
                feedback: resp.feedback || null
            }
        })

        if (sortField.value === 'score') {
            result.sort((a, b) => sortOrder.value === 'desc' ? b.totalScore - a.totalScore : a.totalScore - b.totalScore)
        } else if (sortField.value === 'name') {
            result.sort((a, b) => {
                const nameA = (a.profiles?.full_name || '').toLowerCase()
                const nameB = (b.profiles?.full_name || '').toLowerCase()
                return sortOrder.value === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
            })
        } else if (sortField.value === 'date') {
            result.sort((a, b) => sortOrder.value === 'desc' ? new Date(b.submitted_at) - new Date(a.submitted_at) : new Date(a.submitted_at) - new Date(b.submitted_at))
        }


        return result
    })

    const toggleSort = (field) => {
        if (sortField.value === field) {
            sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
        } else {
            sortField.value = field
            sortOrder.value = 'desc'
        }
    }


    const averageScore = computed(() => {
        const withScores = allResponsesWithScores.value.filter(r => r.maxScore > 0)
        return withScores.length ? (withScores.reduce((s, r) => s + r.totalScore, 0) / withScores.length).toFixed(1) : '—'
    })

    const maxPossibleScore = computed(() => questions.value.filter(q => q.question_type !== 'scale').length)

    const passedCount = computed(() => allResponsesWithScores.value.filter(r => r.passed).length)

    const getParticipantName = (resp) => {
        if (!resp) return '—'
        const p = profiles.value[resp.user_id]
        return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Участник' : `Участник #${allResponses.value.indexOf(resp) + 1}`
    }

    const selectUser = (resp) => {
        selectedResponse.value = resp
        existingFeedback.value = resp.feedback || ''
        questions.value.forEach(q => {
            const existing = allAnswers.value.find(a => a.question_id === q.id && a.response_id === resp.id)
            editData[q.id] = { id: existing?.id, passed: existing?.score > 0, feedback: existing?.feedback || '' }
        })
    }

    const saveEvaluation = async () => {
        submitting.value = true
        try {
            for (const qId in editData) {
                const item = editData[qId]
                if (item.id) {
                    await supabase.from('answers').update({ score: item.passed ? 1 : 0, feedback: item.feedback || '' }).eq('id', item.id)
                }
            }
            alert('Результаты сохранены!')
            if (selectedResponse.value?.user_id) {
                await notificationsService.send(selectedResponse.value.user_id, 'Ваш ответ проверен', {
                    message: `Проверяющий оценил ваш ответ в опросе "${surveyTitle.value}"`,
                    icon: '✅',
                    link: `/my-results/${selectedResponse.value.id}`
                })
            }
        } catch (e) {
            console.error(e)
            alert('Ошибка сохранения')
        } finally {
            submitting.value = false
        }
    }

    const formatAnswer = (q, responseId) => {
        const answers = allAnswers.value.filter(a => a.question_id === q.id && a.response_id === responseId)
        if (!answers.length) return '—'
        if (q.question_type === 'text') return answers[0].text_answer || '—'
        if (q.question_type === 'scale') return answers[0].scale_value || '—'
        if (q.question_type === 'radio') {
            const c = q.choices?.find(c => c.id === answers.find(a => a.choice_id)?.choice_id)
            return c?.text || '—'
        }
        if (q.question_type === 'checkbox') {
            const ids = answers.filter(a => a.choice_id).map(a => a.choice_id)
            return q.choices?.filter(c => ids.includes(c.id)).map(c => c.text).join(', ') || '—'
        }
        return '—'
    }

    const getCorrectAnswers = (q) => {
        const correct = (q.choices || []).filter(c => c.is_correct).map(c => c.text)
        return correct.length ? correct.join(', ') : 'Не указан'
    }

    const formatDate = (date) => new Date(date).toLocaleString('ru-RU')

    const exportToCSV = () => {
        // Фильтр по дате

        let data = [...allResponsesWithScores.value]
        const now = new Date()

        if (filterDate.value === 'today') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            data = data.filter(r => new Date(r.submitted_at) >= today)
        } else if (filterDate.value === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            data = data.filter(r => new Date(r.submitted_at) >= weekAgo)
        } else if (filterDate.value === 'month') {
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            data = data.filter(r => new Date(r.submitted_at) >= monthAgo)
        }

        const headers = ['Участник', 'Баллы', 'Статус', 'Дата']
        const rows = data.map(r => [
            r.profiles?.full_name || 'Неизвестный',
            `${r.totalScore}/${r.maxScore}`,
            r.passed ? 'Сдал' : 'Не сдал',
            formatDate(r.submitted_at)
        ])

        let csv = headers.join(',') + '\n'
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n'
        })

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        const period = filterDate.value === 'all' ? 'все' : filterDate.value
        link.download = `результаты_${surveyTitle.value.replace(/\s+/g, '_')}_${period}.csv`
        link.click()
    }

    const exportInternFullData = async () => {
        const resp = selectedResponse.value
        if (!resp) return alert('Выберите участника')

        // Загружаем все ответы этого пользователя на все опросы стажировки
        const { data: allResponses } = await supabase
            .from('responses')
            .select('id, submitted_at, survey_id, surveys!inner(title)')
            .eq('user_id', resp.user_id)
            .order('submitted_at')

        let csv = 'Опрос,Дата,Вопрос,Ответ\n'

        for (const r of allResponses || []) {
            const { data: answers } = await supabase
                .from('answers')
                .select('text_answer, scale_value, question_id, questions!inner(text)')
                .eq('response_id', r.id)

            for (const a of answers || []) {
                const answer = a.text_answer || a.scale_value || '—'
                csv += `"${r.surveys.title}","${formatDate(r.submitted_at)}","${a.questions.text}","${answer}"\n`
            }
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `стажер_данные.csv`
        link.click()
    }

    const sendToAdmin = async () => {
        if (!selectedResponse.value) return alert('Выберите участника')

        await supabase.from('responses').update({ sent_to_admin: true }).eq('id', selectedResponse.value.id)

        const { data: admins } = await supabase.from('admins').select('user_id')
        if (admins) {
            for (const admin of admins) {
                await notificationsService.send(admin.user_id, 'Кандидат на рассмотрение', {
                    message: `Создатель отправил кандидата на согласование. Опрос: "${surveyTitle.value}"`,
                    icon: '📤',
                    link: `/results/${route.params.id}/admin?user=${selectedResponse.value.user_id}`
                })
            }
        }
        alert('Отправлено руководителю!')
    }

    const isAnketa = computed(() => route.params.id === 'f4bb9a82-31d2-4b53-bf7c-48d814bca84c')

    const acceptIntern = async () => {
        if (!selectedResponse.value) return alert('Выберите кандидата')
        if (!internDepartmentId.value) return alert('Выберите департамент')

        const userId = selectedResponse.value.user_id
        const selectedDept = departments.value.find(d => d.id === internDepartmentId.value)

        const { error } = await supabase.from('profiles').update({
            department_id: internDepartmentId.value,
            is_intern: true
        }).eq('id', userId)

        if (error) {
            console.error('Ошибка при назначении стажера:', error)
            return alert('Ошибка: ' + error.message)
        }

        await notificationsService.send(userId, 'Вы приняты на стажировку!', {
            message: `Вы зачислены в департамент "${selectedDept?.name}". Вам открыт доступ к тестам.`,
            icon: '🎓',
            link: '/'
        })

        alert(`Кандидат успешно принят на стажировку в департамент "${selectedDept?.name}"!`)

        // Сбрасываем форму
        showAcceptForm.value = false
        internDepartmentId.value = ''

        // Обновляем данные пользователя в интерфейсе
        if (profiles.value[userId]) {
            profiles.value[userId].is_intern = true
            profiles.value[userId].department_id = internDepartmentId.value
        }
    }

</script>

<style scoped>
    .admin-check-page {
        background: #FDFDF1;
        min-height: 100vh;
        color: #212844;
    }

    .survey-title {
        font-size: 2rem;
        font-weight: 900;
    }

    .btn-back {
        background: white;
        border: 2px solid #212844;
        border-radius: 12px;
        padding: 8px 20px;
        font-weight: bold;
        cursor: pointer;
        margin-bottom:20px;
    }

        .btn-back:hover {
            background: #212844;
            color: #F2C4CE;
        }


    .stat-card {
        flex: 1;
        min-width: 160px;
        background: white;
        border: 2px solid #212844;
        border-radius: 16px;
        padding: 16px;
    }

    .stat-label {
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #888;
        margin-bottom: 4px;
    }

    .stat-value {
        font-size: 1.2rem;
        font-weight: 900;
        color: #212844;
    }

    .stat-value-small {
        font-size: 0.8rem;
        font-weight: 600;
    }

    .dept-stat-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
    }

    .summary-table-wrapper {
        background: white;
        border: 2px solid #212844;
        border-radius: 20px;
        padding: 20px;
    }

    .summary-table {
        width: 100%;
        border-collapse: collapse;

    }

        .summary-table th {
            text-align: left;
            padding: 10px 14px;
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            color: #888;
            border-bottom: 2px solid #212844;
            background: #FDFDF1;
        }

        .summary-table td {
            padding: 10px 14px;
            border-bottom: 1px solid #eee;
        }

        .summary-table tr:hover {
            background: #FDFDF1;
            cursor: pointer;
        }

    .selected-row {
        background: #F2C4CE44 !important;
    }

    .unchecked-row {
        background: #fef9e7 !important;
    }

    .badge-survey {
        background: #B0D7FF;
        color: #212844;
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.8rem;
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

    .unchecked-dot {
        margin-left: 6px;
    }

    .score-badge {
        font-weight: 800;
        color: #212844;
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

    .results-container {
        padding-bottom: 60px;
    }

    .question-block {
        margin-bottom: 30px;
    }

    .question-heading {
        font-weight: 800;
    }

    .answer-display {
        padding: 12px 16px;
        background: rgba(0,0,0,0.02);
        border-left: 4px solid #212844;
        border-radius: 0 12px 12px 0;
    }

    .answer-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        font-weight: 800;
        opacity: 0.5;
    }

    .answer-text {
        font-size: 1rem;
        font-weight: 600;
        word-break: break-word;
    }

    .correct-answer {
        font-size: 0.85rem;
        color: #198754;
        background: #d1e7dd44;
        padding: 8px 12px;
        border-radius: 8px;
    }

    .eval-box {
        background: white;
        border: 2px solid #dee2e6;
        border-radius: 14px;
    }

    .eval-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .eval-check {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
    }

    .eval-check-text {
        font-weight: 800;
        font-size: 0.8rem;
        text-transform: uppercase;
    }

    .eval-input {
        width: 100%;
        border: none;
        border-bottom: 1px solid #ddd;
        padding: 6px 0;
    }

    .auto-status {
        font-size: 0.75rem;
        color: #6c757d;
    }

    .info-badge {
        display: inline-block;
        background: #F2C4CE;
        color: #212844;
        padding: 4px 14px;
        border-radius: 50px;
        font-weight: bold;
        font-size: 0.85rem;
    }

    .btn-save-final {
        background: #212844;
        color: #F2C4CE;
        border: none;
        border-radius: 18px;
        padding: 16px 50px;
        font-weight: 700;
        font-size: 1.1rem;
        cursor: pointer;
    }

    .publish-bottom {
        margin-top: 40px;
        text-align: center;
    }

    @media (max-width: 768px) {
        .summary-table-wrapper {
            overflow-x: auto;
        }

        .summary-table {
            min-width: 500px;
        }
    }
    .stats-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        font-size: 0.85rem;
        color: #666;
        border-bottom: 1px solid #eee;
        margin-bottom: 8px;
    }

    .stats-item strong {
        color: #212844;
    }

    .stats-divider {
        color: #ccc;
    }

    .sortable {
        cursor: pointer;
        user-select: none;
    }

        .sortable:hover {
            color: #212844;
        }

    
    .export-bar {
        display: flex;
        align-items: center;
    }

    .export-select {
        height: 38px;
        padding: 0 14px;
        border: 2px solid #212844;
        border-right: none;
        border-radius: 10px 0 0 10px;
        font-size: 0.8rem;
        font-weight: 700;
        color: #212844;
        background: white;
        cursor: pointer;
    }

        .export-select:focus {
            outline: none;
        }

    .export-btn {
        height: 38px;
        padding: 0 16px;
        border: 2px solid #212844;
        border-radius: 0 10px 10px 0;
        background: white;
        font-weight: 700;
        font-size: 0.8rem;
        color: #212844;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
    }

        .export-btn:hover {
            background: #212844;
            color: #F2C4CE;
        }

    .btn-send-admin {
        background: white;
        border: 2px solid #212844;
        border-radius: 14px;
        padding: 12px 24px;
        font-weight: 700;
        cursor: pointer;
        margin-bottom: 12px;
        margin-right: 12px;
        transition: all 0.2s;
    }

        .btn-send-admin:hover {
            background: #212844;
            color: #F2C4CE;
        }

    .action-buttons {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }

    .btn-export-full {
        background: white;
        border: 2px solid #212844;
        border-radius: 12px;
        padding: 10px 20px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
    }

        .btn-export-full:hover {
            background: #212844;
            color: #F2C4CE;
        }

    .overall-feedback-display {
        background: #FDFDF1;
        border: 2px solid #212844;
        border-radius: 16px;
        padding: 20px;
    }

    .overall-feedback {
        background: white;
        border: 2px solid #212844;
        border-radius: 16px;
        padding: 20px;
    }

    .btn-accept {
        background: #d1e7dd;
        border: 2px solid #198754;
        border-radius: 14px;
        padding: 12px 24px;
        font-weight: 700;
        cursor: pointer;
        margin-right: 12px;
        transition: all 0.2s;
    }

        .btn-accept:hover {
            background: #198754;
            color: white;
        }

    .accept-section {
        margin-top: 20px;
        border-top: 2px solid #e9ecef;
        padding-top: 20px;
    }

    .accept-form {
        background: white;
        border: 2px solid #198754;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(25, 135, 84, 0.1);
    }

        .accept-form h5 {
            color: #198754;
            font-weight: 800;
            margin-bottom: 8px;
        }

    .dept-select {
        width: 100%;
        padding: 12px;
        border: 2px solid #212844;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 500;
        color: #212844;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
    }

        .dept-select:focus {
            outline: none;
            border-color: #198754;
            box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.1);
        }

        .dept-select option {
            padding: 8px;
            font-weight: 500;
        }

    .accept-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
    }

    .btn-confirm {
        background: #198754;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        flex: 1;
    }

        .btn-confirm:hover:not(:disabled) {
            background: #157347;
            transform: translateY(-1px);
        }

        .btn-confirm:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

    .btn-cancel {
        background: white;
        border: 2px solid #dc3545;
        color: #dc3545;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }

        .btn-cancel:hover {
            background: #dc3545;
            color: white;
        }

    .form-label {
        display: block;
        margin-bottom: 8px;
        color: #212844;
        font-size: 0.9rem;
    }
</style>
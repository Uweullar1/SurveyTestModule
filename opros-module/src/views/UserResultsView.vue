<template>
    <div class="container py-5 text-center">
        <h2 class="fw-bold mb-4">Результаты: {{ surveyTitle }}</h2>

        <div class="card border-0 shadow-sm bg-white rounded-4 mb-5 p-4">
            <div class="score-display fw-bold">
                {{ totalScore }} <span style="font-size: 1.5rem; color: #6c757d;">из {{ maxScore }}</span>
            </div>
            <div class="text-muted fw-bold text-uppercase">Итоговый балл</div>
        </div>

        <div v-for="(q, i) in questions" :key="q.id" class="question-card shadow-sm">
            <h5 class="fw-bold mb-3">
                <span class="badge bg-dark me-2">{{ i + 1 }}</span> {{ q.text }}
            </h5>

            <div class="answer-section"
                 :class="getAnswerClass(q)">
                <strong>Ваш ответ:</strong> {{ formatUserAnswer(q) }}
            </div>

            <div v-if="q.question_type !== 'text' && q.question_type !== 'scale'"
                 class="answer-section"
                 :class="formatUserAnswer(q) === getCorrectAnswerText(q) ? 'correct-ans-block' : 'neutral-ans-block'">
                <strong>Правильный ответ:</strong> {{ getCorrectAnswerText(q) }}
            </div>
        </div>

        <div class="publish-bottom">
            <button @click="goBack" class="btn btn-dark px-5 shadow">
                Вернуться в историю
            </button>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, computed } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const route = useRoute()
    const router = useRouter()   // ← добавили router

    const surveyTitle = ref('Опрос')
    const questions = ref([])
    const allAnswers = ref([])

    const goBack = () => {
        router.push('/my-history')
    }

    onMounted(async () => {
        const responseId = route.params.id
        if (!responseId) {
            console.log("Нет responseId в URL")
            return
        }

        try {
            console.log("Загружаем результаты для responseId:", responseId)

            const { data: responseData, error: respError } = await supabase
                .from('responses')
                .select('survey_id')
                .eq('id', responseId)
                .single()

            if (respError || !responseData) {
                console.error("Ошибка получения response:", respError)
                console.log("Прохождение не найдено для responseId:", responseId)
                return
            }

            const surveyId = responseData.survey_id
            console.log("Найден surveyId:", surveyId)

            // Название опроса
            const { data: sData } = await supabase
                .from('surveys')
                .select('title')
                .eq('id', surveyId)

            surveyTitle.value = sData?.[0]?.title || 'Опрос'

            // Вопросы
            const { data: qData } = await supabase
                .from('questions')
                .select('id, text, question_type, choices(id, text, is_correct)')
                .eq('survey_id', surveyId)
                .order('order')

            questions.value = qData || []

            // Ответы
            const { data: aData } = await supabase
                .from('answers')
                .select('*')
                .eq('response_id', responseId)

            allAnswers.value = aData || []

            console.log("Загружено ответов:", allAnswers.value.length)

        } catch (err) {
            console.error('Общая ошибка загрузки результатов:', err)
        }
    })

    const formatUserAnswer = (q) => {
        const ansList = allAnswers.value.filter(a => a.question_id === q.id)
        if (ansList.length === 0) return '—'

        if (q.question_type === 'text') return ansList[0].text_answer || '—'
        if (q.question_type === 'scale') return (ansList[0].scale_value || ansList[0].text_answer) + '/10'

        const ids = ansList.map(a => a.choice_id).filter(id => id != null)

        const texts = q.choices
            .filter(c => ids.some(id => String(id) === String(c.id)))
            .map(c => c.text)

        return texts.length ? texts.join(', ') : '—'
    }

    const getCorrectAnswerText = (q) => {
        if (!q.choices) return '—'
        const correct = q.choices.filter(c => c.is_correct === true).map(c => c.text)
        return correct.length ? correct.join(', ') : '—'
    }

    const maxScore = computed(() => questions.value.filter(q => q.question_type !== 'scale').length)

    const totalScore = computed(() => {
        let score = 0

        questions.value.forEach(q => {
            if (q.question_type === 'scale') return

            const ansList = allAnswers.value.filter(a => a.question_id === q.id)
            if (ansList.length === 0) return

            // Если это открытый вопрос (text) — проверяем, есть ли ручная оценка
            if (q.question_type === 'text') {
                const ans = ansList[0]
                // Если админ поставил балл > 0 — засчитываем
                if (ans.score && Number(ans.score) > 0) {
                    score++
                }
                return
            }

            // Для single / multiple — автоматическая проверка
            const correctIds = q.choices.filter(c => c.is_correct === true).map(c => String(c.id))
            const userIds = ansList.map(a => String(a.choice_id)).filter(id => id !== 'null')

            if (correctIds.length > 0 && userIds.length === correctIds.length &&
                userIds.every(id => correctIds.includes(id))) {
                score++
            }
        })

        return score
    })

    const getAnswerClass = (q) => {
        // Если это текст или шкала — возвращаем нейтральный серый стиль без цвета
        if (q.question_type === 'text' || q.question_type === 'scale') {
            return 'neutral-ans-block';
        }

        // Для тестов: если совпало с правильным — зеленый, если нет — розовый
        return formatUserAnswer(q) === getCorrectAnswerText(q)
            ? 'correct-ans-block'
            : 'user-ans-block';
    }
</script>

<style scoped>
    /* Общий фон страницы */
    .container {
        max-width: 800px;
        margin: 0 auto;
    }

    .question-card {
        background-color: #ffffff;
        border-radius: 20px;
        padding: 30px;
        margin-bottom: 25px;
        text-align: left; /* Текст вопроса слева для структуры */
    }

    /* Заголовки */
    h2, h5 {
        color: #212844; /* Твой темно-синий */
    }

    /* Блок итогового балла */
    .score-display {
        font-size: 3.5rem;
        color: #212844;
    }

    /* Стилизация ответов */
    .answer-section {
        border-radius: 12px;
        padding: 15px;
        margin-top: 10px;
        transition: all 0.3s ease;
    }

    /* Обычный блок (если ответ неверный) */
    .user-ans-block {
        background-color: #F2C4CE;
        color: #212844;
        border-left: 5px solid #212844;
    }

    .neutral-ans-block {
        background-color: #f8f9fa; /* Светло-серый */
        color: #212844;
        border-left: 5px solid #dee2e6;
    }

    .correct-ans-block {
        background-color: #d1e7dd;
        color: #0f5132;
        border-left: 5px solid #198754;
    }

    .publish-bottom {
        margin-top: 80px;
        text-align: center;
        padding-bottom: 60px;
    }

    .btn-dark {
        background-color: #212844;
        color: #F2C4CE;
        border: none;
        border-radius: 18px;
        padding: 20px 60px;
        font-weight: 700;
        font-size: 1.2rem;
        transition: all 0.3s ease;

    }

        .btn-dark:hover {
            background-color: #1a2036;
            color: #F2C4CE;
        }
</style>
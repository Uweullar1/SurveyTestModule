<template>
    <div class="container py-5">
        <h2 class="fw-bold mb-4">Результаты: {{ surveyTitle }}</h2>

        <div class="card border-0 shadow-sm bg-white rounded-4 mb-4 p-4 text-center">
            <div class="display-6 fw-bold text-primary">
                {{ totalScore }} из {{ maxScore }}
            </div>
            <div class="text-muted">Итоговый балл</div>
        </div>

        <div v-for="(q, i) in questions" :key="q.id" class="mb-4 p-4 bg-white rounded-4 shadow-sm">
            <h5 class="fw-bold">
                #{{ i + 1 }} {{ q.text }}
            </h5>

            <div class="mt-3 p-3 bg-light rounded-3">
                <strong>Ваш ответ:</strong> {{ formatUserAnswer(q) }}
            </div>

            <div class="mt-3 p-3 bg-success bg-opacity-10 rounded-3">
                <strong>Правильный ответ:</strong> {{ getCorrectAnswerText(q) }}
            </div>
        </div>

        <div class="text-center mt-5">
            <button @click="goBack" class="btn btn-dark px-5">
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
</script>
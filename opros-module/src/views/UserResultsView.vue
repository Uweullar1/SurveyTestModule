<template>
    <div class="results-container" style="background-color: #F0E8D5; min-height: 100vh; padding: 40px 20px;">
        <div class="content-card" style="background: white; max-width: 800px; margin: 0 auto; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(33,40,68,0.05);">

            <h1 style="color: #212844; font-weight: 800; margin-bottom: 10px;">Результаты тестирования</h1>
            <p style="color: #212844; opacity: 0.6; margin-bottom: 30px;">Детальный отчет по вашим ответам</p>

            <div style="background-color: #F2C4CE; padding: 20px; border-radius: 15px; margin-bottom: 40px; display: flex; align-items: center; justify-content: space-between;">
                <span style="color: #212844; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Набранные баллы</span>
                <span style="color: #212844; font-size: 2rem; font-weight: 900;">{{ totalScore }} / {{ answers.length }}</span>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">Загрузка...</div>
            <div v-else class="answers-list">
                <div v-for="(ans, idx) in answers" :key="ans.id"
                     style="border: 2px solid #212844; border-radius: 15px; padding: 25px; margin-bottom: 20px;">

                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span style="font-weight: 800; opacity: 0.3;">Вопрос №{{ idx + 1 }}</span>
                        <span :style="{ color: ans.score > 0 ? '#4CAF50' : '#DF2935', fontWeight: '800' }">
                            {{ ans.score > 0 ? '✓ Верно' : '✕ Ошибка' }}
                        </span>
                    </div>

                    <h3 style="color: #212844; font-size: 1.2rem; margin-bottom: 20px;">{{ ans.questions.text }}</h3>

                    <div style="background: #f9f9f9; padding: 15px; border-radius: 10px;">
                        <small style="display: block; opacity: 0.5; margin-bottom: 5px;">Ваш ответ:</small>
                        <span style="font-weight: 600;">{{ formatUserAnswer(ans) }}</span>
                    </div>
                </div>
            </div>

            <button @click="$router.push('/my-history')"
                    style="width: 100%; background: #212844; color: white; border: none; padding: 18px; border-radius: 50px; font-weight: 800; cursor: pointer; margin-top: 30px;">
                Вернуться к списку
            </button>
        </div>
    </div>
</template>
<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { supabase } from '../supabase'
    import { useRoute } from 'vue-router'

    const route = useRoute()
    const loading = ref(true)
    const answers = ref([])

    onMounted(async () => {
        try {
            // 1. Загружаем ответы
            const { data: ansData, error: ansError } = await supabase
                .from('answers')
                .select('*')
                .eq('response_id', route.params.response_id)

            if (ansError) throw ansError

            // 2. Обогащаем данными о вопросах (исправлено название колонки на question_type)
            const enriched = await Promise.all(ansData.map(async (ans) => {
                const { data: qData } = await supabase
                    .from('questions')
                    .select('id, text, question_type, choices(id, text, is_correct)')
                    .eq('id', ans.question_id)
                    .maybeSingle()

                return { ...ans, questions: qData }
            }))

            answers.value = enriched.filter(a => a.questions !== null)
        } catch (e) {
            console.error("Ошибка загрузки:", e.message)
        } finally {
            loading.value = false
        }
    })

    // Функции для красивого отображения (чтобы не было UUID)
    const formatUserAnswer = (ans) => {
        if (!ans.questions || !ans.text_answer) return 'Нет ответа'
        const type = ans.questions.question_type
        if (['radio', 'checkbox', 'select'].includes(type)) {
            try {
                const selectedIds = ans.text_answer.startsWith('[')
                    ? JSON.parse(ans.text_answer).map(String)
                    : [String(ans.text_answer)]

                return ans.questions.choices
                    .filter(c => selectedIds.includes(String(c.id)))
                    .map(c => c.text).join(', ') || 'Вариант удален'
            } catch (e) { return ans.text_answer }
        }
        return ans.text_answer
    }

    const totalScore = computed(() => answers.value.reduce((sum, a) => sum + (a.score || 0), 0))
</script>

<style scoped>
    .feedback-card {
        background-color: #fffdf2 !important;
    }

    .italic {
        font-style: italic;
    }
</style>
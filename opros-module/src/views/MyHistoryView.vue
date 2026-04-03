<template>
    <div class="container my-5" style="max-width: 800px;">
        <h2 class="fw-bold mb-4">История ваших ответов</h2>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3">Загружаем историю...</p>
        </div>

        <div v-else-if="error" class="alert alert-warning text-center">
            {{ error }}
        </div>

        <div v-else-if="myResponses.length === 0" class="text-center py-5">
            <p class="text-muted">Вы ещё не прошли ни одного опроса.</p>
            <button @click="router.push('/')" class="btn btn-primary mt-3">
                Пройти опрос
            </button>
        </div>

        <div v-else class="list-group">
            <div v-for="res in myResponses"
                 :key="res.id"
                 @click="goToResults(res.id)"
                 class="list-group-item list-group-item-action p-4 mb-3 rounded-4 shadow-sm"
                 style="cursor: pointer; border: 2px solid #212844;">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="fw-bold mb-1">{{ res.survey_title || 'Опрос' }}</h5>
                        <small class="text-muted">
                            Дата: {{ new Date(res.submitted_at).toLocaleString('ru-RU') }}
                        </small>
                    </div>
                    <span class="text-primary fw-bold">Посмотреть результат →</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { supabase } from '../supabase'
    import { useRouter } from 'vue-router'

    const router = useRouter()
    const loading = ref(true)
    const error = ref(null)
    const myResponses = ref([])

    const goToResults = (responseId) => {
        router.push(`/my-results/${responseId}`)
    }

    onMounted(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user?.id) {
                error.value = "Вы не авторизованы"
                return
            }

            const { data, error: fetchError } = await supabase
                .from('responses')
                .select('id, submitted_at, survey_id')   // убрали join на surveys
                .eq('user_id', session.user.id)
                .order('submitted_at', { ascending: false })

            if (fetchError) {
                console.error('Fetch error:', fetchError)
                error.value = 'Не удалось загрузить историю (проверьте RLS)'
            } else {
                myResponses.value = data || []
            }
        } catch (err) {
            console.error(err)
            error.value = 'Ошибка загрузки'
        } finally {
            loading.value = false
        }
    })
</script>
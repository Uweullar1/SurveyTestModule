<template>
    <div class="container my-5" style="max-width: 800px;">
        <h2 class="fw-bold mb-4">История ваших ответов</h2>

        <div v-if="loading" class="text-center py-5"><div class="spinner-border"></div></div>

        <div v-else-if="myResponses.length === 0" class="text-center py-5">
            <p class="text-muted">Вы еще не прошли ни одного опроса.</p>
        </div>

        <div v-else class="list-group">
            <div v-for="res in myResponses" :key="res.id"
                 @click="router.push(`/my-results/${res.id}`)"
                 class="list-group-item list-group-item-action p-4 mb-3 rounded-4 shadow-sm border-2"
                 style="cursor: pointer; border-color: #212844;">

                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="fw-bold mb-1">{{ res.surveys.title }}</h5>
                        <small class="text-muted">Дата прохождения: {{ new Date(res.submitted_at).toLocaleString() }}</small>
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
const myResponses = ref([])

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return router.push('/login')

  // Тянем все ответы текущего юзера вместе с названиями опросов
  const { data, error } = await supabase
    .from('responses')
    .select('id, submitted_at, surveys(title)')
    .eq('user_id', session.user.id)
    .order('submitted_at', { ascending: false })

  if (!error) myResponses.value = data
  loading.value = false
})
</script>
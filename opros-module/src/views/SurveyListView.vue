<template>
    <div class="container my-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="m-0">Доступные опросы и анкеты</h1>
            <button class="btn btn-success" @click="goToCreate">
                + Создать новый опрос
            </button>
        </div>

        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
            <p class="mt-3">Загружаем опросы из базы...</p>
        </div>

        <div v-else-if="error" class="alert alert-danger text-center">
            Ошибка загрузки: {{ error }}
        </div>

        <div v-else-if="surveys.length === 0" class="alert alert-info text-center">
            Пока нет доступных опросов
        </div>

        <div v-else class="row">
            <div v-for="survey in surveys" :key="survey.id" class="col-md-6 col-lg-4 mb-4">
                <div class="card shadow-sm h-100">
                    <div class="card-body">
                        <h5 class="card-title">{{ survey.title }}</h5>
                        <p class="card-text text-muted">
                            {{ survey.description || 'Без описания' }}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <small class="text-muted">
                                Создан: {{ new Date(survey.created_at).toLocaleDateString('ru-RU') }}
                            </small>
                            <button class="btn btn-primary btn-sm" @click="goToTake(survey.id)">
                                Пройти опрос
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const surveys = ref([])
    const loading = ref(true)
    const error = ref(null)
    const router = useRouter()

    const goToCreate = () => {
        router.push('/create')
    }

    const goToTake = (id) => {
        router.push(`/take/${id}`)
    }

    onMounted(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('surveys')
                .select('*')
                .order('created_at', { ascending: false })

            console.log('Результат Supabase:', data)
            console.log('Количество записей:', data?.length || 0)
            console.log('Ошибка:', fetchError)

            if (fetchError) throw fetchError

            surveys.value = data || []
        } catch (err) {
            console.error('Полная ошибка:', err)
            error.value = err.message || 'Не удалось загрузить опросы'
        } finally {
            loading.value = false
        }
    })
</script>
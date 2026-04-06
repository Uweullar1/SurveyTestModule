<template>
    <div class="history-page">
        <div class="container py-5" style="max-width: 850px;">
            <div class="d-flex align-items-center mb-5">
                <h2 class="fw-bold m-0 survey-title">История ваших ответов</h2>
            </div>

            <div v-if="loading" class="text-center py-5">
                <div class="spinner-border custom-spinner" role="status"></div>
                <p class="mt-3 text-muted">Загружаем историю ваших прохождений...</p>
            </div>

            <div v-else-if="error" class="alert alert-custom text-center shadow-sm">
                <i class="bi bi-exclamation-circle me-2"></i> {{ error }}
            </div>

            <div v-else-if="myResponses.length === 0" class="empty-state text-center py-5 shadow-sm rounded-4">
                <i class="bi bi-journal-x display-1 text-muted mb-4 d-block"></i>
                <p class="text-muted fs-5">Вы ещё не прошли ни одного опроса.</p>
                <button @click="router.push('/')" class="btn btn-submit mt-2 px-4">
                    Найти первый опрос
                </button>
            </div>

            <div v-else class="responses-list">
                <div v-for="res in myResponses"
                     :key="res.id"
                     @click="goToResults(res.id)"
                     class="response-card p-4 mb-3 shadow-sm d-flex justify-content-between align-items-center">

                    <div class="d-flex align-items-center">
                        <div class="status-indicator me-4"></div>
                        <div>
                            <h5 class="fw-bold mb-1 card-survey-title">
                                {{ res.survey_title || 'Завершенный опрос' }}
                            </h5>
                            <div class="d-flex align-items-center text-muted small">
                                <i class="bi bi-calendar3 me-2"></i>
                                {{ formatDate(res.submitted_at) }}
                            </div>
                        </div>
                    </div>

                    <div class="action-zone text-end">
                        <span class="view-link fw-bold">
                            Результаты <i class="bi bi-chevron-right ms-1"></i>
                        </span>
                    </div>
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
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
                .select('id, submitted_at, survey_id')
                .eq('user_id', session.user.id)
                .order('submitted_at', { ascending: false })

            if (fetchError) {
                console.error('Fetch error:', fetchError)
                error.value = 'Не удалось загрузить историю'
            } else {
                myResponses.value = data || []
            }
        } catch (err) {
            console.error(err)
            error.value = 'Ошибка сервера'
        } finally {
            loading.value = false
        }
    })
</script>

<style scoped>
    /* Основной фон страницы */
    .history-page {
        background-color: #F0E8D5;
        min-height: 100vh;
        padding-bottom: 2rem;
    }

    .survey-title {
        color: #212844;
    }


    /* Список карточек */
    .responses-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem; /* Расстояние между карточками */
    }

    /* Сама карточка */
    .response-card {
        background: #ffffff;
        border-radius: 20px; /* Более мягкие углы */
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        position: relative;
        overflow: hidden; /* Чтобы индикатор не вылезал за границы */
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem !important; /* Фиксированные отступы */
    }

        .response-card:hover {
            transform: translateX(10px);
            border-color: #F2C4CE;
            box-shadow: 0 10px 25px rgba(33, 40, 68, 0.1) !important;
        }

    /* Тот самый синий индикатор слева */
    .status-indicator {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 8px; /* Чуть шире для уверенности */
        background-color: #212844;
        border-radius: 0; /* Убираем радиус, так как он внутри карточки */
    }

    .card-survey-title {
        color: #212844;
        font-size: 1.25rem;
        margin-bottom: 0.5rem;
    }

    /* Кнопка/ссылка справа */
    .view-link {
        color: #212844;
        font-size: 0.95rem;
        padding: 10px 20px;
        background: #F2C4CE;
        border-radius: 12px;
        transition: all 0.2s ease;
        white-space: nowrap; /* Чтобы текст не переносился */
    }

    .response-card:hover .view-link {
        background: #212844;
        color: #F0E8D5;
    }

    /* Адаптивность для мобилок */
    @media (max-width: 576px) {
        .response-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }

        .action-zone {
            width: 100%;
            text-align: left !important;
        }
    }

    /* Спиннер и алерты */
    .custom-spinner {
        color: #212844;
    }

    .alert-custom {
        background-color: #F2C4CE;
        color: #212844;
        border: none;
        border-radius: 15px;
        padding: 1.5rem;
    }
</style>
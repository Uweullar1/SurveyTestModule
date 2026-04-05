<template>
    <div class="page-wrapper">
        <section class="container surveys-section">
            <div class="section-header">
                <h2>Доступные опросы</h2>
                <div class="line"></div>
            </div>

            <div v-if="loading" class="loader">Загрузка...</div>

            <div class="surveys-grid">
                <router-link v-for="survey in surveys"
                             :key="survey.id"
                             :to="`/take/${survey.id}`"
                             class="survey-card-link">

                    <div class="survey-card">
                        <div class="card-deco"></div>
                        <div class="card-content">
                            <span class="badge">ОПРОС</span>
                            <h3 class="survey-title">{{ survey.title }}</h3>
                            <p class="survey-desc">{{ survey.description || 'Нет описания' }}</p>
                            <div class="card-footer">
                                <span class="date">{{ new Date(survey.created_at).toLocaleDateString() }}</span>

                                <button v-if="user && survey.user_id === user.id"
                                        @click.stop.prevent="router.push(`/results/${survey.id}/admin`)"
                                        class="admin-btn">
                                    Результаты
                                </button>

                                <span v-else class="open-btn">Открыть →</span>
                            </div>
                        </div>
                    </div>
                </router-link>
            </div>
        </section>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const user = ref(null)
    const router = useRouter()
    const surveys = ref([])
    const loading = ref(true)
 

    const goToLogin = () => router.push('/login')

    onMounted(async () => {
        // Получаем текущую сессию
        const { data: { session } } = await supabase.auth.getSession()
        user.value = session?.user ?? null
        try {
            const { data, error } = await supabase
                .from('surveys')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            surveys.value = data || []
        } catch (e) {
            console.error('Ошибка при загрузке:', e.message)
        } finally {
            loading.value = false
        }
    })
</script>

<style scoped>
    /* Сетка: меняем minmax, чтобы карточки могли становиться уже */
    .surveys-grid {
        display: grid;
        /* 220px — это минимальная ширина, при которой 4 карточки влезут на стандартный экран */
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 30px; /* Немного уменьшаем зазоры между карточками */
        padding: 40px 0;
    }

    .survey-card-link {
        text-decoration: none;
        color: inherit;
        display: block;
    }

    .survey-card {
        position: relative;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    /* Синяя плашка */
    .card-deco {
        position: absolute;
        top: 10px;
        left: 10px;
        width: 100%;
        height: 100%;
        background: #B0D7FF;
        border: 2px solid #212844;
        border-radius: 20px;
        z-index: 1;
    }

    /* Белая карточка: уменьшаем padding с 35px до 20-25px */
    .card-content {
        position: relative;
        background: white;
        border: 2px solid #212844;
        border-radius: 20px;
        padding: 25px; /* Уменьшили отступы внутри */
        z-index: 2;
        min-height: 200px; /* Чуть уменьшили высоту */
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    /* Текстовые стили под меньший размер */
    .survey-title {
        font-size: 1.25rem; /* Уменьшили шрифт заголовка, чтобы не переносился слишком сильно */
        font-weight: 800;
        margin-bottom: 8px;
        line-height: 1.2;
        color: #212844;
    }

    .survey-desc {
        opacity: 0.6;
        font-size: 0.85rem; /* Уменьшили шрифт описания */
        margin-bottom: 15px;
        /* Ограничиваем описание 3 строками, чтобы карточки были ровными */
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .badge {
        display: inline-block;
        background: #212844;
        color: white;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 0.65rem;
        font-weight: 900;
        letter-spacing: 1px;
        margin-bottom: 15px;
    }

    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(33, 40, 68, 0.1);
        padding-top: 12px;
    }

    .date {
        font-size: 0.75rem;
        font-weight: 600;
        opacity: 0.4;
    }

    .open-btn {
        font-weight: 800;
        font-size: 0.8rem;
        color: #212844;
    }
    .admin-btn {
        background: #F2C4CE; /* Яркий желтый для теста */
        border: 2px solid #212844;
        padding: 5px 12px;
        border-radius: 8px;
        font-weight: 800;
        cursor: pointer;
        font-size: 0.8rem;
        transition: transform 0.2s;
    }

        .admin-btn:hover {
            transform: scale(1.05);
            background: #F2C4CE;
        }
</style>
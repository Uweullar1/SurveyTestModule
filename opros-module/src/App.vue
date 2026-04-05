<template>
    <div id="app">
        <!-- Навбар -->
        <nav class="main-header">
            <div class="nav-container">
                <router-link to="/" class="logo-main">
                    VOCUS
                    <span class="logo-sub">SURVEY PLATFORM</span>
                </router-link>

                <div class="nav">
                    <router-link to="/my-history" class="nav-link">Мои ответы</router-link>
                    <router-link to="/" class="nav-link">Опросы</router-link>
                    <router-link to="/about" class="nav-link">О нас</router-link>
                    <router-link to="/create" class="nav-link">Создать опрос</router-link>
                </div>

                <!-- Кликабельная аватарка -->
                <router-link to="/profile" class="avatar-link">
                    <img :src="userAvatar"
                         alt="Профиль"
                         class="nav-avatar"
                         @error="() => userAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'" />
                </router-link>
            </div>
        </nav>

        <!-- Основной контент -->
        <router-view />
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { supabase } from './supabase'
    import { useRouter } from 'vue-router'   // добавили

    const router = useRouter()
    const userAvatar = ref('https://api.dicebear.com/7.x/avataaars/svg?seed=default')

    const loadAvatar = async (force = false) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', user.id)
                .single()

            let url = profile?.avatar_url
                ? profile.avatar_url
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'user'}`

            // Принудительно сбрасываем кэш
            if (force) {
                url += '?t=' + Date.now()
            }

            userAvatar.value = url
        } catch (e) {
            console.error(e)
        }
    }

    onMounted(() => {
        loadAvatar()
    })

    // Обновляем аватарку каждый раз, когда возвращаемся на главную страницу
    router.afterEach((to) => {
        if (to.path === '/' || to.path === '/my-history' || to.path === '/create') {
            loadAvatar(true)   // force = true
        }
    })
</script>

<style>
    /* Твои базовые стили + улучшения навбара */
    body {
        margin: 0;
        background-color: #FDFDF1;
        color: #212844;
        font-family: 'Inter', sans-serif;
    }

    /* Навбар */
    .main-header {
        background: rgba(253, 253, 241, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(33, 40, 68, 0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
        padding: 15px 40px;
    }

    .nav-container {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .logo-main {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -1px;
        text-decoration: none;
        color: #212844;
    }

    .logo-sub {
        font-size: 10px;
        letter-spacing: 2px;
        text-transform: uppercase;
        opacity: 0.6;
        display: block;
        margin-top: -4px;
    }

    .nav {
        display: flex;
        gap: 30px;
    }

    .nav-link {
        font-weight: 700;
        color: #212844;
        text-decoration: none;
        transition: color 0.2s;
    }

        .nav-link:hover {
            color: #DF2935;
        }

    /* Аватарка в навбаре */
    .nav-avatar {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        border: 3px solid #212844;
        object-fit: cover;
        transition: transform 0.2s ease;
    }

        .nav-avatar:hover {
            transform: scale(1.1);
        }

    .avatar-link {
        text-decoration: none;
    }

    /* Остальные твои стили (оставляем как были) */
    .container {
        width: 100%;
        max-width: 60rem;
        margin: 0 auto;
        padding: 3rem 1rem;
    }

    /* ... все остальные твои классы (.hero-section, .card-stack, .surveys-grid и т.д.) ... */
</style>
<template>
    <div id="app">
        <nav class="main-header">
            <div class="nav-container">
                <router-link to="/" class="logo-group">
                    <span class="logo-main">VOCUS</span>
                    <span class="logo-sub">SURVEY PLATFORM</span>
                </router-link>

                <div class="nav-links">
                    <router-link to="/my-history" class="nav-link">История прохождений</router-link>
                    <router-link to="/my-surveys" class="nav-link">Мои опросы</router-link>
                </div>

                <div class="nav-right">
                    <template v-if="isLoggedIn">
                        <router-link to="/profile" class="avatar-link">
                            <img :src="userAvatar"
                                 alt="Профиль"
                                 class="nav-avatar"
                                 @error="onAvatarError" />
                        </router-link>
                    </template>
                    <template v-else>
                        <router-link to="/login" class="btn-login">
                            Войти
                        </router-link>
                    </template>
                </div>
            </div>
        </nav>

        <main class="content-wrapper">
            <router-view />
        </main>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { supabase } from './supabase'
    import { useRouter } from 'vue-router'

    const router = useRouter()

    const isLoggedIn = ref(false)
    const userAvatar = ref(localStorage.getItem('avatar') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default')

    const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                isLoggedIn.value = true

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .single()

                if (profile?.avatar_url) {
                    // Если base64 — используем как есть
                    if (profile.avatar_url.startsWith('data:')) {
                        userAvatar.value = profile.avatar_url
                        localStorage.setItem('avatar', profile.avatar_url)
                    } else {
                        // Обычный URL
                        const url = profile.avatar_url + '?t=' + Date.now()
                        userAvatar.value = url
                        localStorage.setItem('avatar', url)
                    }
                }
            } else {
                isLoggedIn.value = false
                userAvatar.value = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                localStorage.removeItem('avatar')
            }
        } catch (err) {
            console.error('Ошибка загрузки пользователя:', err)
        }
    }

    supabase.auth.onAuthStateChange((event, session) => {
        loadUserData()
    })

    onMounted(() => {
        loadUserData()
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

    /* Логотип */
    .logo-group {
        text-decoration: none;
        display: flex;
        flex-direction: column;
    }

    .logo-main {
        font-size: 26px;
        font-weight: 900;
        letter-spacing: -0.5px;
        color: #212844;
        line-height: 1;
    }

    .logo-sub {
        font-size: 9px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        font-weight: 700;
        color: #212844;
        opacity: 0.5;
        margin-top: 4px;
    }

    .nav {
        display: flex;
        gap: 30px;
    }

    /* Ссылки (исправляем слипание) */
    .nav-links {
        display: flex;
        gap: 40px; /* Увеличили расстояние между текстом */
    }

    .nav-link {
        font-size: 20px;
        font-weight: 700;
        color: #212844;
        text-decoration: none;
        position: relative;
        transition: all 0.2s ease;
    }

        .nav-link:hover {
            color: #DF2935;
        }


    /* Аватарка в навбаре */
    .nav-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 3px solid #212844;
        object-fit: cover;
        transition: transform 0.25s ease;
    }

        .nav-avatar:hover {
            transform: scale(1.08);
        }

    .avatar-link {
        text-decoration: none;
    }

    /* Кнопка "Войти" */
    .btn-login {
        background: #212844;
        color: white;
        padding: 12px 28px;
        border-radius: 50px;
        font-weight: 700;
        text-decoration: none;
        transition: all 0.2s;
    }

        .btn-login:hover {
            background: #DF2935;
            transform: translateY(-2px);
        }

    /* Остальные твои стили (оставляем как были) */
    .container {
        width: 100%;
        max-width: 60rem;
        margin: 0 auto;
        padding: 3rem 1rem;
    }
</style>
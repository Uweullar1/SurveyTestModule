<template>
    <LightRays />

    <div class="app-container">
        <header class="main-header">
            <div class="container header-flex">
                <div class="logo" @click="router.push('/')" style="cursor: pointer;">
                    <span class="logo-main">VOCUS</span>
                    <span class="logo-sub">Survey Platform</span>
                </div>

                <nav class="nav">
                    <router-link v-if="user" to="/my-history" class="nav-link">Мои ответы</router-link>
                    <router-link to="/">Опросы</router-link>
                    <a href="#">О нас</a>

                    <template v-if="user">
                        <router-link to="/create" class="nav-link">Создать опрос</router-link>
                        <div class="user-profile">
                            <img :src="profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky'" class="avatar-sm">
                            <span v-if="profile" class="user-name">
                                {{ profile.first_name }} {{ profile.last_name }}
                            </span>
                            <button @click="handleSignOut" class="btn-logout-icon" title="Выйти">🚪</button>
                        </div>

                    </template>


                    <template v-else>

                        <button @click="router.push('/login')" class="btn-outline">Войти</button>
                    </template>
                </nav>
            </div>
        </header>

        <main>
            <router-view />
        </main>
    </div>
</template>

<script setup>
    import LightRays from './components/LightRays.vue' // Импорт компонента
    import { ref, onMounted } from 'vue'
    import { supabase } from './supabase'
    import { useRouter } from 'vue-router'

    const router = useRouter()
    const user = ref(null)
    const profile = ref(null)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        user.value = null
        profile.value = null
        router.push('/login')
    }

    // Загрузка профиля вынесена в отдельную функцию для чистоты
    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .eq('id', userId)
            .single()

        if (!error) {
            profile.value = data
        }
    }

    onMounted(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        user.value = session?.user ?? null

        if (user.value) {
            await fetchProfile(user.value.id)
        }

        supabase.auth.onAuthStateChange((_event, session) => {
            user.value = session?.user ?? null
            if (!session) {
                profile.value = null
            } else {
                fetchProfile(session.user.id)
            }
        })
    })
</script>
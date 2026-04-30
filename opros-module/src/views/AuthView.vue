<template>
    <div class="auth-page">
        <div class="auth-card-wrapper">
            <div class="auth-card">
                <h2 class="auth-title">{{ isLogin ? 'Вход' : 'Регистрация' }}</h2>

                <form @submit.prevent="handleAuth" class="auth-form">
                    <div class="form-content">

                        <template v-if="!isLogin">
                            <input v-model="firstName" type="text" placeholder="Имя" class="auth-input" />
                            <div v-if="formErrors.firstName" class="error-message">{{ formErrors.firstName }}</div>

                            <input v-model="lastName" type="text" placeholder="Фамилия" class="auth-input" required />
                            <div v-if="formErrors.lastName" class="error-message">{{ formErrors.lastName }}</div>

                            <input v-model="username" type="text" placeholder="Username" class="auth-input" required />
                            <div v-if="formErrors.username" class="error-message">{{ formErrors.username}}</div>

                            <!-- Выбор департамента -->
                            <div class="dept-select-wrapper">
                                <select v-model="departmentId" class="auth-input auth-select">
                                    <option value="">Выберите департамент</option>
                                    <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                                        {{ dept.name }}
                                    </option>
                                </select>
                                <span class="dept-arrow">▾</span>
                            </div>
                            <div v-if="formErrors.departmentId" class="error-message">{{ formErrors.departmentId }}</div>
                        </template>

                        <input v-model="email" type="email" placeholder="Email" class="auth-input" required />
                        <div v-if="formErrors.email" class="error-message">{{ formErrors.email }}</div>

                        <input v-model="password" type="password" placeholder="Пароль" class="auth-input" required />
                        <div v-if="formErrors.password" class="error-message">{{ formErrors.password }}</div>


                        <div class="btn-container">
                            <button type="submit" class="btn-submit">
                                {{ isLogin ? 'Войти' : 'Создать аккаунт' }}
                            </button>
                        </div>
                    </div>
                </form>

                <p class="auth-switch" @click="toggleMode">
                    {{ isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти' }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { supabase } from '../supabase'
    import { profileRules } from '../utils/validation.js'

    const router = useRouter()

    const isLogin = ref(true)

    const firstName = ref('')
    const lastName = ref('')
    const username = ref('')
    const email = ref('')
    const password = ref('')
    const departmentId = ref('')
    const departments = ref([])

    const formErrors = ref({})

    onMounted(async () => {
        const { data } = await supabase.from('departments').select('*').order('name')
        departments.value = data || []
    })

    const handleAuth = async () => {
        formErrors.value = {}

        if (!isLogin.value) {
            formErrors.value.firstName = profileRules.firstName(firstName.value)
            formErrors.value.lastName = profileRules.lastName(lastName.value)
            formErrors.value.username = profileRules.username(username.value)

            // Проверка департамента
            if (!departmentId.value) {
                formErrors.value.departmentId = 'Выберите департамент'
            }
        }

        formErrors.value.email = profileRules.email(email.value)
        formErrors.value.password = profileRules.password(password.value)

        if (Object.values(formErrors.value).some(err => err !== '' && err !== undefined)) {
            return
        }

        try {
            if (isLogin.value) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.value.trim(),
                    password: password.value
                })

                if (error) throw error
                router.push('/')
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: email.value.trim(),
                    password: password.value
                })

                if (error) throw error

                if (data.user) {
                    await supabase.from('profiles').insert({
                        id: data.user.id,
                        first_name: firstName.value.trim(),
                        last_name: lastName.value.trim(),
                        username: username.value.trim(),
                        department_id: departmentId.value,
                        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username.value || 'user'}`
                    })
                }

                alert('Регистрация прошла успешно!\nПроверьте почту для подтверждения аккаунта.')
                isLogin.value = true
            }
        } catch (err) {
            alert('Ошибка: ' + (err.message || 'Неизвестная ошибка'))
        }
    }

    const toggleMode = () => {
        isLogin.value = !isLogin.value
        formErrors.value = {}
    }
</script>

<style scoped>
    .auth-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 90vh;
        padding: 20px;
        background-color: #FDFDF1; /* Цвет фона под стиль сайта */
    }

    .auth-card-wrapper {
        width: 100%;
        max-width: 420px;
    }

    .auth-card {
        background: white;
        border: 3px solid #212844; /* Сделал обводку чуть толще под стиль */
        border-radius: 35px;
        padding: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 10px 10px 0px rgba(33, 40, 68, 0.1);
    }

    .auth-title {
        font-size: 32px;
        font-weight: 900;
        margin-bottom: 30px;
        color: #212844;
    }

    .auth-form {
        width: 100%;
    }

    /* Контейнер, который держит все инпуты и кнопку в одну колонку */
    .form-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px; /* Расстояние между плашками */
        width: 100%;
    }

    .auth-input {
        width: 100%;
        max-width: 320px;
        padding: 16px 20px;
        border: 2px solid #212844;
        border-radius: 16px;
        background-color: #FDFDF1;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        transition: all 0.2s ease;
        box-sizing: border-box;
    }

        .auth-input:focus {
            outline: none;
            border-color: #B0D7FF;
            transform: translateY(-2px);
        }

    .btn-container {
        width: 100%;
        display: flex;
        justify-content: center;
        margin-top: 10px;
    }

    .btn-submit {
        width: 100%;
        max-width: 240px;
        background-color: #212844;
        color: white;
        padding: 16px;
        border-radius: 18px;
        font-weight: 800;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    }

        .btn-submit:hover {
            background-color: #B0D7FF;
            color: #212844;
            transform: scale(1.05);
        }

    .auth-switch {
        margin-top: 25px;
        font-size: 14px;
        font-weight: 700;
        color: #212844;
        opacity: 0.6;
        cursor: pointer;
        text-decoration: underline;
    }

    .error-message {
        color: #DF2935;
        font-size: 0.85rem;
        font-weight: 700;
        margin-top: -10px; /* Притягиваем ошибку к инпуту */
        margin-bottom: 5px;
    }
    /* Обертка селекта департамента */
    .dept-select-wrapper {
        position: relative;
        width: 100%;
        max-width: 320px;
    }

    .auth-select {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        cursor: pointer;
        padding-right: 40px;
    }

    .dept-arrow {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: #212844;
        font-weight: 900;
        font-size: 1rem;
    }
</style>
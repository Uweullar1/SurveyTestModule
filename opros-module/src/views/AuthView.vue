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

                        <p v-if="isLogin" class="forgot-password" @click="showReset = true">
                            Забыли пароль?
                        </p>

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

            <!-- Модалка восстановления пароля -->
            <div v-if="showReset" class="reset-overlay" @click.self="showReset = false">
                <div class="reset-card">
                    <button class="reset-close" @click="showReset = false">✕</button>
                    <h3 class="reset-title">Восстановление пароля</h3>
                    <p class="reset-subtitle">Введите email, и мы отправим ссылку для сброса пароля</p>
                    <input v-model="resetEmail" type="email" placeholder="Email" class="auth-input" />
                    <div class="reset-buttons">
                        <button @click="resetPassword" class="btn-submit">Отправить</button>
                        <button @click="showReset = false" class="btn-cancel">Отмена</button>
                    </div>
                    <p v-if="resetMessage" class="reset-message" :class="{ success: resetMessage.includes('отправлена') }">
                        {{ resetMessage }}
                    </p>
                </div>
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
    const showReset = ref(false)
    const resetEmail = ref('')
    const resetMessage = ref('')

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

    const resetPassword = async () => {
        if (!resetEmail.value) return alert('Введите email')
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.value, {
            redirectTo: window.location.origin + '/#/reset-password'
        })
        if (error) {
            resetMessage.value = 'Ошибка: ' + error.message
        } else {
            resetMessage.value = 'Ссылка для сброса пароля отправлена на email!'
            setTimeout(() => { showReset.value = false; resetEmail.value = ''; resetMessage.value = '' }, 3000)
        }
    }

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
        } }
    const toggleMode = () => { isLogin.value = !isLogin.value; formErrors.value = {} }
</script>

<style scoped>
    .auth-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 90vh;
        padding: 20px;
        background-color: #FDFDF1;
    }

    .auth-card-wrapper {
        width: 100%;
        max-width: 420px;
    }

    .auth-card {
        background: white;
        border: 3px solid #212844;
        border-radius: 35px;
        padding: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 10px 10px 0px rgba(33,40,68,0.1);
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

    .form-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
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
        margin-top: -10px;
        margin-bottom: 5px;
    }

    .dept-select-wrapper {
        position: relative;
        width: 100%;
        max-width: 320px;
    }

    .auth-select {
        appearance: none;
        -webkit-appearance: none;
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

    .forgot-password {
        font-size: 0.85rem;
        color: #888;
        cursor: pointer;
        margin-top: -5px;
        transition: color 0.2s;
    }

        .forgot-password:hover {
            color: #212844;
            text-decoration: underline;
        }

    /* Модалка */
    .reset-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(33,40,68,0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .reset-card {
        background: #FDFDF1;
        border: 3px solid #212844;
        border-radius: 28px;
        padding: 35px 30px;
        width: 90%;
        max-width: 380px;
        position: relative;
        box-shadow: 10px 10px 0px rgba(33,40,68,0.15);
    }

    .reset-close {
        position: absolute;
        top: 12px;
        right: 16px;
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: #888;
    }

        .reset-close:hover {
            color: #DF2935;
        }

    .reset-title {
        font-size: 1.4rem;
        font-weight: 900;
        color: #212844;
        margin-bottom: 8px;
    }

    .reset-subtitle {
        font-size: 0.85rem;
        color: #888;
        margin-bottom: 20px;
    }

    .reset-buttons {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }

        .reset-buttons .btn-submit {
            flex: 2;
        }

    .btn-cancel {
        flex: 1;
        height: 52px;
        border: 2px solid #212844;
        border-radius: 18px;
        background: transparent;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }

        .btn-cancel:hover {
            background: #212844;
            color: white;
        }

    .reset-message {
        margin-top: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #DF2935;
    }

        .reset-message.success {
            color: #198754;
        }

    @media (max-width: 400px) {
        .auth-card {
            padding: 24px;
            border-radius: 24px;
        }

        .auth-title {
            font-size: 24px;
        }

        .auth-input {
            padding: 12px 16px;
            font-size: 14px;
        }

        .btn-submit {
            max-width: 100%;
        }

        .reset-card {
            padding: 24px 20px;
        }
    }
</style>
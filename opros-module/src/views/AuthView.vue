<template>
    <div class="auth-page">
        <div class="auth-card-wrapper">
            <div class="auth-card">
                <h2 class="auth-title">{{ isLogin ? 'Вход' : 'Регистрация' }}</h2>

                <div v-if="showToast" :class="['auth-notification', toastType]" @click="showToast = false">
                    {{ toastMessage }}
                </div>

                <form @submit.prevent="handleAuth" class="auth-form">
                    <div class="form-content">

                        <template v-if="!isLogin">
                            <input v-model="firstName" type="text" placeholder="Имя" class="auth-input" />
                            <div v-if="formErrors.firstName" class="error-message">{{ formErrors.firstName }}</div>

                            <input v-model="lastName" type="text" placeholder="Фамилия" class="auth-input" required />
                            <div v-if="formErrors.lastName" class="error-message">{{ formErrors.lastName }}</div>

                            <input v-model="username" type="text" placeholder="Username" class="auth-input" required />
                            <div v-if="formErrors.username" class="error-message">{{ formErrors.username}}</div>

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
    import { getAuthErrorMessage } from '../utils/errorMessages'
    import ToastNotification from '../components/ToastNotification.vue'


    const router = useRouter()

    const isLogin = ref(true)

    const toastMessage = ref('')
    const toastType = ref('error')
    const showToast = ref(false)

    const showReset = ref(false)
    const resetEmail = ref('')
    const resetMessage = ref('')

    const firstName = ref('')
    const lastName = ref('')
    const username = ref('')
    const email = ref('')
    const password = ref('')
    const phone = ref('')

    const formErrors = ref({})

    let toastTimer = null

    // Функция показа ошибки:
    const showNotification = (message, type = 'error') => {
        toastMessage.value = message
        toastType.value = type
        showToast.value = true

        clearTimeout(toastTimer)
        toastTimer = setTimeout(() => {
            showToast.value = false
        }, 5000)
    }



    const handleAuth = async () => {
        formErrors.value = {}

        if (!isLogin.value) {
            formErrors.value.firstName = profileRules.firstName(firstName.value)
            formErrors.value.lastName = profileRules.lastName(lastName.value)
            formErrors.value.username = profileRules.username(username.value)
        }

        formErrors.value.email = profileRules.email(email.value)
        formErrors.value.password = profileRules.password(password.value)

        if (Object.values(formErrors.value).some(err => err !== '' && err !== undefined)) {
            showNotification('Пожалуйста, исправьте ошибки в форме.', 'error')
            return
        }

        try {
            if (isLogin.value) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.value.trim(),
                    password: password.value
                })

                if (error) {
                    showNotification(getAuthErrorMessage(error), 'error')
                    return
                }

                showNotification('Вход выполнен успешно!', 'success')
                setTimeout(() => router.push('/'), 500)

            } else {
                if (phone.value) {
                    const cleanedPhone = '+' + phone.value.replace(/\D/g, '')
                    const { data: existing } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('phone', cleanedPhone)
                        .limit(1)

                    if (existing && existing.length > 0) {
                        showNotification('Пользователь с таким номером телефона уже зарегистрирован.', 'error')
                        return
                    }
                }

                const { error } = await supabase.auth.signUp({
                    email: email.value.trim(),
                    password: password.value,
                    options: {
                        data: {
                            first_name: firstName.value.trim(),
                            last_name: lastName.value.trim(),
                            username: username.value.trim(),
                        }
                    }
                })

                if (error) {
                    showNotification(getAuthErrorMessage(error), 'error')
                    return
                }

                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: email.value.trim(),
                    password: password.value
                })

                if (!loginError) {
                    showNotification('Регистрация успешна! Добро пожаловать!', 'success')
                    setTimeout(() => router.push('/'), 500)
                } else {
                    showNotification('Регистрация успешна! Теперь войдите в систему.', 'success')
                    isLogin.value = true
                }
            }
        } catch (err) {
            showNotification(getAuthErrorMessage(err), 'error')
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
    }

    .auth-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        max-width: 440px;
        width: 90%;
        padding: 14px 20px;
        border-radius: 12px;
        text-align: center;
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 9999;
        cursor: pointer;
        animation: slideDown 0.3s ease-out;
    }

        .auth-notification.error {
            background: #fff0f0;
            color: #c41e3a;
            border: 2px solid #f5c6cb;
        }

        .auth-notification.success {
            background: #f0fff4;
            color: #0f5132;
            border: 2px solid #badbcc;
        }

    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
        }

        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
</style>
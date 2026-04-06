<template>
    <div class="auth-page">
        <div class="auth-card-wrapper">
            

            <div class="auth-card">
                <h2 class="auth-title">{{ isLogin ? 'Вход' : 'Регистрация' }}</h2>

                <form @submit.prevent="handleAuth" class="auth-form">
                    <template v-if="!isLogin">
                        <div class="input-wrapper">
                            <input v-model="firstName" type="text" placeholder="Имя" class="auth-input" />
                            <div v-if="formErrors.firstName" class="error-message">
                                {{ formErrors.firstName }}
                            </div>
                            <input v-model="lastName" type="text" placeholder="Фамилия" class="auth-input" required />
                            <div v-if="formErrors.lastName" class="error-message">
                                {{ formErrors.lastName }}
                            </div>
                            <input v-model="username" type="text" placeholder="Username" class="auth-input" required />
                            <div v-if="formErrors.username" class="error-message">
                                {{ formErrors.username}}
                            </div>
                        </div>

                    </template>
                    <div class="input-wrapper">
                        <input v-model="email" type="email" placeholder="Email" class="auth-input" required />
                        <div v-if="formErrors.email" class="error-message">
                            {{ formErrors.email }}
                        </div>
                        <input v-model="password" type="password" placeholder="Пароль" class="auth-input" required />
                        <div v-if="formErrors.password" class="error-message">
                            {{ formErrors.password }}
                        </div>
                        <div class="btn-container">
                            <button type="submit" class="btn-submit">
                                {{ isLogin ? 'Войти' : 'Создать аккаунт' }}
                            </button>
                        </div>
                    </div>
                </form>

                <p class="auth-switch" @click="isLogin = !isLogin">
                    {{ isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти' }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import { supabase } from '../supabase'
    import { useRouter } from 'vue-router'
    import { validateProfileForm } from '../utils/validation.js'

    const formErrors = ref({})
    const router = useRouter()

    // Состояния формы
    const isLogin = ref(true)
    const email = ref('')
    const password = ref('')
    const firstName = ref('')
    const lastName = ref('')
    const username = ref('')
  

    /**
     * Основная функция авторизации и регистрации
     */
    const handleAuth = async () => {
        formErrors.value = {} // очищаем старые ошибки

        if (!isLogin.value) { // регистрация
            formErrors.value.firstName = profileRules.firstName(firstName.value)
            formErrors.value.lastName = profileRules.lastName(lastName.value)
            formErrors.value.username = profileRules.username(username.value)
        }

        formErrors.value.email = profileRules.email(email.value)
        formErrors.value.password = profileRules.password(password.value)

        // Проверяем, есть ли ошибки
        if (Object.values(formErrors.value).some(err => err !== '')) {
            return // не продолжаем, если есть ошибки
        }

        if (!isValid) {
            formErrors.value = errors
            return
        }
        try {
            if (isLogin.value) {
                // --- ЛОГИКА ВХОДА ---
                const { data, error: loginError } = await supabase.auth.signInWithPassword({
                    email: email.value,
                    password: password.value
                })

                // Если Supabase не нашел почту или пароль неверный
                if (loginError) {
                    alert("Ошибка входа: " + loginError.message)
                    return // Прекращаем выполнение, на главную не пускаем
                }

                console.log("Успешный вход пользователя:", data.user.email)

            } else {
                // --- ЛОГИКА РЕГИСТРАЦИИ ---
                // 1. Создаем аккаунт в системной схеме auth.users
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: email.value,
                    password: password.value
                })

                if (authError) {
                    alert("Ошибка регистрации: " + authError.message)
                    return
                }

                // 2. Если аккаунт в Auth создан, записываем данные в нашу таблицу profiles (3НФ)
                if (authData.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: authData.user.id,
                                first_name: firstName.value.trim(),
                                last_name: lastName.value.trim(),
                                username: username.value.trim(),
                                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username.value}`
                            }
                        ])

                    if (profileError) {
                        console.error("Ошибка при создании профиля:", profileError.message)
                        alert("Аккаунт создан, но данные профиля не сохранились.")
                        return
                    }
                }
            }

            // Если мы дошли до сюда — значит ошибок нет, редиректим
            router.push('/')

        } catch (err) {
            console.error("Непредвиденная ошибка:", err)
            alert("Произошла системная ошибка. Проверьте консоль.")
        }
    }
</script>

<style scoped>
    /* Контейнер всей страницы */
    .auth-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 90vh;
        padding: 20px;
    }

    /* Обертка для карточки */
    .auth-card-wrapper {
        width: 100%;
        max-width: 420px;
    }

    /* Белая карточка */
    .auth-card {
        background: white;
        border: 2px solid #212844;
        border-radius: 28px;
        padding: 50px 40px;
        display: flex;
        flex-direction: column;
        align-items: center; /* Центрирует всё внутри */
        box-shadow: 0 15px 35px rgba(33, 40, 68, 0.08);
    }

    .auth-title {
        font-size: 32px;
        font-weight: 800;
        margin-bottom: 40px;
        color: #212844;
        text-align: center;
    }

    /* Форма и инпуты */
    .auth-form {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center; /* Выравнивает инпуты по центру */
        gap: 18px;
    }

    .auth-input {
        width: 100%;
        max-width: 320px;
        padding: 16px 20px;
        border: 2px solid #212844;
        border-radius: 14px;
        background-color: #FDFDF1;
        font-size: 16px;
        text-align: center; /* Текст внутри инпута по центру */
        transition: all 0.3s ease;
    }

        /* ГОЛУБОЙ АКЦЕНТ ПРИ НАЖАТИИ */
        .auth-input:focus {
            outline: none;
            border-color: #B0D7FF;
            box-shadow: 0 0 0 4px rgba(176, 215, 255, 0.4);
        }

    /* Кнопка */
    .btn-submit {
        width: 100%;
        max-width: 200px;
        background-color: #212844;
        color: white;
        padding: 16px;
        border-radius: 14px;
        font-weight: 700;
        margin-top: 15px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    }

        .btn-submit:hover {
            background-color: #B0D7FF; /* Голубой при наведении */
            color: #212844;
            transform: translateY(-2px);
        }

    .auth-switch {
        margin-top: 30px;
        font-size: 14px;
        color: #212844;
        opacity: 0.7;
        text-decoration: underline;
        cursor: pointer;
    }

    .error-message {
        color: #DF2935;
        font-size: 0.9rem;
        margin-top: 6px;
        text-align: left;
        padding-left: 4px;
        font-weight: 500;
    }

    .input-wrapper {
        width: 100%;
        max-width: 320px;
    }
</style>
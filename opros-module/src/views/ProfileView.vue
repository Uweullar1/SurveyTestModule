<template>
    <div class="profile-container">
        <div class="profile-content">
            <h1 class="profile-title">Настройки аккаунта</h1>

            <div class="avatar-section">
                <div class="avatar-wrapper">
                    <img :src="avatarPreview" alt="Аватар" class="avatar-img" />
                    <label for="avatar-upload" class="avatar-edit-badge">
                        <i class="bi bi-camera-fill"></i>
                    </label>
                </div>
                <input type="file" id="avatar-upload" accept="image/*" @change="uploadAvatar" hidden />
                <p class="avatar-label">Ваше фото профиля</p>
            </div>

            <div class="form-section">
                <!-- Имя -->
                <div class="form-group">
                    <label>Имя</label>
                    <input v-model="profile.first_name"
                           type="text"
                           class="profile-input"
                           @input="clearError('first_name')" />
                    <div v-if="formErrors.first_name" class="error-message">
                        {{ formErrors.first_name }}
                    </div>
                </div>

                <!-- Фамилия -->
                <div class="form-group">
                    <label>Фамилия</label>
                    <input v-model="profile.last_name"
                           type="text"
                           class="profile-input"
                           @input="clearError('last_name')" />
                    <div v-if="formErrors.last_name" class="error-message">
                        {{ formErrors.last_name }}
                    </div>
                </div>

                <!-- Username -->
                <div class="form-group">
                    <label>Username</label>
                    <input v-model="profile.username"
                           type="text"
                           class="profile-input"
                           @input="clearError('username')" />
                    <div v-if="formErrors.username" class="error-message">
                        {{ formErrors.username }}
                    </div>
                </div>
                <div class="form-group">
                    <label>Департамент</label>
                    <div class="select-wrapper">
                        <select v-model="profile.department_id" class="profile-select">
                            <option value="">Не выбран</option>
                            <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                                {{ dept.name }}
                            </option>
                        </select>
                        <span class="select-arrow">▾</span>
                    </div>
                </div>
                <!-- Email -->
                <div class="form-group">
                    <label>Email</label>
                    <div class="input-wrapper dashed">
                        <input :value="currentEmail"
                               type="email"
                               class="profile-input no-border"
                               disabled />
                        <button @click="showChangeEmailModal" class="btn-inside">Изменить</button>
                    </div>
                </div>

                <!-- Пароль -->
                <div class="form-group">
                    <label>Пароль</label>
                    <div class="input-wrapper dashed">
                        <input type="password"
                               value="••••••••"
                               class="profile-input no-border"
                               disabled />
                        <button @click="showChangePasswordModal" class="btn-inside">Изменить</button>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button @click="saveProfile"
                        :disabled="saving || hasErrors"
                        class="btn-save">
                    {{ saving ? 'Сохранение...' : 'Сохранить изменения' }}
                </button>

                <div class="secondary-actions">
                    <button @click="logout" class="btn-logout">Выйти из аккаунта</button>
                    <button @click="deleteAccount" class="btn-delete">Удалить аккаунт</button>
                </div>
            </div>
        </div>

        <Transition name="fade">
            <div v-if="showEmailModal" class="modal-overlay" @click.self="showEmailModal = false">
                <div class="modal">
                    <h3>Смена email</h3>
                    <input v-model="newEmail" type="email" placeholder="Новый email" class="modal-input" />
                    <div class="modal-buttons">
                        <button @click="changeEmail" class="btn-modal-primary">Обновить</button>
                        <button @click="showEmailModal = false" class="btn-modal-secondary">Отмена</button>
                    </div>
                </div>
            </div>
        </Transition>

        <Transition name="fade">
            <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
                <div class="modal">
                    <h3>Смена пароля</h3>
                    <input v-model="newPassword" type="password" placeholder="Новый пароль" class="modal-input" />
                    <div class="modal-buttons">
                        <button @click="changePassword" class="btn-modal-primary">Обновить</button>
                        <button @click="showPasswordModal = false" class="btn-modal-secondary">Отмена</button>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup>
    import { ref, onMounted, computed } from 'vue'
    import { supabase } from '../supabase'
    import { useRouter } from 'vue-router'
    import { profileRules } from '../utils/validation.js'

    const departments = ref([])

    const router = useRouter()

    const profile = ref({
        first_name: '',
        last_name: '',
        username: '',
        department_id: ''
    })

    const currentEmail = ref('')
    const avatarPreview = ref('https://api.dicebear.com/7.x/avataaars/svg?seed=default')

    const formErrors = ref({})
    const saving = ref(false)
    const showEmailModal = ref(false)
    const showPasswordModal = ref(false)
    const newEmail = ref('')
    const newPassword = ref('')

    // Вычисляем, есть ли ошибки
    const hasErrors = computed(() => {
        return Object.values(formErrors.value).some(error => error !== '')
    })

    // Очистка ошибки при вводе
    const clearError = (field) => {
        if (formErrors.value[field]) {
            formErrors.value[field] = ''
        }
    }

    // Загрузка профиля
    onMounted(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            currentEmail.value = user.email || ''

            const { data, error } = await supabase
                .from('profiles')
                .select('first_name, last_name, username, avatar_url, department_id') 
                .eq('id', user.id)
                .single()

            if (error && error.code === 'PGRST116') {
                // PGRST116 = "no rows returned"
                console.warn('Профиль не найден — возможно аккаунт был удалён')
                alert('Ваш профиль не найден. Возможно, аккаунт был удалён.')
                await supabase.auth.signOut()
                router.push('/login')
                return
            }

            if (error) throw error

            if (data) {
                profile.value.first_name = data.first_name || ''
                profile.value.last_name = data.last_name || ''
                profile.value.username = data.username || ''
                profile.value.department_id = data.department_id || ''
                if (data.avatar_url) avatarPreview.value = data.avatar_url
            }
            const { data: depts } = await supabase.from('departments').select('*')
            departments.value = depts || []

        } catch (err) {
            console.error(err)
            alert('Ошибка загрузки профиля')
            router.push('/login')
        }

    })


    //Загрузка аватарок
    const uploadAvatar = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        console.log('Выбран файл:', file.name, 'тип:', file.type)

        // Строгая проверка на изображение
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png']
        const allowedExtensions = ['jpg', 'jpeg', 'png']

        if (!allowedMimeTypes.includes(file.type)) {
            alert('Можно загружать только изображения!\nРазрешены: jpg, jpeg, png')
            event.target.value = ''
            return
        }

        const fileExt = file.name.split('.').pop().toLowerCase()
        if (!allowedExtensions.includes(fileExt)) {
            alert('Можно загружать только изображения с расширениями: jpg, jpeg, png')
            event.target.value = ''
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер — 5 МБ')
            event.target.value = ''
            return
        }

        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (!currentUser) {
                alert('Вы должны быть авторизованы')
                return
            }

            // Очищаем имя файла от опасных символов
            const safeFileName = `${Date.now()}-${file.name
                .replace(/[^a-zA-Z0-9.-]/g, '_')   // заменяем все плохие символы на _
                .toLowerCase()}`

            // Загружаем файл
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(safeFileName, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) throw uploadError

            // Получаем публичный URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(safeFileName)

            // Обновляем профиль
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('id', currentUser.id)

            if (updateError) throw updateError

            alert('Аватарка успешно обновлена!')

            // Обновляем превью сразу
            avatarPreview.value = urlData.publicUrl + '?t=' + Date.now()

        } catch (err) {
            console.error('Ошибка загрузки аватарки:', err)
            alert('Не удалось загрузить аватарку: ' + (err.message || 'Неизвестная ошибка'))
        }
    }


    // Сохранение с валидацией
    const saveProfile = async () => {
        formErrors.value = {}

        // Валидация
        formErrors.value.first_name = profileRules.firstName(profile.value.first_name)
        formErrors.value.last_name = profileRules.lastName(profile.value.last_name)
        formErrors.value.username = profileRules.username(profile.value.username)

        if (hasErrors.value) {
            return
        }

        saving.value = true

        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: profile.value.first_name.trim(),
                    last_name: profile.value.last_name.trim(),
                    username: profile.value.username.trim(),
                    department_id: profile.value.department_id || null
                })
                .eq('id', user.id)

            if (error) throw error

            alert('Профиль успешно обновлён!')
        } catch (err) {
            alert('Ошибка при сохранении: ' + err.message)
        } finally {
            saving.value = false
        }
    }

    // Заглушки для модалок (замени на свои функции)
    const showChangeEmailModal = () => showEmailModal.value = true
    const showChangePasswordModal = () => showPasswordModal.value = true

    const changeEmail = async () => {
        if (!newEmail.value || newEmail.value === currentEmail.value) {
            alert('Введите новый email')
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail.value.trim()
            })

            if (error) throw error

            alert('Запрос на смену email отправлен!\n\nПроверьте почту (старую и новую) и подтвердите изменение.')
            showEmailModal.value = false
            newEmail.value = ''
        } catch (err) {
            alert('Ошибка: ' + err.message)
        }
    }

    const changePassword = async () => {
        if (!newPassword.value || newPassword.value.length < 6) {
            return alert('Пароль должен быть не менее 6 символов')
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword.value })
            if (error) throw error

            alert('Пароль успешно изменён!')
            showPasswordModal.value = false
            newPassword.value = ''
        } catch (err) {
            alert('Ошибка смены пароля: ' + err.message)
        }
    }
    const logout = async () => {
        if (confirm('Выйти из аккаунта?')) {
            await supabase.auth.signOut()
            router.push('/login')
        }
    }

    const deleteAccount = async () => {
        if (!confirm('Вы уверены, что хотите удалить аккаунт?\n\nВсе ваши опросы, ответы и данные будут удалены без возможности восстановления.')) return
        if (!confirm('Это действие НЕОБРАТИМО. Вы точно хотите продолжить?')) return

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Удаляем все данные пользователя
            await supabase.from('responses').delete().eq('user_id', user.id)
            await supabase.from('surveys').delete().eq('user_id', user.id)
            await supabase.from('profiles').delete().eq('id', user.id)

            // Выходим из аккаунта
            await supabase.auth.signOut()

            alert('Аккаунт успешно удалён. Вы вышли из системы.')
            router.push('/login')
        } catch (err) {
            console.error(err)
            alert('Не удалось полностью удалить аккаунт. Попробуйте позже.')
        }
    }
</script>

<style scoped>
    .profile-container {
        display: flex;
        justify-content: center;
        padding: 60px 20px;
        min-height: 100vh;
        background: #FDFDF1;
    }

    .profile-content {
        width: 100%;
        max-width: 650px;
    }

    .profile-title {
        font-size: 2.8rem;
        font-weight: 900;
        color: #212844;
        margin-bottom: 40px;
    }

    .avatar-section {
        display: flex;
        align-items: center;
        gap: 25px;
        margin-bottom: 40px;
    }

    .avatar-wrapper {
        position: relative;
        width: 120px;
        height: 120px;
    }

    .avatar-img {
        width: 100%;
        height: 100%;
        border-radius: 30px;
        object-fit: cover;
        border: 3px solid #212844;
    }

    .avatar-edit-badge {
        position: absolute;
        bottom: 0;
        right: 0;
        background: #212844;
        color: #F2C4CE;
        width: 40px;
        height: 40px;
        border-radius: 20px 0 30px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-left: 3px solid #212844;
        border-top: 3px solid #212844;
    }

    .avatar-label {
        font-weight: 800;
        color: #212844;
        font-size: 1rem;
    }

    .form-group {
        margin-bottom: 25px;
        width: 100%;
    }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.8rem;
            color: #212844;
        }

    .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        height: 60px; /* Фиксированная высота для всех */
        box-sizing: border-box;
    }

    .profile-input {
        padding: 0 20px;
        border: 3px solid #212844;
        border-radius: 20px;
        background: #FDFDF1;
        font-size: 1.1rem;
        font-weight: 600;
        color: #212844;
    }

    .profile-input,
    .input-wrapper.dashed {
        width: 100%;
        height: 60px; /* Фиксированная высота */
        box-sizing: border-box; /* Важно: чтобы border не добавлялся к высоте */
        display: flex;
        align-items: center;
    }

    .input-wrapper.dashed {
        border: 3px dashed #212844;
        border-radius: 20px;
        position: relative;
        background: transparent;
        padding: 0; /* Убираем падинги здесь, чтобы инпут внутри прилегал ровно */
    }

        .input-wrapper.dashed .profile-input.no-border {
            border: none !important;
            background: transparent !important;
            height: 100%; /* Занимает всю высоту родителя */
            width: 100%;
            padding: 0 20px;
        }


    /* Убираем внутреннюю рамку у инпутов внутри пунктирного блока */
    .no-border {
        border: none !important;
        background: transparent !important;
        outline: none;
    }

    .btn-inside {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: #212844;
        color: white;
        border: none;
        padding: 8px 18px;
        height: 38px; /* Фиксированная высота кнопки */
        border-radius: 14px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .actions {
        margin-top: 50px;
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .btn-save {
        padding: 20px;
        background: #212844;
        color: #F2C4CE;
        border-radius: 22px;
        font-size: 1.2rem;
        font-weight: 900;
        cursor: pointer;
        border: none;
        width: 100%;
    }

    .secondary-actions {
        display: flex;
        gap: 15px;
    }

    .btn-logout, .btn-delete {
        flex: 1;
        height: 55px;
        border-radius: 18px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .btn-logout {
        background: white;
        border: 3px solid #212844;
        color: #212844;
    }

    .btn-delete {
        background: #DF2935;
        border: 3px solid #212844;
        color: white;
    }

    /* Модалки */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(33, 40, 68, 0.7);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .modal {
        background: #FDFDF1;
        border: 4px solid #212844;
        border-radius: 35px;
        padding: 45px;
        width: 95%;
        max-width: 450px;
        box-shadow: 12px 12px 0px #212844;
    }

        .modal h3 {
            color: #212844;
            font-weight: 900;
            margin-bottom: 25px;
        }

    .modal-input {
        width: 100%;
        height: 60px; /* Совпадает с основными полями */
        border: 3px solid #212844;
        border-radius: 18px;
        padding: 0 20px;
        margin-bottom: 25px;
        box-sizing: border-box;
        background: white;
    }

    .modal-buttons {
        display: flex;
        gap: 12px;
    }

    .btn-modal-primary, .btn-modal-secondary {
        height: 55px;
        border-radius: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .btn-modal-primary {
        flex: 2;
        background: #212844;
        color: white;
        border: none;
    }

    .btn-modal-secondary {
        flex: 1;
        background: transparent;
        border: 3px solid #212844;
    }

    .fade-enter-active, .fade-leave-active {
        transition: opacity 0.3s ease;
    }

    .fade-enter-from, .fade-leave-to {
        opacity: 0;
    }

    .error-message {
        color: #DF2935;
        font-size: 0.85rem;
        margin-top: 6px;
        padding-left: 4px;
    }

    .profile-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #212844;
        border-radius: 12px;
        background: #FDFDF1;
        font-size: 1rem;
    }

        .profile-input:focus {
            outline: none;
            border-color: #DF2935;
        }

    .input-wrapper.dashed {
        position: relative;
    }

    .btn-inside {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: #212844;
        color: white;
        border: none;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 0.9rem;
        cursor: pointer;
    }

    /* Обертка селекта */
    .select-wrapper {
        position: relative;
        width: 100%;
        height: 60px;
    }

    .profile-select {
        width: 100%;
        height: 60px;
        padding: 0 50px 0 20px;
        border: 2px solid #212844;
        border-radius: 20px;
        background: #FDFDF1;
        font-size: 1.1rem;
        font-weight: 600;
        color: #212844;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

        .profile-select:focus {
            outline: none;
            border-color: #DF2935;
            box-shadow: 4px 4px 0px rgba(33, 40, 68, 0.1);
        }

        .profile-select option {
            background: #FDFDF1;
            color: #212844;
            font-weight: 600;
            padding: 12px;
        }

    /* Стрелка */
    .select-arrow {
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 1.2rem;
        color: #212844;
        font-weight: 900;
        transition: transform 0.2s;
    }

    .select-wrapper:hover .select-arrow {
        transform: translateY(-50%) rotate(180deg);
    }
</style>
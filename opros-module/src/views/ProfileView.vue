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
                <input type="file"
                       accept="image/*"
                       @change="uploadAvatar"
                       id="avatar-upload"
                       hidden />
                <p class="avatar-label">Ваше фото профиля</p>
            </div>

            <div class="form-section">
                <div class="form-group">
                    <label>Имя</label>
                    <input v-model="profile.first_name" type="text" class="profile-input" />
                </div>

                <div class="form-group">
                    <label>Фамилия</label>
                    <input v-model="profile.last_name" type="text" class="profile-input" />
                </div>

                <div class="form-group">
                    <label>Username</label>
                    <input v-model="profile.username" type="text" class="profile-input" />
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <div class="input-wrapper dashed">
                        <input :value="currentEmail" type="email" class="profile-input no-border" disabled />
                        <button @click="showChangeEmailModal" class="btn-inside">Изменить</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Пароль</label>
                    <div class="input-wrapper dashed">
                        <input type="password" value="••••••••" class="profile-input no-border" disabled />
                        <button @click="showChangePasswordModal" class="btn-inside">Изменить</button>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button @click="saveProfile" :disabled="saving" class="btn-save">
                    {{ saving ? 'Сохранение...' : 'Сохранить изменения' }}
                </button>

                <div class="secondary-actions">
                    <button @click="logout" class="btn-logout">Выйти</button>
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
    import { useRouter } from 'vue-router'
    import { supabase } from '../supabase'

    const router = useRouter()
    const saving = ref(false)

    const profile = ref({
        first_name: '',
        last_name: '',
        username: '',
        avatar_url: ''
    })

    const currentEmail = ref('')
    const newEmail = ref('')
    const newPassword = ref('')

    const showEmailModal = ref(false)
    const showPasswordModal = ref(false)

    const avatarPreview = computed(() => {
        return profile.value.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.value.username || 'user'}`
    })

    onMounted(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        currentEmail.value = user.email

        const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name, username, avatar_url')
            .eq('id', user.id)
            .single()

        if (data) profile.value = { ...data }
    })

    const uploadAvatar = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        try {
            saving.value = true

            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            const { error } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            profile.value.avatar_url = publicUrl
        } catch (err) {
            alert('Ошибка загрузки аватарки: ' + err.message)
        } finally {
            saving.value = false
        }
    }

    const saveProfile = async () => {
        if (!profile.value.first_name.trim() || !profile.value.username.trim()) {
            return alert('Имя и username обязательны')
        }

        try {
            saving.value = true

            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: profile.value.first_name.trim(),
                    last_name: profile.value.last_name.trim(),
                    username: profile.value.username.trim(),
                    avatar_url: profile.value.avatar_url || null
                })
                .eq('id', user.id)

            if (error) throw error

            alert('Изменения успешно сохранены!')
            router.push('/')
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message)
        } finally {
            saving.value = false
        }
    }

    const showChangeEmailModal = () => {
        newEmail.value = ''
        showEmailModal.value = true
    }

    const showChangePasswordModal = () => {
        newPassword.value = ''
        showPasswordModal.value = true
    }

    const changeEmail = async () => {
        if (!newEmail.value) return alert('Введите новый email')

        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail.value })
            if (error) throw error

            alert('Email изменён! Подтвердите новый адрес на почте.')
            currentEmail.value = newEmail.value
            showEmailModal.value = false
        } catch (err) {
            alert('Ошибка смены email: ' + err.message)
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
        if (!confirm('Удалить аккаунт навсегда?')) return
        if (!confirm('Это действие необратимо!')) return

        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('profiles').delete().eq('id', user.id)
            await supabase.auth.admin.deleteUser(user.id)

            alert('Аккаунт удалён')
            await supabase.auth.signOut()
            router.push('/login')
        } catch (err) {
            alert('Ошибка удаления: ' + err.message)
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
</style>
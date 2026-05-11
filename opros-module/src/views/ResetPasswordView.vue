<template>
    <div class="auth-page">
        <div class="auth-card-wrapper">
            <div class="auth-card">
                <h2 class="auth-title">Новый пароль</h2>
                <input v-model="newPassword" type="password" placeholder="Новый пароль" class="auth-input" />
                <input v-model="confirmPassword" type="password" placeholder="Подтвердите пароль" class="auth-input" />
                <button @click="updatePassword" class="btn-submit">Сохранить</button>
                <p v-if="message" class="reset-message">{{ message }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')

onMounted(async () => {
    // Проверяем, что пользователь авторизован через recovery
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        router.push('/login')
    }
})

const updatePassword = async () => {
    if (newPassword.value.length < 6) return alert('Минимум 6 символов')
    if (newPassword.value !== confirmPassword.value) return alert('Пароли не совпадают')

    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) {
        message.value = 'Ошибка: ' + error.message
    } else {
        message.value = 'Пароль успешно изменен!'
        setTimeout(() => router.push('/'), 2000)
    }
}
</script>
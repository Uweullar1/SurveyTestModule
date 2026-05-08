<template>
    <div class="notif-wrapper">
        <button @click="showNotif = !showNotif" class="notif-bell">
            🔔
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
        </button>

        <div v-if="showNotif" class="notif-dropdown">
            <div v-if="notifications.length === 0" class="notif-empty">
                Нет новых уведомлений
            </div>
            <div v-for="(n, i) in notifications" :key="i" class="notif-item" @click="handleNotifClick(n)">
                <div class="notif-icon">{{ n.icon }}</div>
                <div class="notif-text">
                    <div class="notif-title">{{ n.title }}</div>
                    <div class="notif-time">{{ n.time }}</div>
                </div>
                <button @click.stop="removeNotif(i)" class="notif-close">×</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const showNotif = ref(false)
const notifications = ref(JSON.parse(localStorage.getItem('notifications') || '[]'))

const unreadCount = computed(() => notifications.value.length)

const addNotification = (title, icon = '📢') => {
    notifications.value.unshift({
        title,
        icon,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString()
    })
    localStorage.setItem('notifications', JSON.stringify(notifications.value))
}

const removeNotif = (index) => {
    notifications.value.splice(index, 1)
    localStorage.setItem('notifications', JSON.stringify(notifications.value))
}

const handleNotifClick = (n) => {
    // Здесь можно добавить переход по ссылке
}

// Экспортируем для использования в других компонентах
defineExpose({ addNotification })
</script>

<style scoped>
    .notif-wrapper {
        position: relative;
    }

    .notif-bell {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        position: relative;
        padding: 4px;
    }

    .notif-badge {
        position: absolute;
        top: 0;
        right: 0;
        background: #DF2935;
        color: white;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        font-size: 0.65rem;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .notif-dropdown {
        position: absolute;
        right: 0;
        top: 100%;
        width: 320px;
        max-height: 400px;
        overflow-y: auto;
        background: white;
        border: 2px solid #212844;
        border-radius: 16px;
        box-shadow: 4px 4px 0px rgba(33, 40, 68, 0.1);
        z-index: 1001;
        margin-top: 8px;
    }

    .notif-empty {
        padding: 20px;
        text-align: center;
        color: #888;
        font-size: 0.9rem;
    }

    .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background 0.15s;
    }

        .notif-item:hover {
            background: #FDFDF1;
        }

    .notif-icon {
        font-size: 1.2rem;
    }

    .notif-text {
        flex: 1;
    }

    .notif-title {
        font-weight: 600;
        font-size: 0.85rem;
        color: #212844;
    }

    .notif-time {
        font-size: 0.7rem;
        color: #888;
        margin-top: 2px;
    }

    .notif-close {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        font-size: 1.1rem;
        padding: 0;
    }

        .notif-close:hover {
            color: #DF2935;
        }
</style>
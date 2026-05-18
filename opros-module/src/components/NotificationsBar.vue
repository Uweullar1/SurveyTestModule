<template>
    <div class="notif-wrapper">
        <button @click="toggle" class="notif-bell">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
        </button>

        <div v-if="show" class="notif-dropdown">
            <div class="notif-header">
                <span>Уведомления</span>
                <button v-if="unreadCount > 0" @click="readAll" class="notif-read-all">Прочитать все</button>
                <button v-if="notifications.length > 0" @click="clearAll" class="notif-clear-all">Очистить все</button>
            </div>
            <div v-if="notifications.length === 0" class="notif-empty">
                Нет новых уведомлений
            </div>
            <div v-for="n in notifications" :key="n.id"
                 class="notif-item"
                 :class="{ unread: !n.is_read }"
                 @click="handleClick(n)">
                <div class="notif-icon">{{ n.icon }}</div>
                <div class="notif-text">
                    <div class="notif-title">{{ n.title }}</div>
                    <div v-if="n.message" class="notif-message">{{ n.message }}</div>
                    <div class="notif-time">{{ formatTime(n.created_at) }}</div>
                </div>
                <div v-if="!n.is_read" class="notif-dot"></div>
                <button @click.stop="removeOne(n.id)" class="notif-remove" title="Удалить">×</button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, computed } from 'vue'
    import { supabase } from '../supabase'
    import { notificationsService } from '../utils/notifications'
    import { useRouter } from 'vue-router'

    const router = useRouter()
    const show = ref(false)
    const notifications = ref([])
    const userId = ref(null)
    let pollInterval = null

    const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

    

    const toggle = () => {
        show.value = !show.value
        if (show.value) load()
    }

    const load = async () => {
        if (!userId.value) return
        notifications.value = await notificationsService.getMy(userId.value)
    }

    const readAll = async () => {
        if (!userId.value) return
        await notificationsService.markAllAsRead(userId.value)
        await load()
    }

    const handleClick = async (n) => {
        if (!n.is_read) {
            await notificationsService.markAsRead(n.id)
            await load()
        }
        if (n.link) {
            router.push(n.link)
            show.value = false
        }
    }

    const formatTime = (date) => {
        const d = new Date(date)
        const now = new Date()
        const diff = now - d
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
        return d.toLocaleDateString('ru-RU')
    }
    const removeOne = async (id) => {
        await supabase.from('notifications').delete().eq('id', id)
        await load()
    }

    const clearAll = async () => {
        if (!confirm('Удалить все уведомления?')) return
        await supabase.from('notifications').delete().eq('user_id', userId.value)
        notifications.value = []
    }

    onMounted(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            userId.value = user.id
            await load()
            pollInterval = setInterval(load, 30000) // проверка каждые 30 сек
        }
    })

    onUnmounted(() => {
        if (pollInterval) clearInterval(pollInterval)
    })
</script>

<style scoped>
    .notif-wrapper {
        position: relative;
    }

    .notif-bell {
        background: none;
        border: none;
        cursor: pointer;
        position: relative;
        padding: 6px;
        color: #212844;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
    }

        .notif-bell:hover {
            color: #DF2935;
        }

    .notif-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #DF2935;
        color: white;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        font-size: 0.6rem;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .notif-dropdown {
        position: absolute;
        right: 0;
        top: 100%;
        width: 380px; /* Было 340px — чуть шире */
        max-height: 450px;
        overflow-y: auto;
        background: white;
        border: 2px solid #212844;
        border-radius: 16px;
        box-shadow: 4px 4px 0px rgba(33,40,68,0.1);
        z-index: 1001;
        margin-top: 8px;
    }

    .notif-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #eee;
        font-weight: 800;
        font-size: 0.9rem;
    }

    .notif-read-all {
        background: none;
        border: none;
        color: #212844;
        font-size: 0.75rem;
        cursor: pointer;
        text-decoration: underline;
    }

    .notif-empty {
        padding: 24px;
        text-align: center;
        color: #888;
        font-size: 0.85rem;
    }

    .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background 0.15s;
        position: relative;
    }

        .notif-item:hover {
            background: #FDFDF1;
        }

        .notif-item.unread {
            background: #FDFDF1;
        }

    .notif-icon {
        font-size: 1.1rem;
        flex-shrink: 0;
    }

    .notif-text {
        flex: 1;
        min-width: 0;
    }

    .notif-title {
        font-weight: 600;
        font-size: 0.85rem;
        color: #212844;
    }

    .notif-message {
        font-size: 0.75rem;
        color: #666;
        margin-top: 2px;
        /* Убираем обрезку */
        white-space: normal; /* Было: nowrap */
        overflow: visible; /* Было: hidden */
        text-overflow: clip; /* Было: ellipsis */
        word-wrap: break-word; /* Перенос длинных слов */
        word-break: break-word; /* Запасной вариант */
        line-height: 1.3; /* Чуть больше межстрочный */
        max-height: 4em; /* Максимум ~3 строки */
        overflow: hidden; /* Если всё же длинный текст — обрезаем */
        display: -webkit-box;
        -webkit-line-clamp: 3; /* Показывать максимум 3 строки */
        -webkit-box-orient: vertical;
    }

    .notif-time {
        font-size: 0.65rem;
        color: #999;
        margin-top: 3px;
    }

    .notif-dot {
        width: 8px;
        height: 8px;
        background: #DF2935;
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 6px;
    }
    .notif-remove {
        background: none;
        border: none;
        color: #ccc;
        font-size: 1rem;
        cursor: pointer;
        padding: 0 4px;
        flex-shrink: 0;
    }

        .notif-remove:hover {
            color: #DF2935;
        }

    .notif-clear-all {
        background: none;
        border: none;
        color: #DF2935;
        font-size: 0.75rem;
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
    }

    .notif-header div {
        display: flex;
        align-items: center;
        gap: 4px;
    }
</style>
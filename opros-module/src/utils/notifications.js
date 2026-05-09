import { supabase } from '../supabase'

export const notificationsService = {
    // Отправить уведомление
    async send(userId, title, { message = '', icon = '📢', link = '' } = {}) {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                icon,
                link
            })
            .select('id')

        if (error) console.error('Ошибка отправки уведомления:', error)
        return data
    },

    // Получить все свои уведомления
    async getMy(userId) {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        return data || []
    },

    // Получить количество непрочитанных
    async getUnreadCount(userId) {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false)

        return count || 0
    },

    // Отметить как прочитанное
    async markAsRead(notificationId) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
    },

    // Отметить все как прочитанные
    async markAllAsRead(userId) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false)
    }
}
<template>
    <Transition name="toast">
        <div v-if="visible" :class="['toast-notification', type]">
            <span class="toast-message">{{ message }}</span>
            <button @click="close" class="toast-close">×</button>
        </div>
    </Transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
    message: String,
    type: {
        type: String,
        default: 'error' // error | success | info | warning
    },
    duration: {
        type: Number,
        default: 5000
    }
})

const emit = defineEmits(['close'])
const visible = ref(false)
let timer = null


onMounted(() => {
    icon.value = icons[props.type] || icons.info
    visible.value = true

    if (props.duration > 0) {
        timer = setTimeout(() => {
            close()
        }, props.duration)
    }
})

const close = () => {
    visible.value = false
    clearTimeout(timer)
    setTimeout(() => emit('close'), 300)
}
</script>

<style scoped>
    .toast-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 420px;
        padding: 16px 20px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        font-weight: 600;
        font-size: 0.9rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        border: 2px solid;
    }

        .toast-notification.error {
            background: #fff5f5;
            color: #c41e3a;
            border-color: #c41e3a;
        }

        .toast-notification.success {
            background: #f0fff4;
            color: #0f5132;
            border-color: #198754;
        }

        .toast-notification.info {
            background: #f0f8ff;
            color: #004085;
            border-color: #0d6efd;
        }

        .toast-notification.warning {
            background: #fffbea;
            color: #856404;
            border-color: #ffc107;
        }


    .toast-message {
        flex: 1;
    }

    .toast-close {
        background: none;
        border: none;
        font-size: 1.4rem;
        cursor: pointer;
        opacity: 0.5;
        padding: 0 4px;
        flex-shrink: 0;
        color: inherit;
    }

        .toast-close:hover {
            opacity: 1;
        }

    .toast-enter-active {
        transition: all 0.3s ease-out;
    }

    .toast-leave-active {
        transition: all 0.2s ease-in;
    }

    .toast-enter-from {
        transform: translateX(100%);
        opacity: 0;
    }

    .toast-leave-to {
        transform: translateX(100%);
        opacity: 0;
    }

    @media (max-width: 480px) {
        .toast-notification {
            left: 16px;
            right: 16px;
            max-width: none;
        }
    }
</style>
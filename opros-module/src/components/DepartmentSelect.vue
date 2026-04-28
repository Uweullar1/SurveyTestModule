<template>
    <div class="department-select">
        <label class="block text-sm font-medium text-gray-700 mb-1">Департамент</label>
        <select v-model="selectedDepartment"
                @change="$emit('update:modelValue', selectedDepartment)"
                class="minimal-input w-full">
            <option value="">Все департаменты</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
            </option>
        </select>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const props = defineProps({
    modelValue: String
})

const emit = defineEmits(['update:modelValue'])

const departments = ref([])
const selectedDepartment = ref(props.modelValue || '')

onMounted(async () => {
    const { data } = await supabase.from('departments').select('*').order('name')
    departments.value = data || []
})
</script>
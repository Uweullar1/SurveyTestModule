// src/utils/validation.js

// Основные правила валидации
export const rules = {
    // === ОПРОСЫ ===
    surveyTitle: (value) => {
        if (!value || value.toString().trim() === '') return 'Название опроса обязательно'
        if (value.toString().trim().length < 3) return 'Название должно содержать минимум 3 символа'
        if (value.toString().trim().length > 150) return 'Название не должно превышать 150 символов'
        return ''
    },

    surveyDescription: (value) => {
        if (value && value.toString().trim().length > 500) return 'Описание не должно превышать 500 символов'
        return ''
    },

    questionText: (value) => {
        if (!value || value.toString().trim() === '') return 'Текст вопроса обязателен'
        if (value.toString().trim().length < 5) return 'Вопрос должен содержать минимум 5 символов'
        if (value.toString().trim().length > 300) return 'Вопрос не должен превышать 300 символов'
        return ''
    },

    choiceText: (value) => {
        if (!value || value.toString().trim() === '') return 'Вариант ответа обязателен'
        if (value.toString().trim().length > 150) return 'Вариант ответа не должен превышать 150 символов'
        return ''
    },
}

// Удобная функция для проверки формы
export const validate = (fieldName, value) => {
    const rule = rules[fieldName]
    return rule ? rule(value) : ''
}

// Проверка нескольких полей сразу
export const validateForm = (formData) => {
    const errors = {}
    let hasErrors = false

    Object.keys(formData).forEach(key => {
        const error = validate(key, formData[key])
        if (error) {
            errors[key] = error
            hasErrors = true
        }
    })

    return { hasErrors, errors }
}

// src/utils/validation.js

export const profileRules = {
    firstName: (value) => {
        if (!value || String(value).trim() === '') return 'Имя обязательно'
        if (String(value).trim().length < 2) return 'Имя должно быть минимум 2 символа'
        if (String(value).trim().length > 50) return 'Имя слишком длинное (макс. 50 символов)'
        return ''
    },

    lastName: (value) => {
        if (value && String(value).trim().length > 50) return 'Фамилия слишком длинная (макс. 50 символов)'
        return ''
    },

    username: (value) => {
        if (!value || String(value).trim() === '') return 'Username обязателен'
        const val = String(value).trim()
        if (val.length < 3) return 'Username минимум 3 символа'
        if (val.length > 30) return 'Username максимум 30 символов'
        if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Только буквы, цифры и _'
        return ''
    },

    email: (value) => {
        if (!value || String(value).trim() === '') return 'Email обязателен'
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!regex.test(String(value).trim())) return 'Введите корректный email'
        return ''
    },

    password: (value) => {
        if (!value || String(value).trim() === '') return 'Пароль обязателен'
        if (String(value).length < 6) return 'Пароль минимум 6 символов'
        if (String(value).length > 128) return 'Пароль слишком длинный'
        return ''
    }
}

// Удобная функция проверки
export const validateField = (ruleName, value) => {
    const rule = profileRules[ruleName]
    return rule ? rule(value) : ''
}

// Проверка нескольких полей сразу
export const validateProfileForm = (formData) => {
    const errors = {}

    if (formData.firstName !== undefined) errors.firstName = validateField('firstName', formData.firstName)
    if (formData.lastName !== undefined) errors.lastName = validateField('lastName', formData.lastName)
    if (formData.username !== undefined) errors.username = validateField('username', formData.username)
    if (formData.email !== undefined) errors.email = validateField('email', formData.email)
    if (formData.password !== undefined) errors.password = validateField('password', formData.password)

    // Убираем пустые ошибки
    Object.keys(errors).forEach(key => {
        if (!errors[key]) delete errors[key]
    })

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    }
}
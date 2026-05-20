export const authErrors = {
    // Ошибки входа
    'Invalid login credentials': 'Неверный email или пароль. Проверьте данные и попробуйте снова.',
    'Invalid login': 'Неверный логин или пароль.',
    'Email not confirmed': 'Email не подтверждён. Проверьте почту и перейдите по ссылке для подтверждения.',
    'User not found': 'Пользователь с таким email не найден.',
    'Invalid email or password': 'Неверный email или пароль.',
    
    // Ошибки регистрации
    'User already registered': 'Пользователь с таким email уже зарегистрирован. Выполните вход или восстановите пароль.',
    'Email already registered': 'Этот email уже используется. Попробуйте войти или восстановить пароль.',
    'Password should be at least 6 characters': 'Пароль должен содержать минимум 6 символов.',
    'Signup requires a valid password': 'Введите пароль (минимум 6 символов).',
    'Unable to validate email address: invalid format': 'Некорректный формат email. Проверьте адрес.',
    'Invalid email': 'Некорректный email адрес.',
    'Email rate limit exceeded': 'Слишком много попыток. Подождите немного и попробуйте снова.',
    
    // Ошибки восстановления пароля
    'For security purposes, you can only request this once every 60 seconds': 'Повторный запрос можно отправить через 60 секунд.',
    
    // Общие ошибки
    'default': 'Произошла ошибка. Попробуйте позже или обратитесь в поддержку.'
}

// Функция для получения русского сообщения
export const getAuthErrorMessage = (error) => {
    if (!error) return null
    
    const message = error.message || error.error_description || error.toString()
    
    // Ищем точное совпадение
    for (const [key, value] of Object.entries(authErrors)) {
        if (message.includes(key)) return value
    }
    
    // Если не нашли — возвращаем сообщение по умолчанию
    return authErrors.default
}
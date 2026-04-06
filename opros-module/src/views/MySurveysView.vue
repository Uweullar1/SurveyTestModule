<template>
  <div class="my-surveys-container">
    <div class="content-header">
      <h1 class="page-title">Мои опросы</h1>
      <router-link to="/create" class="btn-create-new">
        + Создать опрос
      </router-link>
    </div>

    <div v-if="loading" class="loader-wrapper">
      <div class="custom-spinner"></div>
      <p>Загружаем ваши данные...</p>
    </div>

    <div v-else-if="mySurveys.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <h2>У вас пока нет опросов</h2>
      <p>Создайте свой первый опрос, чтобы начать собирать ответы.</p>
    </div>

    <div v-else class="surveys-grid">
      <div v-for="survey in mySurveys" :key="survey.id" class="survey-card">
        <div class="card-status" :class="{ 'closed': survey.is_closed }">
          {{ survey.is_closed ? 'Закрыт' : 'Активен' }}
        </div>
        
        <div class="card-main">
          <h3 class="survey-title">{{ survey.title }}</h3>
          <p class="survey-desc">
            {{ survey.description || 'Без описания' }}
          </p>
          
          <div class="survey-meta">
            <span class="meta-item">
              📅 {{ new Date(survey.created_at).toLocaleDateString('ru-RU') }}
            </span>
          </div>
        </div>

        <div class="card-actions">
          <button @click="editSurvey(survey.id)" class="btn-action edit" title="Редактировать">
            ⚙️
          </button>
          <button 
            @click="toggleVisibility(survey)" 
            class="btn-action toggle"
            :class="{ 'is-closed': survey.is_closed }"
            :title="survey.is_closed ? 'Открыть' : 'Закрыть'">
            {{ survey.is_closed ? '🔓' : '🔒' }}
          </button>
          <button @click="deleteSurvey(survey.id)" class="btn-action delete" title="Удалить">
            🗑️
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const mySurveys = ref([])
const loading = ref(true)

const loadMySurveys = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return router.push('/login')

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) console.error(error)
  else mySurveys.value = data || []

  loading.value = false
}

const editSurvey = (id) => {
  router.push(`/edit/${id}`)
}

const toggleVisibility = async (survey) => {
  const { error } = await supabase
    .from('surveys')
    .update({ is_closed: !survey.is_closed })
    .eq('id', survey.id)

  if (!error) {
    survey.is_closed = !survey.is_closed
  } else {
    alert('Ошибка при изменении видимости')
  }
}

const deleteSurvey = async (id) => {
  if (!confirm('Вы действительно хотите удалить этот опрос? Все результаты тоже будут удалены.')) return

  const { error } = await supabase
    .from('surveys')
    .delete()
    .eq('id', id)

  if (!error) {
    mySurveys.value = mySurveys.value.filter(s => s.id !== id)
  } else {
    alert('Не удалось удалить опрос')
  }
}

onMounted(loadMySurveys)
</script>
<style scoped>
.my-surveys-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
  background-color: #FDFDF1; /* Основной фон */
  min-height: 90vh;
}

/* Заголовок страницы */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.page-title {
  font-size: 2.8rem;
  font-weight: 900;
  color: #212844;
}

.btn-create-new {
  background: #212844;
  color: #F2C4CE; /* Розовый акцент */
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 16px;
  font-weight: 800;
  border: 3px solid #212844;
  transition: transform 0.2s ease;
}

.btn-create-new:hover {
  transform: translate(-4px, -4px);
  box-shadow: 4px 4px 0px #DF2935;
}

/* Сетка карточек */
.surveys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
}

/* Стилизация карточки */
.survey-card {
  background: white;
  border: 3px solid #212844;
  border-radius: 24px;
  padding: 25px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s ease;
  box-shadow: 6px 6px 0px rgba(33, 40, 68, 0.05);
}

.survey-card:hover {
  box-shadow: 10px 10px 0px #212844;
  transform: translate(-4px, -4px);
}

.card-status {
  position: absolute;
  top: -12px;
  right: 20px;
  background: #212844;
  color: #FDFDF1;
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.card-status.closed {
  background: #DF2935;
}

.survey-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #212844;
  margin-bottom: 10px;
}

.survey-desc {
  color: rgba(33, 40, 68, 0.7);
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 20px;
}

.survey-meta {
  font-size: 0.85rem;
  font-weight: 700;
  color: #212844;
  opacity: 0.6;
}

/* Кнопки действий на карточке */
.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 25px;
}

.btn-action {
  flex: 1;
  height: 45px;
  border: 2px solid #212844;
  border-radius: 12px;
  cursor: pointer;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-action.edit:hover { background: #FDFDF1; }
.btn-action.toggle:hover { background: #fdf6e3; }
.btn-action.delete:hover { background: #DF2935; color: white; }

.btn-action.toggle.is-closed {
  background: #212844;
  color: white;
}

/* Состояния загрузки и пустоты */
.loader-wrapper, .empty-state {
  text-align: center;
  padding: 80px 0;
}

.custom-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #FDFDF1;
  border-top: 5px solid #212844;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-state h2 {
  font-weight: 900;
  color: #212844;
}
</style>

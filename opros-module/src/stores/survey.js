import { defineStore } from 'pinia'

export const useSurveyStore = defineStore('survey', {
    state: () => ({
        surveys: [],                // список опросов на главной
        currentSurvey: null,
        user: null,
        lastResponses: {},          // ответы последнего прохождения
        lastSurveyId: null,
        lastCorrectCount: null,
        lastTotalQuestions: 0,
        lastSurveyTitle: ''
    }),

    actions: {
        setSurveys(newSurveys) {
            this.surveys = newSurveys
        },
        addSurvey(newSurvey) {
            this.surveys.push(newSurvey)
        },
        saveLastResponses(responses, surveyId, correctCount, totalQuestions, surveyTitle) {
            this.lastResponses = { ...responses }
            this.lastSurveyId = surveyId
            this.lastCorrectCount = correctCount
            this.lastTotalQuestions = totalQuestions
            this.lastSurveyTitle = surveyTitle || 'Опрос'
        },
        clearLastResponses() {
            this.lastResponses = {}
            this.lastSurveyId = null
            this.lastCorrectCount = null
            this.lastTotalQuestions = 0
            this.lastSurveyTitle = ''
        }
    }
})
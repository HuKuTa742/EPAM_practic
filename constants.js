'use strict';
const STATUSES_NAMES = {
    open: 'Открыта регистрация',
    ready: 'Готова к старту',
    starting: 'Стартует',
    inProcess: 'В процессе',
    paused: 'На паузе',
    canceled: 'Отменена',
    finished: 'Завершена',
    error: 'Ошибочный статус'
};

const ROLE_POLICE_ID = 1
const ROLE_THIEF_ID = 2

const ROLE_TITLES = {
    [ROLE_POLICE_ID]: 'полиция',
    [ROLE_THIEF_ID]: 'мошенники',
}

const DICTIONARY = {
    createGame: 'Создать Игру'
}
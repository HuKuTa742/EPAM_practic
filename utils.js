'use strict';
// utilities
const utils = {
    getStatusName: (status) => (
        !status
            ? STATUSES_NAMES.open
            : (STATUSES_NAMES[status] || STATUSES_NAMES.error)
    ),

    canUserCancelGame: (gameApi, gameInfo) => {
        if (gameInfo.status === GameApi.GameStatus.canceled &&
            gameInfo.status === GameApi.GameStatus.finished) {
            return false;
        }
        return gameInfo && gameInfo.owner && gameInfo.owner.id &&
            gameApi && gameApi.questor && gameApi.questor.user &&
            (gameApi.questor.user.isAdmin ||
                gameInfo.owner.id.toLowerCase() === gameApi.questor.user.id.toLowerCase());
    },
    unpackMap: (map) => {
        let i, location, unpacked = [];
        let cellCount = map.width * map.height;
        //fill blanks
        for (i = 0; i < cellCount; i++) {
            unpacked.push(GameApi.MapCellType.empty);
        }
        for (i = 0; i < map.cells.length; i++) {
            var cell = map.cells[i];
            location = cell.location.y * map.width + cell.location.x;
            if (cell.type !== GameApi.MapCellType.policeRespawn &&
                cell.type !== GameApi.MapCellType.thiefRespawn) {
                unpacked[location] = cell.type;
            }
        }

        return {width: map.width, height: map.height, cells: unpacked};
    },
    templator: (s, d) => {
        for (let p in d) {
            s = s.replace(new RegExp('{' + p + '}', 'g'), d[p]);
        }
        return s;
    },
    createCallbacks: () => ({
        syncing: $.Callbacks(),
        synced: $.Callbacks(),
        captionChanged: $.Callbacks(),
        timerChanged: $.Callbacks(),
        mapChanged: $.Callbacks(),
        teamCaptionChanged: $.Callbacks(),
        teamLivesChanged: $.Callbacks(),
        teamCoinsChanged: $.Callbacks(),
        teamPlayersChanged: $.Callbacks(),
        playerChanged: $.Callbacks(),
        statusChanged: $.Callbacks(),
        invalidGame: $.Callbacks()
    }),
    createPlayerFromStats: (stats = {}, existingPlayer = {}) => ({
        ...existingPlayer,
        id: stats.userId,
        name: stats.login,
        coins: stats.coinsCollected,
        lives: stats.livesCollected,
        deaths: stats.deaths,
        alive: stats.alive,
        connected: stats.connected,
        x: stats.location.x,
        y: stats.location.y,
    }),
    createTeamFromStats: (stats = {}) => {
        const team = {
            id: stats.teamId,
            name: stats.name,
            role: stats.role,
            lives: stats.currentLives,
            coins: stats.coinsCollected,
            winner: stats.winner,
            players: {},
        };

        stats.playerStats && stats.playerStats.forEach((playerStat)=>{
            const player = utils.createPlayerFromStats(playerStat);
            team.players[player.id] = player;
        });

        return team;
    },
    reWriteDomElement: (el, content) => {
        if (!el) return el;
        el.innerHTML = content;
        return el;
    },
    writeDomElement: (el, content) => {
        el.innerHTML += content;
        return el;
    },
    removeClasses: (el, classes = []) => {
        if (!el) return el;
        const fn = (cl) => el.classList.remove(cl)
        if (Array.isArray(classes)) {
            classes.forEach(fn)
        } else {
            fn(classes)
        }
        return el;
    },
    addClasses: (el, classes = []) => {
        if (!el) return el;
        const fn = (cl) => el.classList.add(cl)
        if (Array.isArray(classes)) {
            classes.forEach(fn)
        } else {
            fn(classes)
        }
        return el;
    }
}


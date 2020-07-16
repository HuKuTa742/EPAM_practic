// game.html State
(function (app, $) {
    (function (game) {
        game.GameState = (function() {

            function GameState(gameApi) {
                this.gameApi = gameApi;
                this.callbacks = utils.createCallbacks();
                this.game = null;
                this.name = "";
                this.owner = {};
                this.status = GameApi.GameStatus.open;
                this.millisecondsToSwitch = 0;
                this.millisecondsToSwitchDate = Date.now();
                this.switchTimeout = 0;
                this.switchTimer = null;
                this.teams = {
                    team1: {players: null},
                    ream2: {players: null}
                };
                this.map = {};
            }
            GameState.prototype.request = function () {
                if (!this.game) {
                    this.callbacks.syncing.fire();
                    this.game = this.gameApi.subscribe();
                    this.game.onError(function (error) {
                        console.log(error);
                        if (error) {
                            if (error.error === 'invalidGame') {
                                this.callbacks.synced.fire(false, error);
                            }
                        }
                    }.bind(this));
                    this.listen();
                }
            };
            GameState.prototype.listen = function () {
                this.game.onSync(function (data) {
                    this.sync(data);
                }.bind(this));

                this.game.onStarting(function (data) {
                    this.setStatus(GameApi.GameStatus.starting);
                }.bind(this));

                this.game.onStarted(function (data) {
                    this.setStatus(GameApi.GameStatus.inProcess);
                    this.setMillisecondsToSwitch(data.millisecodsToSwitch);
                }.bind(this));

                this.game.onPaused(function () {
                    this.setStatus(GameApi.GameStatus.paused);
                }.bind(this));

                this.game.onCanceled(function () {
                    this.setStatus(GameApi.GameStatus.canceled);
                }.bind(this));

                this.game.onFinished(function (data) {
                    this.setWinners(data.teamId);
                }.bind(this));

                this.game.onCoinsChanged(function(data) {
                    this.setTeamCoins(data.teamId, data.coins);
                }.bind(this));

                this.game.onLivesChanged(function (data) {
                    this.setTeamLives(data.teamId, data.lives);
                }.bind(this));

                this.game.onCellChanged(function (data) {
                    this.setMapCell(data.x, data.y, data.type);
                }.bind(this));

                this.game.onRolesSwitched(function (data) {
                    var t = data[0];
                    this.setTeamRole(t.teamId, t.role);
                    t = data[1];
                    this.setTeamRole(t.teamId, t.role);
                    this.setMillisecondsToSwitch();
                }.bind(this));

                this.game.onPlayerJoined(function (data) {
                    this.addPlayerFromStats(data.teamId, data.stats);
                }.bind(this));

                this.game.onPlayerLeft(function (data) {
                    this.removePlayer(data.user.id);
                }.bind(this));

                this.game.onPlayerMoved(function (data) {
                    this.movePlayer(data.userId, data.location.x, data.location.y);
                }.bind(this));

                this.game.onPlayerDied(function (data) {
                    this.kill(data.userId);
                }.bind(this));

                this.game.onPlayerRespawned(function (data) {
                    this.respawn(data.userId, data.location.x, data.location.y);
                }.bind(this));

                this.game.onLifeCollected(function (data) {
                    this.addLifeCollected(data.userId);
                }.bind(this));

                this.game.onCoinCollected(function (data) {
                    this.addCoinCollected(data.userId);
                }.bind(this));

                this.game.onAny(function (data) {
                    if (data && data.message) {
                        //console.log('Log:', data.message, data.data);
                    }
                }.bind(this));
            };
            GameState.prototype.setStatus = function (status) {
                this.status = status;
                this.millisecondsToSwitchDate = Date.now();
                this.runTimer();
                this.callbacks.captionChanged.fire(this.name, this.status);
                this.callbacks.statusChanged.fire(this.status);
                this.callbacks.mapChanged.fire(this.map);
            };
            GameState.prototype.setTimer = function () {
                if (this.status !== GameApi.GameStatus.inProcess) {
                    return false;
                }
                var msSpend = Date.now() - this.millisecondsToSwitchDate;
                if (msSpend >= this.millisecondsToSwitch) {
                    this.callbacks.timerChanged.fire({m: 0, s: 0, total: 0}, this.switchTimeout);
                    return false;
                }
                var ms = this.millisecondsToSwitch - msSpend;
                this.millisecondsToSwitchDate += msSpend;
                this.millisecondsToSwitch -= msSpend;
                var seconds = Math.floor(ms/1000);
                var minutes = Math.floor(seconds/60);
                seconds = seconds - minutes * 60;
                this.callbacks.timerChanged.fire({m: minutes, s: seconds, total: ms}, this.switchTimeout);
                return true;
            };
            GameState.prototype.runTimer = function () {
                if (this.switchTimer) {
                    clearTimeout(this.switchTimer);
                }
                var timeout = 1000;
                var callback = function () {
                    if (this.setTimer()) {
                        this.switchTimer = setTimeout(callback, timeout);
                    }
                }.bind(this);
                this.switchTimer = setTimeout(callback, 0);
            };
            GameState.prototype.setMillisecondsToSwitch = function (milliseconds) {
                if (milliseconds < 0) {
                    milliseconds = 0;
                }
                this.millisecondsToSwitch = milliseconds || this.switchTimeout;
                this.millisecondsToSwitchDate = Date.now();
                this.runTimer();
            };
            GameState.prototype.setMapCell = function (x, y, type) {
                if (this.map.cells) {
                    var location = this.map.width * y + x;
                    if (location < this.map.cells.length) {
                        this.map.cells[location] = type;
                    }
                    this.callbacks.mapChanged.fire(this.map);
                }
            };
            GameState.prototype.getTeam = function (id) {
                return this.teams[id];
            };
            GameState.prototype.setTeamRole = function (id, role) {
                var team = this.getTeam(id);
                if (team) {
                    team.role = role;
                    this.callbacks.teamCaptionChanged.fire(team);
                    this.callbacks.mapChanged.fire(this.map);
                }
            };
            GameState.prototype.setTeamLives = function (id, lives) {
                var team = this.getTeam(id);
                if (team) {
                    team.lives = lives;
                    this.callbacks.teamLivesChanged.fire(team);
                }
            };
            GameState.prototype.setTeamCoins = function (id, coins) {
                var team = this.getTeam(id);
                if (team) {
                    team.coins = coins;
                    this.callbacks.teamCoinsChanged.fire(team);
                }
            };
            GameState.prototype.setWinners = function (id) {
                this.setStatus(GameApi.GameStatus.finished);
                var team = this.getTeam(id);
                if (team) {
                    team.winner = true;
                    this.callbacks.teamCaptionChanged.fire(team);
                }
            };
            GameState.prototype.getPlayer = function (id) {
                return this.teams && this.teams.team1 && this.teams.team2 ?
                    this.teams.team1.players[id] || this.teams.team2.players[id] : null;
            };
            GameState.prototype.removePlayerFromTeam = function (player, team, disconnected) {
                if (disconnected) {
                    player.connected = false;
                    this.callbacks.playerChanged.fire(player, team);
                }
                else {
                    delete team.players[player.id];
                    this.callbacks.teamPlayersChanged.fire(team);
                }
                this.callbacks.statusChanged.fire(this.status);
                this.callbacks.mapChanged.fire(this.map);
            };
            GameState.prototype.removePlayer = function (id) {
                var disconnected = this.status !== GameApi.GameStatus.open &&
                    this.status !== GameApi.GameStatus.ready;
                var team = this.teams.team1;
                var player = team ? team.players[id] : null;
                if (player) {
                    this.removePlayerFromTeam(player, team, disconnected);
                }
                else {
                    team = this.teams.team2;
                    player = team ? team.players[id] : null;
                    if (player) {
                        this.removePlayerFromTeam(player, team, disconnected);
                    }
                }
            };
            GameState.prototype.addPlayerFromStats = function (teamId, playerStats) {
                var team = this.getTeam(teamId);
                if (team) {
                    var player = utils.createPlayerFromStats(playerStats);
                    team.players[player.id] = player;
                    this.callbacks.statusChanged.fire(this.status);
                    this.callbacks.teamPlayersChanged.fire(team);
                    this.callbacks.mapChanged.fire(this.map);
                }
            };
            GameState.prototype.updatePlayerStats = function (id, stats) {
                var player = this.getPlayer(id);
                if (player) {
                    utils.createPlayerFromStats(stats, player);
                    this.callbacks.playerChanged.fire(player);
                    this.callbacks.mapChanged.fire(this.map);
                }
            };
            GameState.prototype.movePlayer = function (id, x, y) {
                var player = this.getPlayer(id);
                if (player) {
                    player.x = x;
                    player.y = y;
                    this.callbacks.mapChanged.fire(this.map);
                }
            };
            GameState.prototype.kill = function (id) {
                var player = this.getPlayer(id);
                if (player) {
                    player.alive = false;
                    player.deaths += 1;
                    this.callbacks.playerChanged.fire(player);
                    this.callbacks.mapChanged.fire(this.map);
                }
            };
            GameState.prototype.respawn = function (id, x, y) {
                var player = this.getPlayer(id);
                if (player) {
                    player.alive = true;
                    player.x = x;
                    player.y = y;
                    this.callbacks.playerChanged.fire(player);
                    this.callbacks.mapChanged.fire(this.map);
                }
            };
            GameState.prototype.addLifeCollected = function (id) {
                var player = this.getPlayer(id);
                if (player) {
                    player.lives += 1;
                    this.callbacks.playerChanged.fire(player);
                }
            };
            GameState.prototype.addCoinCollected = function (id) {
                var player = this.getPlayer(id);
                if (player) {
                    player.coins += 1;
                    this.callbacks.playerChanged.fire(player);
                }
            };
            GameState.prototype.sync = function (syncData) {
                this.name = syncData.game.name;
                this.owner = syncData.game.owner;
                this.status = syncData.game.status;
                this.millisecondsToSwitch = syncData.game.millisecodsToSwitch;
                this.millisecondsToSwitchDate = Date.now();
                this.switchTimeout = syncData.game.switchTimeout;
                this.map = utils.unpackMap(syncData.game.map);
                this.teams.team1 = utils.createTeamFromStats(syncData.game.team1Stats);
                this.teams[this.teams.team1.id] = this.teams.team1;
                this.teams.team2 = utils.createTeamFromStats(syncData.game.team2Stats);
                this.teams[this.teams.team2.id] = this.teams.team2;

                //Reconnect if connection was lost
                var selfJoined = this.getPlayer(this.gameApi.questor.user.id);
                if (selfJoined) {
                    this.game.join();
                }

                this.runTimer();

                this.callbacks.captionChanged.fire(this.name, this.status);
                this.callbacks.teamCaptionChanged.fire(this.teams.team1);
                this.callbacks.teamCaptionChanged.fire(this.teams.team2);
                this.callbacks.teamLivesChanged.fire(this.teams.team1);
                this.callbacks.teamLivesChanged.fire(this.teams.team2);
                this.callbacks.teamCoinsChanged.fire(this.teams.team1);
                this.callbacks.teamCoinsChanged.fire(this.teams.team2);
                this.callbacks.teamPlayersChanged.fire(this.teams.team1);
                this.callbacks.teamPlayersChanged.fire(this.teams.team2);
                this.callbacks.mapChanged.fire(this.map);
                this.callbacks.statusChanged.fire(this.status);
                this.callbacks.synced.fire(true);
            };

            return GameState;
        })();
    })(app.game = app.game || {});
})(window.app = window.app || {}, $);

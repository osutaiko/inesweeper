document.addEventListener('DOMContentLoaded', () => {
    /* Constants and Variables */
    const DIFFICULTIES = [
        { name: 'beginner', height: 9, width: 9, totalMines: 5, totalNegMines: 5 },
        { name: 'intermediate', height: 16, width: 16, totalMines: 18, totalNegMines: 18 },
        { name: 'expert', height: 16, width: 30, totalMines: 45, totalNegMines: 45 }
    ];

    const TILE_STATUSES = {
        HIDDEN: 'hidden',
        MINE: 'mine', // Only appears when game is lost
        NEG_MINE: 'neg-mine',
        REVEALED: 'revealed',
        FLAGGED: 'flagged',
        NEG_FLAGGED: 'neg-flagged'
    };

    let timerInterval;
    let elapsedTime = 0;
    let isFirstClick = true; // Turns into false after first tile is revealed
    let lastRevealedTile = null;
    let board; // Variable to hold the game board

    /* DOM Elements */
    const timerElement = document.getElementById('timer');
    const infobarElement = document.querySelector('.board-info-bar');
    const boardElement = document.querySelector('.board');
    const minesLeftText = document.querySelector('[mines-left]');
    const negMinesLeftText = document.querySelector('[neg-mines-left]');
    const statusButton = document.querySelector('#status-button');

    /* Event Listeners */
    const difficultyOptions = document.querySelectorAll('.difficulty-option');
    statusButton.addEventListener('click', () => {
        location.reload();
    });
    document.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            location.reload();
        }
    });

    /* Functions */
    function getDifficultySettings(difficulty) { // Returns { height, width, totalMines, totalNegMines } corresponding to difficulty
        return DIFFICULTIES.find(level => level.name === difficulty) || null;
    }

    function randomNumber(size) { // Returns integer in [0, size)
        return Math.floor(Math.random() * size);
    }

    function positionMatch(a, b) {
        return a.i === b.i && a.j === b.j;
    }

    function getMinePositions(height, width, totalMines, totalNegMines) { // Randomly generates mine locations (retries when mine already exists in list) and returns the list
        const positions = [];

        while (positions.length < totalMines + totalNegMines) {
            const position = {
                i: randomNumber(height),
                j: randomNumber(width)
            };

            if (!positions.some(positionMatch.bind(null, position))) {
                positions.push(position);
            }
        }

        return positions;
    }

    function createBoard(height, width, totalMines, totalNegMines) {
        const minePositions = getMinePositions(height, width, totalMines, totalNegMines);
        const newBoard = [];

        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const element = document.createElement('div');
                element.dataset.status = TILE_STATUSES.HIDDEN;
    
                // Determine mineType based on position in minePositions list
                let mineType = 0;
                const index = minePositions.findIndex(position => position.i === i && position.j === j);
                if (index !== -1) {
                    if (index < totalMines) {
                        mineType = 1; // Positive mine
                    } else if (index < totalMines + totalNegMines) {
                        mineType = -1; // Negative mine
                    }
                }
    
                const tile = {
                    element,
                    i,
                    j,
                    hasMine: mineType !== 0,
                    mineType,
                    get status() {
                        return this.element.dataset.status;
                    },
                    set status(value) {
                        this.element.dataset.status = value;
                    }
                };
    
                row.push(tile);
            }
            newBoard.push(row);
        }

        return newBoard;
    }

    function revealTile(tile) {
        if (isFirstClick) {
            startTimer();

            if (tile.hasMine) {
                const newMinePosition = {
                    i: randomNumber(board.length),
                    j: randomNumber(board[0].length)
                };

                while (board[newMinePosition.i][newMinePosition.j].hasMine) {
                    newMinePosition.i = randomNumber(board.length);
                    newMinePosition.j = randomNumber(board[0].length);
                }

                const newTile = board[newMinePosition.i][newMinePosition.j];
                tile.hasMine = false;
                newTile.hasMine = true;
                newTile.mineType = tile.mineType;
                tile.mineType = 0;
            }
            isFirstClick = false;
        }

        lastRevealedTile = tile;

        if (tile.status != TILE_STATUSES.HIDDEN) return;

        if (tile.mineType === 1) {
            tile.status = TILE_STATUSES.MINE;
            return;
        } else if (tile.mineType === -1) {
            tile.status = TILE_STATUSES.NEG_MINE;
            return;
        }

        tile.status = TILE_STATUSES.REVEALED;
        const adjacentTiles = nearbyTiles(tile);
        const mines = adjacentTiles.filter(t => t.mineType === 1);
        const neg_mines = adjacentTiles.filter(t => t.mineType === -1);

        if (mines.length - neg_mines.length === 0) {
            adjacentTiles.forEach(tile => {
                if (!tile.hasMine) {
                    revealTile(tile);
                }
            });
        } 
        
        // Color code the numbers
        if (!(mines.length === 0 && neg_mines.length === 0)) {
            const numberColors = ['#ffffff', '#4600ff', '#008809', '#ff0000', '#1e007c', '#8e0000', '#008483', '#000000', '#808080'];
            const negNumberColors = ['#b9ff00', '#ff77f6', '#00ffff', '#e1ff83', '#71ffff', '#ff7b7c', '#ffffff', '#7f7f7f'];
            const number = mines.length - neg_mines.length;
            tile.element.textContent = number;
            if (number >= 0) {
                tile.element.style.color = numberColors[number];
            } else {
                tile.element.style.color = negNumberColors[-number - 1];
            }
        }
    }

    function flagTile(tile) {
        const statusOrder = [TILE_STATUSES.HIDDEN, TILE_STATUSES.FLAGGED, TILE_STATUSES.NEG_FLAGGED];
    
        const currentIndex = statusOrder.indexOf(tile.status);
        if (currentIndex === -1) return;
    
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        tile.status = statusOrder[nextIndex];
    }

    function listMinesLeft() { // Updates number of unflagged mines
        const flaggedTilesCount = board.reduce((count, row) => {
            return count + row.filter(tile => tile.status === TILE_STATUSES.FLAGGED).length;
        }, 0);
        const negFlaggedTilesCount = board.reduce((count, row) => {
            return count + row.filter(tile => tile.status === TILE_STATUSES.NEG_FLAGGED).length;
        }, 0);
        minesLeftText.textContent = totalMines - flaggedTilesCount;
        negMinesLeftText.textContent = totalNegMines - negFlaggedTilesCount;
    }

    function nearbyTiles({ i, j }) { // Returns list of adjacent tiles
        const tiles = [];

        for (let iOffset = -1; iOffset <= 1; iOffset++)
            for (let jOffset = -1; jOffset <= 1; jOffset++) {
                if (iOffset === 0 && jOffset === 0) continue;
                const tile = board[i + iOffset]?.[j + jOffset];
                if (tile) tiles.push(tile);
            }

        return tiles;
    }

    function checkWin() { // Game won if every safe tile is revealed, and every mine is either flagged or hidden
        return board.every(row => {
            return row.every(tile => {
                return tile.status === TILE_STATUSES.REVEALED || (tile.hasMine && (tile.status === TILE_STATUSES.HIDDEN 
                    || tile.status === TILE_STATUSES.FLAGGED || tile.status === TILE_STATUSES.NEG_FLAGGED));
            });
        });
    }

    function checkLoss() { // Game lost if some tile with a mine is revealed (hidden -> mine or neg-mine)
        return board.some(row => {
            return row.some(tile => {
                return tile.status === TILE_STATUSES.MINE || tile.status === TILE_STATUSES.NEG_MINE;
            });
        });
    }

    function checkGameEnd() {
        const is_win = checkWin();
        const is_loss = checkLoss();

        if (is_win || is_loss) {
            stopTimer();

            boardElement.addEventListener('mousedown', stopProp, { capture: true });
            boardElement.addEventListener('mouseup', stopProp, { capture: true });

            if (isRightClickToggled) {
                isRightClickToggled = false;
                toggleFlagOverlay();
            }
        }

        if (is_win) {
            statusButton.textContent = '😎';
            minesLeftText.textContent = '0'; // Automatically flag every mine
            negMinesLeftText.textContent = '0';
            board.forEach(row => {
                row.forEach(tile => {
                    if (tile.status !== TILE_STATUSES.FLAGGED) {
                        if (tile.mineType === 1) {
                            tile.status = TILE_STATUSES.FLAGGED;
                        } else if (tile.mineType === -1) {
                            tile.status = TILE_STATUSES.NEG_FLAGGED;
                        }
                    }
                });
            });
            
            var bestTime = localStorage.getItem('omega-' + selectedDifficulty + '-time');
            if (bestTime === null || elapsedTime < bestTime) {
                saveBestTime();
            }
        }

        if (is_loss) {
            statusButton.textContent = '😵';

            board.forEach(row => {
                row.forEach(tile => {
                    if (!tile.hasMine) {
                        if (tile.status === TILE_STATUSES.FLAGGED || tile.status === TILE_STATUSES.NEG_FLAGGED) {
                            tile.element.innerHTML += '<span class="red-x">❌</span>';
                        }
                    } else if (tile.mineType === 1) {
                        if (tile.status === TILE_STATUSES.HIDDEN) {
                            tile.status = TILE_STATUSES.MINE;
                        } else if (tile.status === TILE_STATUSES.NEG_FLAGGED) {
                            tile.status = TILE_STATUSES.MINE;
                            tile.element.style.backgroundColor = '#fd0';
                        }
                    } else if (tile.mineType === -1) {
                        if (tile.status === TILE_STATUSES.HIDDEN) {
                            tile.status = TILE_STATUSES.NEG_MINE;
                        } else if (tile.status === TILE_STATUSES.FLAGGED) {
                            tile.status = TILE_STATUSES.NEG_MINE;
                            tile.element.style.backgroundColor = '#fd0';
                        }
                    }
                });
            });

            if (lastRevealedTile) { // Indicate the mine user clicked (or chorded) on, which caused them to lose
                if (lastRevealedTile.hasMine) {
                    lastRevealedTile.element.style.backgroundColor = '#f00';
                }
            }

        }
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            elapsedTime += 0.01;
            timerElement.textContent = elapsedTime.toFixed(2);
        }, 10);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function stopProp(e) {
        e.stopImmediatePropagation();
    }

    function handleTileClick(tile) {
        if (tile.status === TILE_STATUSES.HIDDEN) {
            revealTile(tile);
            checkGameEnd();
        }
    }

    function handleTileRightClick(tile) {
        flagTile(tile);
        listMinesLeft();
    }

    function handleTileChord(tile) {
        const hiddenNeighbors = nearbyTiles(tile).filter(t => t.status === TILE_STATUSES.HIDDEN);
        if (hiddenNeighbors.length !== 1) {
            return;
        }

        var flagSum = nearbyTiles(tile).filter(t => t.status == TILE_STATUSES.FLAGGED).length
            - nearbyTiles(tile).filter(t => t.status == TILE_STATUSES.NEG_FLAGGED).length;

        if (parseInt(tile.element.textContent) === flagSum) {
            revealTile(hiddenNeighbors[0]);
            checkGameEnd();
        }
    }

    function saveBestTime() {
        localStorage.setItem('omega-' + selectedDifficulty + '-time', elapsedTime.toFixed(2));
        document.getElementById('omega-' + selectedDifficulty + '-time').textContent = elapsedTime.toFixed(2);
    }

    function toggleFlagOverlay() {
        board.forEach(row => {
            row.forEach(tile => {
                if (isRightClickToggled && tile.status === TILE_STATUSES.HIDDEN) {
                    tile.element.classList.add('overlay-flag');
                } else {
                    tile.element.classList.remove('overlay-flag');
                }
            });
        });
    }

    /* Game Initialization */
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDifficulty = urlParams.get('difficulty') || 'beginner'; // Get game difficulty from url; beginner if not specified
    const { height, width, totalMines, totalNegMines } = getDifficultySettings(selectedDifficulty);

    board = createBoard(height, width, totalMines, totalNegMines); // Create the game board

    boardElement.style.setProperty('--board-height', height);
    boardElement.style.setProperty('--board-width', width);
    infobarElement.style.setProperty('--board-width', width);

    minesLeftText.textContent = totalMines;
    negMinesLeftText.textContent = totalNegMines;

    difficultyOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedDifficulty = option.id;
            window.location.href = `${window.location.origin}${window.location.pathname}?difficulty=${selectedDifficulty}`;
        });
    });

    let isLeftButtonDown = false;
    let isRightButtonDown = false;
    
    var isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    var isRightClickToggled = false;
    //if (isTouchDevice)
    {
        var toggleClickButton = document.getElementById('toggle-button');
        toggleClickButton.addEventListener('click', () => {
            isRightClickToggled = !isRightClickToggled;
            toggleClickButton.textContent = isRightClickToggled ? '🚩' : '⛏️';
            toggleFlagOverlay();
        });
    }


    board.forEach(row => {
        row.forEach(tile => {
            boardElement.append(tile.element);

            tile.element.addEventListener('mousedown', e => {
                e.preventDefault();
                const thisButton = isRightClickToggled ? (2 - e.button) : e.button;
                if (thisButton === 0) { // LMB
                    isLeftButtonDown = true;
                }
                if (thisButton === 2) { // RMB
                    isRightButtonDown = true;
                    handleTileRightClick(tile);
                    toggleFlagOverlay();
                }
            });

            tile.element.addEventListener('mouseup', e => {
                e.preventDefault();
                const thisButton = isRightClickToggled ? (2 - e.button) : e.button;
                if (thisButton === 0) {
                    isLeftButtonDown = false;
                    if (isRightButtonDown) {
                        handleTileChord(tile);
                    } else {
                        handleTileClick(tile);
                    }
                } else if (thisButton === 1) {
                    handleTileChord(tile);
                } else if (thisButton === 2) {
                    isRightButtonDown = false;
                    if (isLeftButtonDown) {
                        handleTileChord(tile);
                    }
                }

                if (isTouchDevice && tile.status === TILE_STATUSES.REVEALED) {
                    handleTileChord(tile);
                }
            });

            tile.element.addEventListener('contextmenu', e => {
                e.preventDefault();
            });
        });
    });
});

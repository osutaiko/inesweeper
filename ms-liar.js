document.addEventListener('DOMContentLoaded', () => {
    /* Constants and Variables */
    const DIFFICULTIES = [
        { name: 'beginner', height: 9, width: 9, totalMines: 10 },
        { name: 'intermediate', height: 16, width: 16, totalMines: 40 },
        { name: 'expert', height: 16, width: 30, totalMines: 99 }
    ];

    const TILE_STATUSES = {
        HIDDEN: 'hidden',
        MINE: 'mine', // Only appears when game is lost
        REVEALED: 'revealed',
        FLAGGED: 'flagged'
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
    function getDifficultySettings(difficulty) { // Returns { height, width, totalMines } corresponding to difficulty
        return DIFFICULTIES.find(level => level.name === difficulty) || null;
    }

    function randomNumber(size) { // Returns integer in [0, size)
        return Math.floor(Math.random() * size);
    }

    function positionMatch(a, b) {
        return a.i === b.i && a.j === b.j;
    }

    function getMinePositions(height, width, totalMines) { // Randomly generates mine locations (retries when mine already exists in list) and returns the list
        const positions = [];

        while (positions.length < totalMines) {
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

    function createBoard(height, width, totalMines) {
        const minePositions = getMinePositions(height, width, totalMines);
        const newBoard = [];

        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const element = document.createElement('div');
                element.dataset.status = TILE_STATUSES.HIDDEN;

                const tile = {
                    element,
                    i,
                    j,
                    hasMine: minePositions.some(positionMatch.bind(null, { i, j })),

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
            }
            isFirstClick = false;
        }

        lastRevealedTile = tile;

        if (tile.status != TILE_STATUSES.HIDDEN) return;

        if (tile.hasMine) {
            tile.status = TILE_STATUSES.MINE;
            return;
        }

        tile.status = TILE_STATUSES.REVEALED;
        const adjacentTiles = nearbyTiles(tile);
        const mines = adjacentTiles.filter(t => t.hasMine);

        if (mines.length === 0) {
            adjacentTiles.forEach(revealTile);
        } else { // Color code the numbers
            const numberColors = ['#ffffff', '#4600ff', '#008809', '#ff0000', '#1e007c', '#8e0000', '#008483', '#000000', '#808080'];
            const number = mines.length + randomNumber(2) * 2 - 1;
            tile.element.textContent = number;
            tile.element.style.color = numberColors[number];
        }
    }

    function flagTile(tile) { // Flag tile if tile is unflagged and v.v.
        if (tile.status !== TILE_STATUSES.HIDDEN && tile.status !== TILE_STATUSES.FLAGGED) return;

        if (tile.status === TILE_STATUSES.FLAGGED) tile.status = TILE_STATUSES.HIDDEN;
        else tile.status = TILE_STATUSES.FLAGGED;
    }

    function listMinesLeft() { // Updates number of unflagged mines
        const flaggedTilesCount = board.reduce((count, row) => {
            return count + row.filter(tile => tile.status === TILE_STATUSES.FLAGGED).length;
        }, 0);
        minesLeftText.textContent = totalMines - flaggedTilesCount;
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
                return tile.status === TILE_STATUSES.REVEALED || (tile.hasMine && (tile.status === TILE_STATUSES.HIDDEN || tile.status === TILE_STATUSES.FLAGGED));
            });
        });
    }

    function checkLoss() { // Game lost if some tile with a mine is revealed (hidden -> mine)
        return board.some(row => {
            return row.some(tile => {
                return tile.status === TILE_STATUSES.MINE;
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
            board.forEach(row => {
                row.forEach(tile => {
                    if (tile.hasMine && tile.status !== TILE_STATUSES.FLAGGED) {
                        flagTile(tile);
                    }
                });
            });
            
            var bestTime = localStorage.getItem('liar-' + selectedDifficulty + '-time');
            if (bestTime === null || elapsedTime < bestTime) {
                saveBestTime();
            }
        }

        if (is_loss) {
            statusButton.textContent = '😵';

            board.forEach(row => {
                row.forEach(tile => {
                    if (tile.status !== TILE_STATUSES.FLAGGED && tile.hasMine) { // Reveal unflagged mines
                        tile.status = TILE_STATUSES.MINE;
                    } else if (tile.status === TILE_STATUSES.FLAGGED && !tile.hasMine) { // Mark incorrect flags
                        tile.element.innerHTML += '<span class="red-x">❌</span>';
                    }
                });
            });

            if (lastRevealedTile) { // Indicate the mine user clicked (or chorded) on, which caused them to lose
                if (lastRevealedTile.status === TILE_STATUSES.MINE) {
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
        const flaggedNeighbors = nearbyTiles(tile).filter(t => t.status === TILE_STATUSES.FLAGGED);
        const hiddenNeighbors = nearbyTiles(tile).filter(t => t.status === TILE_STATUSES.HIDDEN);
        const number = parseInt(tile.element.textContent);

        if (number < flaggedNeighbors.length || (hiddenNeighbors.length === 1 && number === flaggedNeighbors.length + 1)) {
            nearbyTiles(tile).forEach(neighbor => {
                if (neighbor.status === TILE_STATUSES.HIDDEN) {
                    revealTile(neighbor);
                    checkGameEnd();
                }
            });
        }
    }

    function saveBestTime() {
        localStorage.setItem('liar-' + selectedDifficulty + '-time', elapsedTime.toFixed(2));
        document.getElementById('liar-' + selectedDifficulty + '-time').textContent = elapsedTime.toFixed(2);
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
    const { height, width, totalMines } = getDifficultySettings(selectedDifficulty);

    board = createBoard(height, width, totalMines); // Create the game board

    boardElement.style.setProperty('--board-height', height);
    boardElement.style.setProperty('--board-width', width);
    infobarElement.style.setProperty('--board-width', width);

    minesLeftText.textContent = totalMines;

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

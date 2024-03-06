document.addEventListener('DOMContentLoaded', () => {
    const DIFFICULTIES = [
        { name: 'beginner', height: 8, width: 8, totalMines: 10 },
        { name: 'intermediate', height: 16, width: 16, totalMines: 40 },
        { name: 'expert', height: 16, width: 30, totalMines: 99 }
    ];

    const TILE_STATUSES = {
        HIDDEN: 'hidden',
        MINE: 'mine',
        REVEALED: 'revealed',
        FLAGGED: 'flagged'
    };

    let timerInterval;
    let elapsedTime = 0;
    const timerElement = document.getElementById('timer');

    function startTimer() {
        timerInterval = setInterval(() => {
            elapsedTime += 0.01;
            timerElement.textContent = elapsedTime.toFixed(2);
        }, 10);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    let isFirstClick = true;
    let lastRevealedTile = null;

    function getDifficultySettings(difficulty) {
        const settings = DIFFICULTIES.find(level => level.name === difficulty);
        return settings ? settings : null;
    }

    function randomNumber(size) {
        return Math.floor(Math.random() * size);
    }

    function createBoard(height, width, totalMines) {
        const board = [];
        const minePositions = getMinePositions(height, width, totalMines);

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
            board.push(row);
        }
        return board;
    }

    function positionMatch(a, b) {
        return a.i === b.i && a.j === b.j;
    }

    function getMinePositions(height, width, totalMines) {
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

    function revealTile(board, tile) {
        if (isFirstClick) {
            startTimer();

            if (tile.hasMine) {
                const newMinePosition = {
                    i: randomNumber(board.length),
                    j: randomNumber(board[0].length)
                };

                while (tile.i === newMinePosition.i && tile.j === newMinePosition.j) {
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
        const adjacentTiles = nearbyTiles(board, tile);
        const mines = adjacentTiles.filter(t => t.hasMine);

        if (mines.length === 0) {
            adjacentTiles.forEach(revealTile.bind(null, board));
        } else {
            const numberColors = ['#4600ff', '#008809', '#ff0000', '#1e007c', '#8e0000', '#008483', '#000000', '#808080'];
            const number = mines.length;
            tile.element.textContent = number;
            tile.element.style.color = numberColors[number - 1];
            tile.element.textContent = mines.length;
        }
    }

    function flagTile(tile) {
        if (tile.status !== TILE_STATUSES.HIDDEN && tile.status !== TILE_STATUSES.FLAGGED) return;

        if (tile.status === TILE_STATUSES.FLAGGED) tile.status = TILE_STATUSES.HIDDEN;
        else tile.status = TILE_STATUSES.FLAGGED;
    }

    function listMinesLeft(board, totalMines) {
        const flaggedTilesCount = board.reduce((count, row) => {
            return count + row.filter(tile => tile.status === TILE_STATUSES.FLAGGED).length;
        }, 0);
        minesLeftText.textContent = totalMines - flaggedTilesCount;
    }

    function nearbyTiles(board, { i, j }) {
        const tiles = [];

        for (let iOffset = -1; iOffset <= 1; iOffset++)
            for (let jOffset = -1; jOffset <= 1; jOffset++) {
                if (iOffset === 0 && jOffset === 0) continue;
                const tile = board[i + iOffset]?.[j + jOffset];
                if (tile) tiles.push(tile);
            }

        return tiles;
    }

    function checkWin() {
        return board.every(row => {
            return row.every(tile => {
                return tile.status === TILE_STATUSES.REVEALED || (tile.hasMine && (tile.status === TILE_STATUSES.HIDDEN || tile.status === TILE_STATUSES.FLAGGED));
            });
        });
    }

    function checkLoss() {
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
        }

        if (is_win) {
            statusButton.textContent = '😎';
            minesLeftText.textContent = '0';
            board.forEach(row => {
                row.forEach(tile => {
                    if (tile.hasMine && tile.status !== TILE_STATUSES.FLAGGED) {
                        flagTile(tile);
                    }
                });
            });
        }

        if (is_loss) {
            statusButton.textContent = '😵';

            board.forEach(row => {
                row.forEach(tile => {
                    if (tile.status !== TILE_STATUSES.FLAGGED && tile.hasMine) {
                        tile.status = TILE_STATUSES.MINE;
                    } else if (tile.status === TILE_STATUSES.FLAGGED && !tile.hasMine) {
                        tile.element.innerHTML += '<span class="red-x">❌</span>';
                    }
                });
            });

            if (lastRevealedTile) {
                if (lastRevealedTile.status === TILE_STATUSES.MINE)
                    lastRevealedTile.element.style.backgroundColor = 'red';
            }
                
        }
    }

    

    function stopProp(e) {
        e.stopImmediatePropagation();
    }

    function handleTileClick(board, tile) {
        if (tile.status === TILE_STATUSES.HIDDEN) {
            revealTile(board, tile);
            checkGameEnd();
        }
    }

    function handleTileRightClick(tile) {
        flagTile(tile);
        listMinesLeft(board, totalMines);
    }

    function handleTileChord(board, tile) {
        const flaggedNeighbors = nearbyTiles(board, tile).filter(t => t.status === TILE_STATUSES.FLAGGED);
        if (parseInt(tile.element.textContent) === flaggedNeighbors.length) {
            nearbyTiles(board, tile).forEach(neighbor => {
                if (neighbor.status === TILE_STATUSES.HIDDEN) {
                    revealTile(board, neighbor);
                    checkGameEnd();
                }
            });
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const selectedDifficulty = urlParams.get('difficulty') || 'beginner';
    const { height, width, totalMines } = getDifficultySettings(selectedDifficulty);

    const board = createBoard(height, width, totalMines);
    const infobarElement = document.querySelector('.board-info-bar');
    const boardElement = document.querySelector('.board');
    const minesLeftText = document.querySelector('[mines-left]');
    const statusButton = document.querySelector('#status-button');

    // Set board height and width
    boardElement.style.setProperty('--board-height', height);
    boardElement.style.setProperty('--board-width', width);
    infobarElement.style.setProperty('--board-width', width);

    // Display total mines left
    minesLeftText.textContent = totalMines;

    // Attach click event listeners to difficulty options
    const difficultyOptions = document.querySelectorAll('.difficulty-option');
    difficultyOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedDifficulty = option.id;
            const { height, width, totalMines } = getDifficultySettings(selectedDifficulty);
            // Reload the page with the new difficulty
            window.location.href = `${window.location.origin}${window.location.pathname}?difficulty=${selectedDifficulty}`;
        });
    });

    let isLeftButtonDown = false;
    let isRightButtonDown = false;

    board.forEach(row => {
        row.forEach(tile => {
            boardElement.append(tile.element);

            tile.element.addEventListener('mousedown', e => {
                e.preventDefault();
                if (e.button === 0) isLeftButtonDown = true; // Left button
                if (e.button === 2) isRightButtonDown = true; // Right button

                if (isLeftButtonDown && isRightButtonDown) {
                    handleTileChord(board, tile);
                } else if (isLeftButtonDown) {
                    handleTileClick(board, tile);
                } else if (isRightButtonDown) {
                    handleTileRightClick(tile);
                }
            });

            tile.element.addEventListener('mouseup', e => {
                e.preventDefault();
                if (e.button === 0) isLeftButtonDown = false; // Left button
                if (e.button === 2) isRightButtonDown = false; // Right button
            });

            tile.element.addEventListener('contextmenu', e => {
                e.preventDefault();
            });
        });
    });

    statusButton.addEventListener('click', () =>{
        location.reload();
    })

    document.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Spacebar'){
            e.preventDefault();
            location.reload();
        }
    })
});
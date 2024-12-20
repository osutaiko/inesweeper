document.addEventListener('DOMContentLoaded', () => {
    const socket = io('ws://localhost:3500');

    const TILE_STATUSES = {
        HIDDEN: 'hidden',
        MINE: 'mine',
        REVEALED_BLUE: 'revealed-blue',
        REVEALED_RED: 'revealed-red',
        FLAGGED: 'flagged'
    };

    const createRoomButton = document.querySelector('#createRoomButton');
    const joinRoomButton = document.querySelector('#joinRoomButton');
    const roomControls = document.querySelectorAll('.room-controls');
    const infobarElement = document.querySelector('.board-info-bar');
    const blueScoreElement = document.querySelector('#blue-score');
    const redScoreElement = document.querySelector('#red-score');
    const boardElement = document.querySelector('.board');
    let boardElements = [];

    let thisRoomId;
    let onSide;
    let width, height;
    let gameStarted = false;
    let board;

    let countdown = 10;

    let isLeftButtonDown = false;
    let isRightButtonDown = false;

    var isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    var isRightClickToggled = false;

    boardElement.style.setProperty('--board-height', 16);
    boardElement.style.setProperty('--board-width', 30);
    infobarElement.style.setProperty('--board-width', 30);

    //if (isTouchDevice)
    {
        var toggleClickButton = document.getElementById('toggle-button');
        toggleClickButton.addEventListener('click', () => {
            isRightClickToggled = !isRightClickToggled;
            toggleClickButton.textContent = isRightClickToggled ? '🚩' : '⛏️';
            toggleFlagOverlay();
        });
    }

    createRoomButton.addEventListener('click', () => {
        const passcode = document.querySelector('#passcodeInput').value.trim();
        if (passcode === '') {
            alert('Please enter a passcode to create a room.');
            return;
        }
        socket.emit('createRoom', passcode);
    });

    joinRoomButton.addEventListener('click', () => {
        const roomId = document.querySelector('#roomIdJoinInput').value;
        const passcode = document.querySelector('#passcodeJoinInput').value;
        socket.emit('joinRoom', { roomId, passcode });
    });

    socket.on('roomCreated', ({ roomId }) => {
        document.querySelector('#roomCreationMessage').textContent = `Room created with ID: ${roomId}`;
        thisRoomId = roomId;
        onSide = 'blue';
    });

    socket.on('roomJoined', ({ roomId }) => {
        thisRoomId = roomId;
        onSide = 'red';
    });

    socket.on('joinError', ({ message }) => {
        alert(message);
    });

    const timerElement = document.querySelector('#timer');

    function updateCountdown() {
        timerElement.textContent = `Starting in: ${countdown}`;
    }

    function startCountdown() {
        updateCountdown();
        const countdownInterval = setInterval(() => {
            countdown--;
            updateCountdown();
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                socket.emit('startGame');
                startTimer();
                addTileEventListeners();
            }
        }, 1000);
    }

    let timer = 0;

    function updateTimer() {
        timerElement.textContent = timer.toFixed(2); // Display timer with two decimal places
    }

    let timerInterval;

    function startTimer() {
        const startTime = Date.now(); // Get current time in milliseconds
        timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime; // Calculate elapsed time
            timer = elapsedTime / 1000; // Convert elapsed time to seconds
            updateTimer(); // Update timer display
        }, 10); // Update timer every 0.01 seconds
    }

    function drawInitialBoard() {
        board.forEach((row, i) => {
            boardElements[i] = [];
            row.forEach((tile, j) => {
                const element = document.createElement('div');
                element.dataset.status = tile.status;
            
                Object.defineProperty(tile, 'status', {
                    get: function () {
                        return this.element.dataset.status;
                    },
                    set: function (value) {
                        this.element.dataset.status = value;
                    }
                });
    
                tile.element = element;
                boardElements[i][j] = element;
                boardElement.appendChild(element);
    
                // Add click event listeners for home tiles
                if (onSide === 'blue' && j === 0 && i === width - 1) {
                    element.style.backgroundColor = '#00f';
                    element.textContent = '🏠';
                } else if (onSide === 'red' && j === height - 1 && i === 0) {
                    element.style.backgroundColor = '#f00';
                    element.textContent = '🏠';
                }
            })
        });
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

    function drawBoard() {
        let blueScore = 0;
        let redScore = 0;

        board.forEach((row, i) => {
            row.forEach((tile, j) => {
                const element = boardElements[i][j];
                if (element.dataset.status !== TILE_STATUSES.FLAGGED || tile.status === TILE_STATUSES.REVEALED_BLUE || tile.status === TILE_STATUSES.REVEALED_RED)
                    element.dataset.status = tile.status;

                const adjacentTiles = nearbyTiles(tile);
                const mines = adjacentTiles.filter(t => t.hasMine);

                if ((tile.status === TILE_STATUSES.REVEALED_BLUE || tile.status === TILE_STATUSES.REVEALED_RED) && adjacentTiles.filter(t => t.hasMine).length > 0) {
                    const numberColors = ['#4600ff', '#008809', '#ff0000', '#1e007c', '#8e0000', '#008483', '#000000', '#808080'];
                    const number = mines.length;
                    element.textContent = number;
                    element.style.color = numberColors[number - 1];
                }

                if (onSide === 'blue' && j === 0 && i === width - 1) {
                    element.style.backgroundColor = '#00f';
                    element.textContent = '🏠';
                } else if (onSide === 'red' && j === height - 1 && i === 0) {
                    element.style.backgroundColor = '#f00';
                    element.textContent = '🏠';
                }

                if (tile.status === TILE_STATUSES.REVEALED_BLUE) {
                    blueScore++;
                } else if (tile.status === TILE_STATUSES.REVEALED_RED) {
                    redScore++;
                }
            });
        });

        blueScoreElement.textContent = `${blueScore}`;
        redScoreElement.textContent = `${redScore}`;
    }
    
    function toggleFlagOverlay() {
        boardElements.forEach(row => {
            row.forEach(element => {
                if (isRightClickToggled && element.dataset.status === TILE_STATUSES.HIDDEN) {
                    element.classList.add('overlay-flag');
                } else {
                    element.classList.remove('overlay-flag');
                }
            });
        });
    }

    function flagTile(tile) {
        if (tile.status !== TILE_STATUSES.HIDDEN && tile.status !== TILE_STATUSES.FLAGGED) return;
    
        if (tile.status === TILE_STATUSES.FLAGGED) {
            tile.status = TILE_STATUSES.HIDDEN;
        } else {
            tile.status = TILE_STATUSES.FLAGGED;
        }
    }
    

    socket.on('initialBoard', ({ initialBoard }) => {
        board = initialBoard;
        width = board.length;
        height = board[0].length;

        drawInitialBoard();
        roomControls.forEach(control => control.remove());
        console.log(`Playing on side ${onSide}`);
    });

    socket.on('gameStart', () => {
        console.log('Game starting in 10 seconds!');
        startCountdown();
        gameStarted = true;
    });

    function addTileEventListeners() {
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
                        flagTile(tile);
                        toggleFlagOverlay();
                    }
                });

                tile.element.addEventListener('mouseup', e => {
                    e.preventDefault();
                    const thisButton = isRightClickToggled ? (2 - e.button) : e.button;
                    if (thisButton === 0) {
                        isLeftButtonDown = false;
                        if (isRightButtonDown) {
                            emitChordRequest(tile);
                        } else {
                            emitClickRequest(tile);
                        }
                    } else if (thisButton === 1) {
                        emitChordRequest(tile);
                    } else if (thisButton === 2) {
                        isRightButtonDown = false;
                        if (isLeftButtonDown) {
                            emitChordRequest(tile);
                        }
                    }

                    if (isTouchDevice) {
                        emitChordRequest(tile);
                    }
                });

                tile.element.addEventListener('contextmenu', e => {
                    e.preventDefault();
                });
            });
        });
    }

    function stopTileEventListeners() {
        boardElement.addEventListener('mousedown', stopProp, { capture: true });
        boardElement.addEventListener('mouseup', stopProp, { capture: true });
        boardElement.addEventListener('contextmenu', stopProp, { capture: true });
    }

    function emitClickRequest(tile) {
        if (gameStarted && tile.status == TILE_STATUSES.HIDDEN)
            socket.emit('clickRequest', { roomId: thisRoomId, side: onSide, reqTile: tile });
    }

    function emitChordRequest(tile) {
        const neighbors = nearbyTiles(tile);
        const flaggedNeighbors = neighbors.filter(neighbor => {
            const neighborElement = boardElements[neighbor.i][neighbor.j];
            return neighborElement.dataset.status === TILE_STATUSES.FLAGGED;
        });
        if (parseInt(tile.element.textContent) === flaggedNeighbors.length) {
            neighbors.forEach(neighbor => {
                const neighborElement = boardElements[neighbor.i][neighbor.j];
                if (neighborElement.dataset.status === TILE_STATUSES.HIDDEN) {
                    emitClickRequest(neighbor);
                }
            });
        }
    }

    function stopProp(e) {
        e.stopImmediatePropagation();
    }

    socket.on('updateBoard', ({ updatedBoard }) => {
        board = updatedBoard;
        drawBoard();
    });

    socket.on('gameEnd', ({ winner }) => {
        gameStarted = false;
        stopTileEventListeners();
        clearInterval(timerInterval);
        timerElement.innerHTML = `Winner: <span style="color: ${winner === 'blue' ? '#00f' : '#f00'}">${winner.toUpperCase()}</span>!`;
        if (winner === onSide) {
            alert('You Won!');
        } else {
            alert ('You Lost!');
        }
    });
});
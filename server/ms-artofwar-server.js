import express from 'express';
import { Server } from "socket.io";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
});

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
});

const rooms = {};

function generateRoomId() {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const { height, width, totalMines } = { height: 16, width: 30, totalMines: 90 };
const TILE_STATUSES = {
    HIDDEN: 'hidden',
    MINE: 'mine',
    REVEALED_BLUE: 'revealed-blue',
    REVEALED_RED: 'revealed-red'
};

function randomNumber(size) { // Returns integer in [0, size)
    return Math.floor(Math.random() * size);
}

function positionMatch(a, b) {
    return a.i === b.i && a.j === b.j;
}

function isInBaseArea(a, side) {
    if (side === 'blue') {
        return a.i >= height - 4 && a.j <= 3;
    } else if (side === 'red') {
        return a.i <= 3 && a.j >= width - 4;
    }
}

function getMinePositions(height, width, totalMines) { // Randomly generates mine locations (retries when mine already exists in list) and returns the list
    const positions = [];

    while (positions.length < totalMines) {
        const position = {
            i: randomNumber(height),
            j: randomNumber(width)
        };

        if (!positions.some(positionMatch.bind(null, position)) && !isInBaseArea(position, 'blue') && !isInBaseArea(position, 'red')) {
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
            const tile = {
                i,
                j,
                hasMine: minePositions.some(positionMatch.bind(null, { i, j })),
                status: TILE_STATUSES.HIDDEN
            };
            row.push(tile);
        }
        newBoard.push(row);
    }
    return newBoard;
}

let boards = {};

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    socket.on('createRoom', passcode => {
        const roomId = generateRoomId();
        rooms[roomId] = { passcode, users: [socket.id] };
        socket.emit('roomCreated', { roomId });
        socket.join(roomId);
        console.log(`User ${socket.id} created room ${roomId} (passcode: ${passcode})`);
    });

    socket.on('joinRoom', ({ roomId, passcode }) => {
        const room = rooms[roomId];
        if (room && room.passcode === passcode && room.users.length < 2) {
            room.users.push(socket.id);
            socket.join(roomId);
            socket.emit('roomJoined', { roomId });
            console.log(`Room ${roomId}: ${socket.id} joined`);
            const board = createBoard(height, width, totalMines);
            boards[roomId] = board;
            io.to(roomId).emit('initialBoard', { initialBoard: board });
        } else {
            if (!roomId) {
                socket.emit('joinError', { message: 'Enter a room ID to join an existing room!' })
            } else if (!room) {
                socket.emit('joinError', { message: 'Room doesn\'t exist!' })
            } else if (!passcode) {
                socket.emit('joinError', { message: 'Enter the passcode!' })
            } else if (room.passcode !== passcode) {
                socket.emit('joinError', { message: 'Incorrect passcode!' })
            } else if (room.users.length >= 2) {
                socket.emit('joinError', { message: 'Room is full! Please try another room.' })
            }
            console.log(`Room ${roomId}: ${socket.id} failed to join`);
        }

        io.to(roomId).emit('gameStart');
        console.log(`Room ${roomId}: game started`);
    });

    function nearbyTiles(board, { i, j }) { // Returns list of adjacent tiles
        const tiles = [];

        for (let iOffset = -1; iOffset <= 1; iOffset++)
            for (let jOffset = -1; jOffset <= 1; jOffset++) {
                if (iOffset === 0 && jOffset === 0) continue;
                const tile = board[i + iOffset]?.[j + jOffset];
                if (tile) tiles.push(tile);
            }

        return tiles;
    }

    function revealTile(board, side, tile) {
        if (tile.status === TILE_STATUSES.HIDDEN) {
            if (tile.hasMine) {
                tile.status = TILE_STATUSES.MINE;
            } else {
                tile.status = side === 'blue' ? TILE_STATUSES.REVEALED_BLUE : TILE_STATUSES.REVEALED_RED;
                const adjacentTiles = nearbyTiles(board, tile);
                if (adjacentTiles.filter(t => t.hasMine).length === 0) {
                    adjacentTiles.forEach(adjTile => {
                        revealTile(board, side, adjTile);
                    });
                }
            }
        }
    }

    function checkGameEnd(board, side) { // returns winner and reason
        const tilesForWin = Math.ceil((height * width - totalMines) / 2);
        let blueScore = 0;
        let redScore = 0;

        const gameOver = board.some(row => {
            return row.some(tile => {
                if (tile.status === TILE_STATUSES.MINE) {
                    console.log(`${side} lost by stepping on a mine`);
                    return true;
                } else if (tile.status === TILE_STATUSES.REVEALED_BLUE) {
                    blueScore++;
                } else if (tile.status === TILE_STATUSES.REVEALED_RED) {
                    redScore++;
                }
                return false;
            });
        });

        if (gameOver) {
            if (side === 'blue') {
                return 'red';
            } else {
                return 'blue';
            }
        }

        if (blueScore >= tilesForWin) {
            console.log(`Blue won ${blueScore}:${redScore}`);
            return 'blue';
        } else if (redScore >= tilesForWin) {
            console.log(`Red won ${redScore}:${blueScore}`);
            return 'red';
        }

        return null;
    }

    socket.on('clickRequest', ({ roomId, side, reqTile }) => {
        let board = boards[roomId];
        let tile = board[reqTile.i][reqTile.j];

        const adjacentRevealedTiles = nearbyTiles(board, tile).filter(neighbor => {
            const neighborTile = board[neighbor.i][neighbor.j];
            return neighborTile.status === `revealed-${side}`;
        });

        if (adjacentRevealedTiles.length > 0 || (side === 'blue' && reqTile.i === height - 1 && reqTile.j === 0) || (side === 'red' && reqTile.i === 0 && reqTile.j === width - 1)) {
            revealTile(board, side, tile);

            io.to(roomId).emit('updateBoard', { updatedBoard: board });
            const gameStatus = checkGameEnd(board, side);
            if (gameStatus) {
                io.to(roomId).emit('gameEnd', { winner: gameStatus });
            }
        }
    });
});
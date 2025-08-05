const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Statische Dateien aus dem 'public'-Ordner bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Server-Logik für das Memory-Spiel
let rooms = {}; // Ein Objekt, um Spielräume zu speichern
const allImagePaths = [];
for (let i = 1; i <= 45; i++) {
    allImagePaths.push(`images/bild${i}.jpg`);
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function createNewGame(totalPairs) {
    const shuffledAllImages = shuffle(allImagePaths);
    const selectedImages = shuffledAllImages.slice(0, totalPairs);
    const cardImages = [...selectedImages, ...selectedImages];
    const shuffledCards = shuffle(cardImages);

    return shuffledCards.map(imagePath => ({
        image: imagePath,
        isFlipped: false,
        isMatched: false
    }));
}

io.on('connection', (socket) => {
    console.log('Ein neuer Spieler hat sich verbunden:', socket.id);

    socket.on('joinGame', ({ playerName, roomCode }) => {
        let room;
        if (roomCode && rooms[roomCode] && rooms[roomCode].players.length < 2) {
            // Raum existiert, Spieler tritt bei
            room = rooms[roomCode];
            socket.join(roomCode);
            room.players.push({ id: socket.id, name: playerName, score: 0 });
            console.log(`${playerName} ist dem Spiel in Raum ${roomCode} beigetreten.`);
            io.to(roomCode).emit('gameStarted', room);
        } else if (!roomCode) {
            // Neuen Raum erstellen
            roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const totalPairs = 12; // Standardwert für das neue Spiel
            room = {
                roomCode: roomCode,
                players: [{ id: socket.id, name: playerName, score: 0 }],
                cards: createNewGame(totalPairs),
                totalPairs: totalPairs,
                currentPlayerIndex: 0,
                flippedCards: [],
                lockBoard: false,
                matchesFound: 0
            };
            rooms[roomCode] = room;
            socket.join(roomCode);
            socket.emit('roomCreated', roomCode);
            console.log(`${playerName} hat einen neuen Raum ${roomCode} erstellt.`);
        } else {
            // Raum ist voll oder existiert nicht
            socket.emit('error', 'Der Raum ist voll oder existiert nicht.');
        }
    });

    socket.on('flipCard', ({ cardIndex, roomCode }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const currentPlayer = room.players[room.currentPlayerIndex];
        if (currentPlayer.id !== socket.id || room.lockBoard) {
            // Es ist nicht der Zug dieses Spielers oder das Brett ist gesperrt
            return;
        }

        const card = room.cards[cardIndex];
        if (card.isFlipped || card.isMatched) {
            return; // Karte ist bereits umgedreht oder gefunden
        }

        card.isFlipped = true;
        room.flippedCards.push(cardIndex);

        // Den aktuellen Zustand an alle senden
        io.to(roomCode).emit('updateGameState', room);

        if (room.flippedCards.length === 2) {
            room.lockBoard = true;
            io.to(roomCode).emit('lockBoard', true); // Clients darüber informieren, dass das Brett gesperrt ist

            const [firstCardIndex, secondCardIndex] = room.flippedCards;
            const firstCard = room.cards[firstCardIndex];
            const secondCard = room.cards[secondCardIndex];

            if (firstCard.image === secondCard.image) {
                // Übereinstimmung gefunden
                firstCard.isMatched = true;
                secondCard.isMatched = true;
                currentPlayer.score++;
                room.matchesFound++;

                // Nachricht an den Client senden
                io.to(socket.id).emit('effectMessage', { text: 'Paar gefunden!', style: '' });

                if (room.matchesFound === room.totalPairs) {
                    io.to(roomCode).emit('gameEnded', room);
                    // Den Raum nach Spielende löschen
                    delete rooms[roomCode];
                } else {
                    room.flippedCards = [];
                    room.lockBoard = false;
                    io.to(roomCode).emit('updateGameState', room);
                    io.to(roomCode).emit('lockBoard', false);
                }
            } else {
                // Keine Übereinstimmung
                setTimeout(() => {
                    firstCard.isFlipped = false;
                    secondCard.isFlipped = false;
                    room.flippedCards = [];
                    room.lockBoard = false;
                    
                    // Spieler wechseln
                    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
                    
                    io.to(roomCode).emit('updateGameState', room);
                    io.to(roomCode).emit('lockBoard', false);
                }, 1500);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Spieler getrennt:', socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('playerLeft', room);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
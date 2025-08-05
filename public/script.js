// Neue script.js für den Multiplayer-Client

document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Verbinde mit dem Socket.io-Server

    const setupContainer = document.getElementById('setup-container');
    const gameContainer = document.getElementById('game-container');
    const setupForm = document.getElementById('setup-form');

    const playerNameInput = document.getElementById('player-name');
    const roomCodeInput = document.getElementById('room-code');

    const name1Display = document.getElementById('name1');
    const name2Display = document.getElementById('name2');
    const playerTurnDisplay = document.getElementById('player-turn');
    const score1Display = document.getElementById('score1');
    const score2Display = document.getElementById('score2');
    const gameBoard = document.getElementById('game-board');

    const endGameModal = document.getElementById('end-game-modal');
    const endGameTitle = document.getElementById('end-game-title');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    let currentRoomCode = null;
    let currentPlayerId = null;
    let lockBoard = false;

    // --- Events vom Server ---
    socket.on('connect', () => {
        console.log('Mit Server verbunden:', socket.id);
        currentPlayerId = socket.id;
    });

    socket.on('roomCreated', (roomCode) => {
        currentRoomCode = roomCode;
        alert(`Spielraum erstellt! Teile diesen Code mit einem Freund: ${roomCode}`);
        // Warten auf den zweiten Spieler
    });

    socket.on('gameStarted', (room) => {
        setupContainer.style.display = 'none';
        gameContainer.style.display = 'flex';
        currentRoomCode = room.roomCode;
        renderGame(room);
    });

    socket.on('updateGameState', (room) => {
        renderGame(room);
    });

    socket.on('lockBoard', (state) => {
        lockBoard = state;
    });

    socket.on('gameEnded', (finalRoomState) => {
        renderGame(finalRoomState);
        showEndGameModal(finalRoomState);
    });
    
    socket.on('effectMessage', ({ text, style }) => {
        showEffectMessage(text, style);
    });
    
    socket.on('playerLeft', (room) => {
        alert('Der andere Spieler hat das Spiel verlassen.');
        resetGame();
    });

    // --- UI-Interaktionen ---
    setupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const playerName = playerNameInput.value || `Spieler ${Math.floor(Math.random() * 100)}`;
        const roomCode = roomCodeInput.value.toUpperCase();
        
        socket.emit('joinGame', { playerName, roomCode });
    });

    restartButton.addEventListener('click', () => {
        endGameModal.classList.remove('show-modal');
        setupContainer.style.display = 'block';
        gameContainer.style.display = 'none';
        resetGame();
    });

    function flipCard() {
        if (lockBoard) return;
        if (this.classList.contains('flipped')) return;
        
        const cardIndex = this.dataset.index;
        socket.emit('flipCard', { cardIndex: parseInt(cardIndex), roomCode: currentRoomCode });
    }

    // --- Rendering-Funktionen (wie im Original-Code) ---
    function renderGame(room) {
        // Spielerinformationen aktualisieren
        const p1 = room.players[0];
        const p2 = room.players[1];
        
        name1Display.textContent = p1.name;
        name2Display.textContent = p2.name;
        score1Display.textContent = p1.score;
        score2Display.textContent = p2.score;

        const currentTurnName = room.players[room.currentPlayerIndex].name;
        playerTurnDisplay.textContent = `${currentTurnName} ist an der Reihe.`;
        
        // Spieler am Zug hervorheben
        name1Display.style.fontWeight = room.currentPlayerIndex === 0 ? 'bold' : 'normal';
        name2Display.style.fontWeight = room.currentPlayerIndex === 1 ? 'bold' : 'normal';

        // Spielfeld rendern oder aktualisieren
        if (gameBoard.innerHTML === '') {
            createBoard(room.cards, room.totalPairs);
        } else {
            updateBoard(room.cards);
        }
        
        lockBoard = room.players[room.currentPlayerIndex].id !== currentPlayerId;
    }

    function createBoard(cards, totalPairs) {
        let columns;
        if (totalPairs <= 8) columns = 4;
        else if (totalPairs <= 16) columns = 6;
        else columns = 8;
        
        gameBoard.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        gameBoard.innerHTML = '';
        
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('memory-card');
            cardElement.dataset.image = card.image;
            cardElement.dataset.index = index;
            cardElement.addEventListener('click', flipCard);

            const cardBack = document.createElement('div');
            cardBack.classList.add('card-face', 'card-back');

            const cardFront = document.createElement('div');
            cardFront.classList.add('card-face', 'card-front');
            cardFront.style.backgroundImage = `url(${card.image})`;

            if (card.isFlipped || card.isMatched) {
                cardElement.classList.add('flipped');
            }

            cardElement.appendChild(cardBack);
            cardElement.appendChild(cardFront);
            gameBoard.appendChild(cardElement);
        });
    }

    function updateBoard(cards) {
        const cardElements = document.querySelectorAll('.memory-card');
        cards.forEach((card, index) => {
            if (card.isFlipped || card.isMatched) {
                cardElements[index].classList.add('flipped');
            } else {
                cardElements[index].classList.remove('flipped');
            }
        });
    }

    function showEndGameModal(room) {
        let winner;
        if (room.players[0].score > room.players[1].score) {
            winner = room.players[0].name;
        } else if (room.players[1].score > room.players[0].score) {
            winner = room.players[1].name;
        } else {
            winner = 'Unentschieden';
        }

        const winnerText = (winner === 'Unentschieden') ? 'Unentschieden!' : `${winner} hat gewonnen!`;
        endGameTitle.textContent = winnerText;
        finalScoreDisplay.innerHTML = `${room.players[0].name}: ${room.players[0].score} Punkte<br>${room.players[1].name}: ${room.players[1].score} Punkte`;
        
        endGameModal.classList.add('show-modal');
    }

    function resetGame() {
        gameBoard.innerHTML = '';
        currentRoomCode = null;
        // ... (weitere Reset-Logik)
    }
    
    // Die Show-Effect-Message-Funktion kann beibehalten werden, da sie nur für die Darstellung zuständig ist.
    function showEffectMessage(messageText, styleClass) {
        const effectMessage = document.getElementById('effect-message');
        
        effectMessage.textContent = messageText;
        effectMessage.className = '';
        effectMessage.classList.add('show');
        if (styleClass) {
            effectMessage.classList.add(styleClass);
        }

        setTimeout(() => {
            effectMessage.classList.remove('show');
            if (styleClass) {
                effectMessage.classList.remove(styleClass);
            }
        }, 1500);
    }
});
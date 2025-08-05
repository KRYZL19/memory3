document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const setupContainer = document.getElementById('setup-container');
    const gameContainer = document.getElementById('game-container');
    const setupForm = document.getElementById('setup-form');

    const player1NameInput = document.getElementById('player1-name');
    const player2NameInput = document.getElementById('player2-name'); // wird für Anzeige genutzt
    const pairCountSelect = document.getElementById('pair-count');

    const name1Display = document.getElementById('name1');
    const name2Display = document.getElementById('name2');
    const playerTurnDisplay = document.getElementById('player-turn');
    const score1Display = document.getElementById('score1');
    const score2Display = document.getElementById('score2');
    const gameBoard = document.getElementById('game-board');

    const effectMessage = document.getElementById('effect-message');
    const endGameModal = document.getElementById('end-game-modal');
    const endGameTitle = document.getElementById('end-game-title');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    let playerName;
    let roomCode;
    let currentRoomState = null;

    setupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        playerName = player1NameInput.value || 'Spieler 1';

        // Emit Event zum Erstellen eines Raumes
        socket.emit('joinGame', { playerName: playerName, roomCode: '' });
    });

    // Raum wurde erstellt -> Code anzeigen
    socket.on('roomCreated', (code) => {
        roomCode = code;
        alert(`Raum erstellt! Raumcode: ${roomCode}\nWarte auf zweiten Spieler...`);
    });

    // Spiel startet, sobald 2 Spieler im Raum sind
    socket.on('gameStarted', (room) => {
        currentRoomState = room;
        setupContainer.style.display = 'none';
        gameContainer.style.display = 'flex';

        updateGameState(room);
    });

    // Game-State aktualisieren
    socket.on('updateGameState', (room) => {
        currentRoomState = room;
        updateGameState(room);
    });

    // Effekt-Nachrichten (Treffer)
    socket.on('effectMessage', (msg) => {
        showEffectMessage(msg.text, msg.style);
    });

    // Sperre des Spielfelds
    socket.on('lockBoard', (isLocked) => {
        // Optional: UI-Indikator, dass gewartet wird
        console.log('Brett gesperrt:', isLocked);
    });

    // Spielende
    socket.on('gameEnded', (room) => {
        let winner;
        if (room.players[0].score > room.players[1].score) {
            winner = room.players[0].name;
        } else if (room.players[1].score > room.players[0].score) {
            winner = room.players[1].name;
        } else {
            winner = 'Unentschieden';
        }

        const winnerText = winner === 'Unentschieden' ? 'Unentschieden!' : `${winner} hat gewonnen!`;
        endGameTitle.textContent = winnerText;
        finalScoreDisplay.innerHTML = `${room.players[0].name}: ${room.players[0].score} Punkte<br>${room.players[1].name}: ${room.players[1].score} Punkte`;
        endGameModal.classList.add('show-modal');
    });

    // Karte klicken
    gameBoard.addEventListener('click', (event) => {
        if (!currentRoomState) return;
        if (!event.target.closest('.memory-card')) return;
        const card = event.target.closest('.memory-card');
        const index = card.dataset.index;

        socket.emit('flipCard', { cardIndex: parseInt(index), roomCode });
    });

    // Restart Button
    restartButton.addEventListener('click', () => {
        window.location.reload();
    });

    // UI: Update der Oberfläche mit Room-State
    function updateGameState(room) {
        // Spieleranzeigen
        name1Display.textContent = room.players[0]?.name || 'Spieler 1';
        name2Display.textContent = room.players[1]?.name || 'Warten...';
        score1Display.textContent = room.players[0]?.score || 0;
        score2Display.textContent = room.players[1]?.score || 0;

        const currentPlayer = room.players[room.currentPlayerIndex];
        playerTurnDisplay.textContent = `${currentPlayer.name} ist an der Reihe.`;

        // Spielfeld aktualisieren
        gameBoard.innerHTML = '';
        room.cards.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('memory-card');
            cardDiv.dataset.index = index;
            if (card.isFlipped || card.isMatched) {
                cardDiv.classList.add('flipped');
            }

            const cardBack = document.createElement('div');
            cardBack.classList.add('card-face', 'card-back');

            const cardFront = document.createElement('div');
            cardFront.classList.add('card-face', 'card-front');
            cardFront.style.backgroundImage = `url(${card.image})`;

            cardDiv.appendChild(cardBack);
            cardDiv.appendChild(cardFront);
            gameBoard.appendChild(cardDiv);
        });
    }

    // Effekt-Nachricht anzeigen
    function showEffectMessage(text, styleClass) {
        effectMessage.textContent = text;
        effectMessage.className = '';
        effectMessage.classList.add('show');
        if (styleClass) {
            effectMessage.classList.add(styleClass);
        }

        setTimeout(() => {
            effectMessage.classList.remove('show');
            if (styleClass) effectMessage.classList.remove(styleClass);
        }, 1500);
    }
});

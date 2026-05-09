// Chess Game Logic with AI Bot Integration

class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.boardHistory = [];
        this.isBotThinking = false;
        this.render();
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Black pieces (top)
        board[0][0] = { type: 'rook', color: 'black' };
        board[0][1] = { type: 'knight', color: 'black' };
        board[0][2] = { type: 'bishop', color: 'black' };
        board[0][3] = { type: 'queen', color: 'black' };
        board[0][4] = { type: 'king', color: 'black' };
        board[0][5] = { type: 'bishop', color: 'black' };
        board[0][6] = { type: 'knight', color: 'black' };
        board[0][7] = { type: 'rook', color: 'black' };

        for (let col = 0; col < 8; col++) {
            board[1][col] = { type: 'pawn', color: 'black' };
        }

        // White pieces (bottom)
        for (let col = 0; col < 8; col++) {
            board[6][col] = { type: 'pawn', color: 'white' };
        }

        board[7][0] = { type: 'rook', color: 'white' };
        board[7][1] = { type: 'knight', color: 'white' };
        board[7][2] = { type: 'bishop', color: 'white' };
        board[7][3] = { type: 'queen', color: 'white' };
        board[7][4] = { type: 'king', color: 'white' };
        board[7][5] = { type: 'bishop', color: 'white' };
        board[7][6] = { type: 'knight', color: 'white' };
        board[7][7] = { type: 'rook', color: 'white' };

        return board;
    }

    getPieceSymbol(piece) {
        if (!piece) return '';
        const symbols = {
            'white': { 'pawn': '♙', 'rook': '♖', 'knight': '♘', 'bishop': '♗', 'queen': '♕', 'king': '♔' },
            'black': { 'pawn': '♟', 'rook': '♜', 'knight': '♞', 'bishop': '♝', 'queen': '♛', 'king': '♚' }
        };
        return symbols[piece.color][piece.type];
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowDir = Math.sign(toRow - fromRow);
        const colDir = Math.sign(toCol - fromCol);
        let currentRow = fromRow + rowDir;
        let currentCol = fromCol + colDir;

        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) {
                return false;
            }
            currentRow += rowDir;
            currentCol += colDir;
        }
        return true;
    }

    getKingPosition(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, byColor) {
        // Check if a square is attacked by pieces of a given color
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (!piece || piece.color !== byColor) continue;

                const moves = this.getLegalMovesForPiece(r, c, true);
                if (moves.some(move => move.row === row && move.col === col)) {
                    return true;
                }
            }
        }
        return false;
    }

    wouldBeInCheck(color, fromRow, fromCol, toRow, toCol) {
        // Make temporary move
        const originalPiece = this.board[toRow][toCol];
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;

        const kingPos = this.getKingPosition(color);
        const isInCheck = this.isSquareAttacked(kingPos.row, kingPos.col, color === 'white' ? 'black' : 'white');

        // Undo temporary move
        this.board[fromRow][fromCol] = this.board[toRow][toCol];
        this.board[toRow][toCol] = originalPiece;

        return isInCheck;
    }

    getLegalMovesForPiece(row, col, ignoreCheckValidation = false) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];

        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col, piece);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, piece);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col, piece);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col, piece);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col, piece);
                break;
            case 'king':
                moves = this.getKingMoves(row, col, piece);
                break;
        }

        // Filter out moves that would put/leave king in check
        if (!ignoreCheckValidation) {
            moves = moves.filter(move =>
                !this.wouldBeInCheck(piece.color, row, col, move.row, move.col)
            );
        }

        return moves;
    }

    getPawnMoves(row, col, piece) {
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Forward move
        const forwardRow = row + direction;
        if (this.isValidPosition(forwardRow, col) && this.board[forwardRow][col] === null) {
            moves.push({ row: forwardRow, col });

            // Double move from start
            if (row === startRow) {
                const doubleRow = row + 2 * direction;
                if (this.board[doubleRow][col] === null) {
                    moves.push({ row: doubleRow, col });
                }
            }
        }

        // Diagonal captures
        for (let dc of [-1, 1]) {
            const captureRow = row + direction;
            const captureCol = col + dc;
            if (this.isValidPosition(captureRow, captureCol)) {
                const targetPiece = this.board[captureRow][captureCol];
                if (targetPiece && targetPiece.color !== piece.color) {
                    moves.push({ row: captureRow, col: captureCol });
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col, piece) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece) {
                    moves.push({ row: r, col: c });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    getKnightMoves(row, col, piece) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dr, dc] of knightMoves) {
            const r = row + dr, c = col + dc;
            if (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece || targetPiece.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
            }
        }

        return moves;
    }

    getBishopMoves(row, col, piece) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece) {
                    moves.push({ row: r, col: c });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    getQueenMoves(row, col, piece) {
        const moves = [];
        // Combine rook and bishop moves
        const directions = [
            [0, 1], [0, -1], [1, 0], [-1, 0], // rook
            [1, 1], [1, -1], [-1, 1], [-1, -1] // bishop
        ];

        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece) {
                    moves.push({ row: r, col: c });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    getKingMoves(row, col, piece) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const r = row + dr, c = col + dc;
            if (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece || targetPiece.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
            }
        }

        return moves;
    }

    selectSquare(row, col) {
        // Don't allow moves when bot is thinking or when it's black's turn
        if (this.isBotThinking || this.currentPlayer === 'black') {
            return;
        }

        const piece = this.board[row][col];

        if (this.selectedSquare && this.legalMoves.some(m => m.row === row && m.col === col)) {
            // Make the move
            this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
            this.selectedSquare = null;
            this.legalMoves = [];
        } else if (piece && piece.color === this.currentPlayer) {
            // Select a new piece
            this.selectedSquare = { row, col };
            this.legalMoves = this.getLegalMovesForPiece(row, col);
        } else {
            // Deselect
            this.selectedSquare = null;
            this.legalMoves = [];
        }

        this.render();
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];

        // Save board state for undo
        this.boardHistory.push(JSON.parse(JSON.stringify(this.board)));

        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Record move
        const moveNotation = this.getMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece);
        this.moveHistory.push(moveNotation);

        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        this.updateStatus();
        this.render();

        // If it's black's turn and we have a bot, make bot move
        if (this.currentPlayer === 'black') {
            setTimeout(() => this.makeBotMove(), 500); // Small delay for better UX
        }
    }

    async makeBotMove() {
        if (this.currentPlayer !== 'black' || this.isBotThinking) return;

        this.isBotThinking = true;
        this.updateStatus();

        try {
            // Use local JavaScript bot instead of fetch
            const bestMove = this.getBestBotMove();
            if (bestMove) {
                this.makeMove(bestMove.from_row, bestMove.from_col, bestMove.to_row, bestMove.to_col);
            } else {
                console.error('Bot could not find a move');
                // Fallback: make a random legal move
                this.makeRandomMove();
            }
        } catch (error) {
            console.error('Error in bot move:', error);
            // Fallback: make a random legal move
            this.makeRandomMove();
        }

        this.isBotThinking = false;
        this.updateStatus();
    }

    // Chess Bot Logic (converted from Python)
    getBestBotMove(depth = 3) {
        const bot = new ChessBot(this.board, this.currentPlayer);
        return bot.getBestMove(depth);
    }

    makeRandomMove() {
        const moves = this.getAllLegalMoves(this.currentPlayer);
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            this.makeMove(randomMove.from_row, randomMove.from_col, randomMove.to_row, randomMove.to_col);
        }
    }

    getAllLegalMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.getLegalMovesForPiece(row, col);
                    for (const move of pieceMoves) {
                        moves.push({
                            from_row: row,
                            from_col: col,
                            to_row: move.row,
                            to_col: move.col,
                            piece: piece
                        });
                    }
                }
            }
        }
        return moves;
    }

    getMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece) {
        const fromSquare = String.fromCharCode(97 + fromCol) + (8 - fromRow);
        const toSquare = String.fromCharCode(97 + toCol) + (8 - toRow);
        const capture = targetPiece ? 'x' : '';
        const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();

        return `${pieceSymbol}${fromSquare}${capture}${toSquare}`;
    }

    updateStatus() {
        const status = document.getElementById('status');
        const currentColor = this.currentPlayer === 'white' ? 'White' : 'Black';

        if (this.isBotThinking) {
            status.textContent = 'Bot is thinking...';
            status.className = 'status thinking';
            return;
        }

        status.className = 'status';

        const kingPos = this.getKingPosition(this.currentPlayer);
        const isInCheck = this.isSquareAttacked(kingPos.row, kingPos.col, this.currentPlayer === 'white' ? 'black' : 'white');

        let statusText = `${currentColor} to move.`;
        if (isInCheck) {
            statusText += ' CHECK!';
        }

        status.textContent = statusText;
    }

    undoMove() {
        if (this.moveHistory.length === 0 || this.isBotThinking) return;

        this.board = this.boardHistory.pop();
        this.moveHistory.pop();
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.selectedSquare = null;
        this.legalMoves = [];

        this.updateStatus();
        this.render();
    }

    resetGame() {
        if (this.isBotThinking) return;

        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.boardHistory = [];
        this.isBotThinking = false;

        this.updateStatus();
        this.render();
    }

    render() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;

                // Highlight selected square
                if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }

                // Highlight legal moves
                if (this.legalMoves.some(m => m.row === row && m.col === col)) {
                    square.classList.add('legal-move');
                    if (this.board[row][col] !== null) {
                        square.classList.add('capture-move');
                    }
                }

                // Add piece
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = this.getPieceSymbol(piece);
                    square.appendChild(pieceElement);
                }

                square.onclick = () => this.selectSquare(row, col);
                boardElement.appendChild(square);
            }
        }

        // Update move history
        const moveHistoryElement = document.getElementById('moveHistory');
        moveHistoryElement.innerHTML = this.moveHistory
            .map((move, idx) => `<div class="move">${idx + 1}. ${move}</div>`)
            .join('');

        // Update player display
        document.getElementById('currentPlayer').textContent = this.currentPlayer === 'white' ? 'White' : 'Black';

        // Update button states
        const botButton = document.querySelector('button[onclick="makeBotMove()"]');
        if (botButton) {
            botButton.disabled = this.currentPlayer !== 'black' || this.isBotThinking;
        }
    }
}

// Chess Bot Class (JavaScript implementation of the Python bot)
class ChessBot {
    constructor(board, currentPlayer) {
        this.board = JSON.parse(JSON.stringify(board)); // Deep copy
        this.currentPlayer = currentPlayer;
        this.pieceValues = {
            'pawn': 100,
            'knight': 320,
            'bishop': 330,
            'rook': 500,
            'queen': 900,
            'king': 20000
        };

        // Position tables for piece-square evaluation
        this.pawnTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];

        this.knightTable = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];

        this.bishopTable = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ];

        this.rookTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [0,  0,  0,  5,  5,  0,  0,  0]
        ];

        this.queenTable = [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [-5,  0,  5,  5,  5,  5,  0, -5],
            [0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ];

        this.kingTable = [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [20, 20,  0,  0,  0,  0, 20, 20],
            [20, 30, 10,  0,  0, 10, 30, 20]
        ];
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowDir = Math.sign(toRow - fromRow);
        const colDir = Math.sign(toCol - fromCol);
        let currentRow = fromRow + rowDir;
        let currentCol = fromCol + colDir;

        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) {
                return false;
            }
            currentRow += rowDir;
            currentCol += colDir;
        }
        return true;
    }

    getKingPosition(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, byColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (!piece || piece.color !== byColor) continue;

                const moves = this.getLegalMovesForPiece(r, c, true);
                if (moves.some(move => move.row === row && move.col === col)) {
                    return true;
                }
            }
        }
        return false;
    }

    wouldBeInCheck(color, fromRow, fromCol, toRow, toCol) {
        // Make temporary move
        const originalPiece = this.board[toRow][toCol];
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;

        const kingPos = this.getKingPosition(color);
        const isInCheck = this.isSquareAttacked(kingPos.row, kingPos.col, color === 'white' ? 'black' : 'white');

        // Undo temporary move
        this.board[fromRow][fromCol] = this.board[toRow][toCol];
        this.board[toRow][toCol] = originalPiece;

        return isInCheck;
    }

    getLegalMovesForPiece(row, col, ignoreCheck = false) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];

        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col, piece);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, piece);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col, piece);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col, piece);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col, piece);
                break;
            case 'king':
                moves = this.getKingMoves(row, col, piece);
                break;
        }

        // Filter out moves that would put/leave king in check
        if (!ignoreCheck) {
            moves = moves.filter(move =>
                !this.wouldBeInCheck(piece.color, row, col, move.row, move.col)
            );
        }

        return moves;
    }

    getPawnMoves(row, col, piece) {
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Forward move
        const forwardRow = row + direction;
        if (this.isValidPosition(forwardRow, col) && this.board[forwardRow][col] === null) {
            moves.push({ row: forwardRow, col });

            // Double move from start
            if (row === startRow) {
                const doubleRow = row + 2 * direction;
                if (this.board[doubleRow][col] === null) {
                    moves.push({ row: doubleRow, col });
                }
            }
        }

        // Diagonal captures
        for (let dc of [-1, 1]) {
            const captureRow = row + direction;
            const captureCol = col + dc;
            if (this.isValidPosition(captureRow, captureCol)) {
                const targetPiece = this.board[captureRow][captureCol];
                if (targetPiece && targetPiece.color !== piece.color) {
                    moves.push({ row: captureRow, col: captureCol });
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col, piece) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece) {
                    moves.push({ row: r, col: c });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    getKnightMoves(row, col, piece) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dr, dc] of knightMoves) {
            const r = row + dr, c = col + dc;
            if (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece || targetPiece.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
            }
        }

        return moves;
    }

    getBishopMoves(row, col, piece) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece) {
                    moves.push({ row: r, col: c });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    getQueenMoves(row, col, piece) {
        const moves = [];
        // Combine rook and bishop moves
        const directions = [
            [0, 1], [0, -1], [1, 0], [-1, 0], // rook
            [1, 1], [1, -1], [-1, 1], [-1, -1] // bishop
        ];

        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece) {
                    moves.push({ row: r, col: c });
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    getKingMoves(row, col, piece) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const r = row + dr, c = col + dc;
            if (this.isValidPosition(r, c)) {
                const targetPiece = this.board[r][c];
                if (!targetPiece || targetPiece.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
            }
        }

        return moves;
    }

    getAllLegalMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.getLegalMovesForPiece(row, col);
                    for (const move of pieceMoves) {
                        moves.push({
                            from_row: row,
                            from_col: col,
                            to_row: move.row,
                            to_col: move.col,
                            piece: piece
                        });
                    }
                }
            }
        }
        return moves;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
    }

    evaluateBoard() {
        let score = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    let value = this.pieceValues[piece.type];
                    let positionValue = 0;

                    // Add position value based on piece type
                    if (piece.type === 'pawn') {
                        positionValue = piece.color === 'white' ? this.pawnTable[7-row][col] : this.pawnTable[row][col];
                    } else if (piece.type === 'knight') {
                        positionValue = piece.color === 'white' ? this.knightTable[7-row][col] : this.knightTable[row][col];
                    } else if (piece.type === 'bishop') {
                        positionValue = piece.color === 'white' ? this.bishopTable[7-row][col] : this.bishopTable[row][col];
                    } else if (piece.type === 'rook') {
                        positionValue = piece.color === 'white' ? this.rookTable[7-row][col] : this.rookTable[row][col];
                    } else if (piece.type === 'queen') {
                        positionValue = piece.color === 'white' ? this.queenTable[7-row][col] : this.queenTable[row][col];
                    } else if (piece.type === 'king') {
                        positionValue = piece.color === 'white' ? this.kingTable[7-row][col] : this.kingTable[row][col];
                    }

                    if (piece.color === 'white') {
                        score += value + positionValue;
                    } else {
                        score -= value + positionValue;
                    }
                }
            }
        }

        return score;
    }

    isGameOver() {
        // Check if current player has any legal moves
        const moves = this.getAllLegalMoves(this.currentPlayer);
        return moves.length === 0;
    }

    minimax(depth, alpha, beta, maximizingPlayer) {
        if (depth === 0 || this.isGameOver()) {
            return this.evaluateBoard();
        }

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            const moves = this.getAllLegalMoves(this.currentPlayer);

            for (const move of moves) {
                // Make move
                const originalPiece = this.board[move.to_row][move.to_col];
                this.board[move.to_row][move.to_col] = this.board[move.from_row][move.from_col];
                this.board[move.from_row][move.from_col] = null;
                const originalPlayer = this.currentPlayer;
                this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

                // Recurse
                const evalScore = this.minimax(depth - 1, alpha, beta, false);

                // Undo move
                this.board[move.from_row][move.from_col] = this.board[move.to_row][move.to_col];
                this.board[move.to_row][move.to_col] = originalPiece;
                this.currentPlayer = originalPlayer;

                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }

            return maxEval;
        } else {
            let minEval = Infinity;
            const opponentColor = this.currentPlayer === 'white' ? 'black' : 'white';
            const moves = this.getAllLegalMoves(opponentColor);

            for (const move of moves) {
                // Make move
                const originalPiece = this.board[move.to_row][move.to_col];
                this.board[move.to_row][move.to_col] = this.board[move.from_row][move.from_col];
                this.board[move.from_row][move.from_col] = null;
                const originalPlayer = this.currentPlayer;
                this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

                // Recurse
                const evalScore = this.minimax(depth - 1, alpha, beta, true);

                // Undo move
                this.board[move.from_row][move.from_col] = this.board[move.to_row][move.to_col];
                this.board[move.to_row][move.to_col] = originalPiece;
                this.currentPlayer = originalPlayer;

                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }

            return minEval;
        }
    }

    getBestMove(depth = 3) {
        let bestMove = null;
        let bestValue = -Infinity;
        let alpha = -Infinity;
        let beta = Infinity;

        const moves = this.getAllLegalMoves(this.currentPlayer);

        if (moves.length === 0) {
            return null;
        }

        for (const move of moves) {
            // Make move
            const originalPiece = this.board[move.to_row][move.to_col];
            this.board[move.to_row][move.to_col] = this.board[move.from_row][move.from_col];
            this.board[move.from_row][move.from_col] = null;
            const originalPlayer = this.currentPlayer;
            this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

            // Evaluate move
            const moveValue = this.minimax(depth - 1, alpha, beta, false);

            // Undo move
            this.board[move.from_row][move.from_col] = this.board[move.to_row][move.to_col];
            this.board[move.to_row][move.to_col] = originalPiece;
            this.currentPlayer = originalPlayer;

            if (moveValue > bestValue) {
                bestValue = moveValue;
                bestMove = move;
            }
        }

        return bestMove;
    }
}

// Global game instance
let game;

function initGame() {
    game = new ChessGame();
}

function resetGame() {
    game.resetGame();
}

function undoMove() {
    game.undoMove();
}

function makeBotMove() {
    game.makeBotMove();
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame);
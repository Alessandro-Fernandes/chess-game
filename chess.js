// Chess Game Logic
class ChessGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.gameStatus = '';
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.enPassantTarget = null;
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;
        
        this.initBoard();
        this.render();
        this.setupEventListeners();
    }

    initBoard() {
        // Initialize empty board
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Setup pieces in starting position
        const initialPosition = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = initialPosition[row][col];
                if (piece) {
                    this.board[row][col] = {
                        type: piece.toLowerCase(),
                        color: piece === piece.toUpperCase() ? 'white' : 'black',
                        hasMoved: false
                    };
                }
            }
        }
    }

    render() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                // Check if square is selected or shows legal moves
                if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }

                const isLegalMove = this.legalMoves.some(move => move.row === row && move.col === col);
                if (isLegalMove) {
                    const piece = this.board[row][col];
                    if (piece) {
                        square.classList.add('legal-capture');
                    } else {
                        square.classList.add('legal-move');
                    }
                }

                // Add piece
                const piece = this.board[row][col];
                if (piece) {
                    square.innerHTML = this.getPieceSymbol(piece.type, piece.color);
                }

                square.addEventListener('click', () => this.onSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }

        this.updateInfo();
    }

    getPieceSymbol(type, color) {
        const symbols = {
            'p': { white: '♙', black: '♟' },
            'r': { white: '♖', black: '♜' },
            'n': { white: '♘', black: '♞' },
            'b': { white: '♗', black: '♝' },
            'q': { white: '♕', black: '♛' },
            'k': { white: '♔', black: '♚' }
        };
        return symbols[type][color];
    }

    onSquareClick(row, col) {
        if (this.gameOver) return;

        const clickedPiece = this.board[row][col];

        // If no piece is selected, select this piece if it belongs to current player
        if (!this.selectedSquare) {
            if (clickedPiece && clickedPiece.color === this.currentPlayer) {
                this.selectedSquare = { row, col };
                this.legalMoves = this.calculateLegalMoves(row, col);
                this.render();
            }
            return;
        }

        // If clicking the same piece, deselect
        if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
            this.selectedSquare = null;
            this.legalMoves = [];
            this.render();
            return;
        }

        // If clicking another piece of same color, select that piece instead
        if (clickedPiece && clickedPiece.color === this.currentPlayer) {
            this.selectedSquare = { row, col };
            this.legalMoves = this.calculateLegalMoves(row, col);
            this.render();
            return;
        }

        // Try to move piece
        const isLegalMove = this.legalMoves.some(move => move.row === row && move.col === col);
        if (isLegalMove) {
            this.movePiece(this.selectedSquare.row, this.selectedSquare.col, row, col);
        }

        this.selectedSquare = null;
        this.legalMoves = [];
        this.render();
    }

    calculateLegalMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];

        switch (piece.type) {
            case 'p':
                moves = this.getPawnMoves(row, col);
                break;
            case 'r':
                moves = this.getRookMoves(row, col);
                break;
            case 'n':
                moves = this.getKnightMoves(row, col);
                break;
            case 'b':
                moves = this.getBishopMoves(row, col);
                break;
            case 'q':
                moves = this.getQueenMoves(row, col);
                break;
            case 'k':
                moves = this.getKingMoves(row, col);
                break;
        }

        // Filter out moves that would leave king in check
        moves = moves.filter(move => {
            const testBoard = this.board.map(row => [...row]);
            const temp = testBoard[move.row][move.col];
            testBoard[move.row][move.col] = testBoard[row][col];
            testBoard[row][col] = null;
            
            const kingPos = this.findKing(testBoard, piece.color);
            return !this.isSquareAttacked(kingPos.row, kingPos.col, testBoard, piece.color);
        });

        return moves;
    }

    getPawnMoves(row, col) {
        const piece = this.board[row][col];
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Forward move
        const forwardRow = row + direction;
        if (forwardRow >= 0 && forwardRow < 8 && !this.board[forwardRow][col]) {
            moves.push({ row: forwardRow, col });

            // Double move from start
            if (row === startRow) {
                const doubleRow = row + 2 * direction;
                if (!this.board[doubleRow][col]) {
                    moves.push({ row: doubleRow, col });
                }
            }
        }

        // Captures
        for (let colOffset of [-1, 1]) {
            const newCol = col + colOffset;
            const newRow = row + direction;
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (target && target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
                // En passant
                if (this.enPassantTarget && this.enPassantTarget.row === newRow && this.enPassantTarget.col === newCol) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col) {
        return this.getSlidingMoves(row, col, [[0, 1], [1, 0], [0, -1], [-1, 0]]);
    }

    getBishopMoves(row, col) {
        return this.getSlidingMoves(row, col, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    }

    getQueenMoves(row, col) {
        return this.getSlidingMoves(row, col, [
            [0, 1], [1, 0], [0, -1], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]);
    }

    getSlidingMoves(row, col, directions) {
        const piece = this.board[row][col];
        const moves = [];

        for (let [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;

            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dr;
                newCol += dc;
            }
        }

        return moves;
    }

    getKnightMoves(row, col) {
        const piece = this.board[row][col];
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (let [dr, dc] of knightMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    getKingMoves(row, col) {
        const piece = this.board[row][col];
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (let [dr, dc] of kingMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        // Castling
        if (!piece.hasMoved) {
            // Kingside castling
            if (this.castlingRights[piece.color].kingside) {
                const rookCol = 7;
                const rook = this.board[row][rookCol];
                if (rook && rook.type === 'r' && !rook.hasMoved &&
                    !this.board[row][col + 1] && !this.board[row][col + 2] &&
                    !this.isSquareAttacked(row, col, this.board, piece.color) &&
                    !this.isSquareAttacked(row, col + 1, this.board, piece.color)) {
                    moves.push({ row, col: col + 2, castling: 'kingside' });
                }
            }
            // Queenside castling
            if (this.castlingRights[piece.color].queenside) {
                const rookCol = 0;
                const rook = this.board[row][rookCol];
                if (rook && rook.type === 'r' && !rook.hasMoved &&
                    !this.board[row][col - 1] && !this.board[row][col - 2] && !this.board[row][col - 3] &&
                    !this.isSquareAttacked(row, col, this.board, piece.color) &&
                    !this.isSquareAttacked(row, col - 1, this.board, piece.color)) {
                    moves.push({ row, col: col - 2, castling: 'queenside' });
                }
            }
        }

        return moves;
    }

    movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const captured = this.board[toRow][toCol];

        // Capture piece
        if (captured) {
            this.capturedPieces[this.currentPlayer].push(captured);
        }

        // Handle pawn promotion
        if (piece.type === 'p' && (toRow === 0 || toRow === 7)) {
            piece.type = 'q'; // Promote to queen
        }

        // Handle castling
        const moveData = this.legalMoves.find(move => move.row === toRow && move.col === toCol);
        if (moveData && moveData.castling) {
            const rookCol = moveData.castling === 'kingside' ? 7 : 0;
            const newRookCol = moveData.castling === 'kingside' ? 5 : 3;
            const rook = this.board[fromRow][rookCol];
            this.board[fromRow][newRookCol] = rook;
            this.board[fromRow][rookCol] = null;
            rook.hasMoved = true;
            
            // Update castling rights
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }

        // Handle en passant
        if (piece.type === 'p' && toCol !== fromCol && !captured) {
            const capturedPawnRow = fromRow;
            const capturedPawn = this.board[capturedPawnRow][toCol];
            if (capturedPawn) {
                this.capturedPieces[this.currentPlayer].push(capturedPawn);
                this.board[capturedPawnRow][toCol] = null;
            }
        }

        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        piece.hasMoved = true;

        // Update castling rights if rook moved
        if (piece.type === 'r' && !this.castlingRights[piece.color].kingside && !this.castlingRights[piece.color].queenside) {
            // Already lost castling rights
        } else if (piece.type === 'r') {
            if (fromCol === 0) {
                this.castlingRights[piece.color].queenside = false;
            } else if (fromCol === 7) {
                this.castlingRights[piece.color].kingside = false;
            }
        }

        // Update castling rights if king moved
        if (piece.type === 'k') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }

        // Update castling rights if rook is captured
        if (captured && captured.type === 'r') {
            if (toCol === 0) {
                this.castlingRights[captured.color].queenside = false;
            } else if (toCol === 7) {
                this.castlingRights[captured.color].kingside = false;
            }
        }

        // Update en passant target
        if (piece.type === 'p' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = { row: (fromRow + toRow) / 2, col: toCol };
        } else {
            this.enPassantTarget = null;
        }

        // Record move
        this.recordMove(fromRow, fromCol, toRow, toCol, captured);

        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Check game status
        this.checkGameStatus();
    }

    recordMove(fromRow, fromCol, toRow, toCol, captured) {
        const piece = this.board[toRow][toCol];
        const fromNotation = String.fromCharCode(97 + fromCol) + (8 - fromRow);
        const toNotation = String.fromCharCode(97 + toCol) + (8 - toRow);
        
        let moveNotation = piece.type.toUpperCase();
        if (piece.type === 'p') {
            moveNotation = '';
            if (captured) {
                moveNotation = String.fromCharCode(97 + fromCol) + 'x';
            }
        } else if (captured) {
            moveNotation += 'x';
        }
        
        moveNotation += toNotation;
        
        if (captured) {
            moveNotation += `(${this.getPieceSymbol(captured.type, captured.color)})`;
        }

        this.moveHistory.push(moveNotation);
        this.updateMoveHistory();
    }

    isSquareAttacked(row, col, board, byColor) {
        const attackingColor = byColor === 'white' ? 'black' : 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === attackingColor) {
                    const moves = this.getMovesForPiece(r, c, piece, board);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    getMovesForPiece(row, col, piece, board) {
        const tempBoard = this.board;
        this.board = board;

        let moves = [];
        switch (piece.type) {
            case 'p':
                const direction = piece.color === 'white' ? -1 : 1;
                for (let colOffset of [-1, 1]) {
                    const newCol = col + colOffset;
                    const newRow = row + direction;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        const target = board[newRow][newCol];
                        if (target && target.color !== piece.color) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                }
                break;
            case 'r':
                moves = this.getSlidingMoves(row, col, [[0, 1], [1, 0], [0, -1], [-1, 0]]);
                break;
            case 'n':
                moves = this.getKnightMoves(row, col);
                break;
            case 'b':
                moves = this.getSlidingMoves(row, col, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
                break;
            case 'q':
                moves = this.getSlidingMoves(row, col, [
                    [0, 1], [1, 0], [0, -1], [-1, 0],
                    [1, 1], [1, -1], [-1, 1], [-1, -1]
                ]);
                break;
            case 'k':
                const kingMoves = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1], [0, 1],
                    [1, -1], [1, 0], [1, 1]
                ];
                for (let [dr, dc] of kingMoves) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        const target = board[newRow][newCol];
                        if (!target || target.color !== piece.color) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                }
                break;
        }

        this.board = tempBoard;
        return moves;
    }

    findKing(board, color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === 'k' && piece.color === color) {
                    return { row, col };
                }
            }
        }
    }

    checkGameStatus() {
        const kingPos = this.findKing(this.board, this.currentPlayer);
        const isInCheck = this.isSquareAttacked(kingPos.row, kingPos.col, this.board, this.currentPlayer);

        // Check if any legal moves available
        let hasLegalMoves = false;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    const legalMoves = this.calculateLegalMoves(row, col);
                    if (legalMoves.length > 0) {
                        hasLegalMoves = true;
                        break;
                    }
                }
            }
            if (hasLegalMoves) break;
        }

        if (!hasLegalMoves) {
            this.gameOver = true;
            if (isInCheck) {
                this.gameStatus = `Checkmate! ${this.currentPlayer === 'white' ? 'Black' : 'White'} wins!`;
            } else {
                this.gameStatus = `Stalemate! Game is a draw.`;
            }
        } else if (isInCheck) {
            this.gameStatus = `Check! ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} is in check.`;
        } else {
            this.gameStatus = '';
        }
    }

    resetGame() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.gameStatus = '';
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.enPassantTarget = null;
        
        this.initBoard();
        this.render();
    }

    updateInfo() {
        document.getElementById('currentPlayer').textContent = 
            this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1) + ' to move';
        
        const statusElement = document.getElementById('gameStatus');
        if (this.gameStatus) {
            statusElement.textContent = this.gameStatus;
            statusElement.classList.add('show');
        } else {
            statusElement.classList.remove('show');
        }
    }

    updateMoveHistory() {
        const historyElement = document.getElementById('moveHistory');
        historyElement.innerHTML = '';
        
        let moveNumber = 1;
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const div = document.createElement('div');
            div.className = 'move-item';
            div.innerHTML = `${moveNumber}. ${this.moveHistory[i]} ${this.moveHistory[i + 1] ? this.moveHistory[i + 1] : ''}`;
            historyElement.appendChild(div);
            moveNumber++;
        }
        
        historyElement.scrollTop = historyElement.scrollHeight;
    }

    updateCapturedPieces() {
        const whiteCaptures = document.getElementById('capturedByWhite');
        const blackCaptures = document.getElementById('capturedByBlack');
        
        whiteCaptures.innerHTML = this.capturedPieces.white
            .map(p => this.getPieceSymbol(p.type, p.color))
            .join('');
        
        blackCaptures.innerHTML = this.capturedPieces.black
            .map(p => this.getPieceSymbol(p.type, p.color))
            .join('');
    }

    setupEventListeners() {
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('undoBtn').addEventListener('click', () => {
            // Undo functionality could be implemented here
            alert('Undo not yet implemented');
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new ChessGame();
    
    // Update captured pieces when render is called
    const originalRender = game.render.bind(game);
    game.render = function() {
        originalRender();
        game.updateCapturedPieces();
    };
});

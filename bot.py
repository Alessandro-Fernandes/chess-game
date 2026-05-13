import chess

board = chess.Board()

def evaluate_board(board):
    piece_values = {
        chess.PAWN: 10,
        chess.KNIGHT: 30,
        chess.BISHOP: 33,
        chess.ROOK: 50,
        chess.QUEEN: 100,
        chess.KING: 20000
    }
    score = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece:
            value = piece_values[piece.piece_type]
            if piece.color == chess.WHITE:
                score += value
            else:
                score -= value
    return score

def minimax(board, depth, alpha, beta, maximizing):
    if depth == 0 or board.is_game_over():
        return evaluate_board(board)
    if maximizing:
        max_eval = -float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            max_eval = max(max_eval, eval)
            alpha = max(alpha, eval)
            if beta <= alpha:
                break
        return max_eval
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            min_eval = min(min_eval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break
        return min_eval

def get_best_move(board, depth=3):
    best_move = None
    best_value = -float('inf')
    for move in board.legal_moves:
        board.push(move)
        move_value = minimax(board, depth - 1, -float('inf'), float('inf'), False)
        board.pop()
        if move_value > best_value:
            best_value = move_value
            best_move = move
    return best_move

while not board.is_game_over():
    print(board)
    print()

    if board.turn == chess.WHITE:
        move = input("Ton coup : ")
        try:
            chess_move = chess.Move.from_uci(move)
            if chess_move in board.legal_moves:
                board.push(chess_move)
            else:
                print("Coup illégal")
        except:
            print("Erreur")
    else:
        move = get_best_move(board, 3)
        board.push(move)
        print("Bot joue :", move)
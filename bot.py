import copy
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class ChessBot:
    def __init__(self):
        self.board = self.initialize_board()
        self.current_player = 'black'  # Bot plays as black
        self.piece_values = {
            'pawn': 1,
            'knight': 3,
            'bishop': 3.3,
            'rook': 5,
            'queen': 10,
            'king': 20000
        }

        # Position tables for piece-square evaluation
        self.pawn_table = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 10, 10, 5, 20],
            [5,  5, 15, 25, 30, 5,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ]

        self.knight_table = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ]

        self.bishop_table = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ]

        self.rook_table = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [0,  0,  0,  5,  5,  0,  0,  0]
        ]

        self.queen_table = [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [-5,  0,  5,  5,  5,  5,  0, -5],
            [0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ]

        self.king_table = [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [20, 20,  0,  0,  0,  0, 20, 20],
            [20, 30, 10,  0,  0, 10, 30, 20]
        ]

    def initialize_board(self):
        board = [[None for _ in range(8)] for _ in range(8)]

        # Black pieces (top)
        board[0][0] = {'type': 'rook', 'color': 'black'}
        board[0][1] = {'type': 'knight', 'color': 'black'}
        board[0][2] = {'type': 'bishop', 'color': 'black'}
        board[0][3] = {'type': 'queen', 'color': 'black'}
        board[0][4] = {'type': 'king', 'color': 'black'}
        board[0][5] = {'type': 'bishop', 'color': 'black'}
        board[0][6] = {'type': 'knight', 'color': 'black'}
        board[0][7] = {'type': 'rook', 'color': 'black'}

        for col in range(8):
            board[1][col] = {'type': 'pawn', 'color': 'black'}

        # White pieces (bottom)
        for col in range(8):
            board[6][col] = {'type': 'pawn', 'color': 'white'}

        board[7][0] = {'type': 'rook', 'color': 'white'}
        board[7][1] = {'type': 'knight', 'color': 'white'}
        board[7][2] = {'type': 'bishop', 'color': 'white'}
        board[7][3] = {'type': 'queen', 'color': 'white'}
        board[7][4] = {'type': 'king', 'color': 'white'}
        board[7][5] = {'type': 'bishop', 'color': 'white'}
        board[7][6] = {'type': 'knight', 'color': 'white'}
        board[7][7] = {'type': 'rook', 'color': 'white'}

        return board

    def set_board_from_js(self, js_board):
        """Convert JS board format to Python format"""
        for row in range(8):
            for col in range(8):
                if js_board[row][col]:
                    self.board[row][col] = js_board[row][col]
                else:
                    self.board[row][col] = None

    def is_valid_position(self, row, col):
        return 0 <= row < 8 and 0 <= col < 8

    def is_path_clear(self, from_row, from_col, to_row, to_col):
        row_dir = 1 if to_row > from_row else -1 if to_row < from_row else 0
        col_dir = 1 if to_col > from_col else -1 if to_col < from_col else 0

        current_row = from_row + row_dir
        current_col = from_col + col_dir

        while current_row != to_row or current_col != to_col:
            if self.board[current_row][current_col] is not None:
                return False
            current_row += row_dir
            current_col += col_dir

        return True

    def get_king_position(self, color):
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece['type'] == 'king' and piece['color'] == color:
                    return row, col
        return None

    def is_square_attacked(self, row, col, by_color):
        for r in range(8):
            for c in range(8):
                piece = self.board[r][c]
                if not piece or piece['color'] != by_color:
                    continue

                moves = self.get_legal_moves_for_piece(r, c, ignore_check=True)
                if any(move['row'] == row and move['col'] == col for move in moves):
                    return True
        return False

    def would_be_in_check(self, color, from_row, from_col, to_row, to_col):
        # Make temporary move
        original_piece = self.board[to_row][to_col]
        self.board[to_row][to_col] = self.board[from_row][from_col]
        self.board[from_row][from_col] = None

        king_pos = self.get_king_position(color)
        opponent_color = 'black' if color == 'white' else 'white'
        is_in_check = self.is_square_attacked(king_pos[0], king_pos[1], opponent_color)

        # Undo temporary move
        self.board[from_row][from_col] = self.board[to_row][to_col]
        self.board[to_row][to_col] = original_piece

        return is_in_check

    def get_legal_moves_for_piece(self, row, col, ignore_check=False):
        piece = self.board[row][col]
        if not piece:
            return []

        moves = []

        if piece['type'] == 'pawn':
            moves = self.get_pawn_moves(row, col, piece)
        elif piece['type'] == 'rook':
            moves = self.get_rook_moves(row, col, piece)
        elif piece['type'] == 'knight':
            moves = self.get_knight_moves(row, col, piece)
        elif piece['type'] == 'bishop':
            moves = self.get_bishop_moves(row, col, piece)
        elif piece['type'] == 'queen':
            moves = self.get_queen_moves(row, col, piece)
        elif piece['type'] == 'king':
            moves = self.get_king_moves(row, col, piece)

        # Filter out moves that would put/leave king in check
        if not ignore_check:
            moves = [move for move in moves if not self.would_be_in_check(piece['color'], row, col, move['row'], move['col'])]

        return moves

    def get_pawn_moves(self, row, col, piece):
        moves = []
        direction = -1 if piece['color'] == 'white' else 1
        start_row = 6 if piece['color'] == 'white' else 1

        # Forward move
        forward_row = row + direction
        if self.is_valid_position(forward_row, col) and self.board[forward_row][col] is None:
            moves.append({'row': forward_row, 'col': col})

            # Double move from start
            if row == start_row:
                double_row = row + 2 * direction
                if self.board[double_row][col] is None:
                    moves.append({'row': double_row, 'col': col})

        # Diagonal captures
        for dc in [-1, 1]:
            capture_row = row + direction
            capture_col = col + dc
            if self.is_valid_position(capture_row, capture_col):
                target_piece = self.board[capture_row][capture_col]
                if target_piece and target_piece['color'] != piece['color']:
                    moves.append({'row': capture_row, 'col': capture_col})

        return moves

    def get_rook_moves(self, row, col, piece):
        moves = []
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]

        for dr, dc in directions:
            r, c = row + dr, col + dc
            while self.is_valid_position(r, c):
                target_piece = self.board[r][c]
                if target_piece is None:
                    moves.append({'row': r, 'col': c})
                else:
                    if target_piece['color'] != piece['color']:
                        moves.append({'row': r, 'col': c})
                    break
                r += dr
                c += dc

        return moves

    def get_knight_moves(self, row, col, piece):
        moves = []
        knight_moves = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                       (1, -2), (1, 2), (2, -1), (2, 1)]

        for dr, dc in knight_moves:
            r, c = row + dr, col + dc
            if self.is_valid_position(r, c):
                target_piece = self.board[r][c]
                if target_piece is None or target_piece['color'] != piece['color']:
                    moves.append({'row': r, 'col': c})

        return moves

    def get_bishop_moves(self, row, col, piece):
        moves = []
        directions = [(1, 1), (1, -1), (-1, 1), (-1, -1)]

        for dr, dc in directions:
            r, c = row + dr, col + dc
            while self.is_valid_position(r, c):
                target_piece = self.board[r][c]
                if target_piece is None:
                    moves.append({'row': r, 'col': c})
                else:
                    if target_piece['color'] != piece['color']:
                        moves.append({'row': r, 'col': c})
                    break
                r += dr
                c += dc

        return moves

    def get_queen_moves(self, row, col, piece):
        moves = []
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0),  # rook
                     (1, 1), (1, -1), (-1, 1), (-1, -1)]  # bishop

        for dr, dc in directions:
            r, c = row + dr, col + dc
            while self.is_valid_position(r, c):
                target_piece = self.board[r][c]
                if target_piece is None:
                    moves.append({'row': r, 'col': c})
                else:
                    if target_piece['color'] != piece['color']:
                        moves.append({'row': r, 'col': c})
                    break
                r += dr
                c += dc

        return moves

    def get_king_moves(self, row, col, piece):
        moves = []
        directions = [(-1, -1), (-1, 0), (-1, 1),
                     (0, -1), (0, 1),
                     (1, -1), (1, 0), (1, 1)]

        for dr, dc in directions:
            r, c = row + dr, col + dc
            if self.is_valid_position(r, c):
                target_piece = self.board[r][c]
                if target_piece is None or target_piece['color'] != piece['color']:
                    moves.append({'row': r, 'col': c})

        return moves

    def get_all_legal_moves(self, color):
        moves = []
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece['color'] == color:
                    piece_moves = self.get_legal_moves_for_piece(row, col)
                    for move in piece_moves:
                        moves.append({
                            'from_row': row,
                            'from_col': col,
                            'to_row': move['row'],
                            'to_col': move['col'],
                            'piece': piece
                        })
        return moves

    def make_move(self, from_row, from_col, to_row, to_col):
        piece = self.board[from_row][from_col]
        self.board[to_row][to_col] = piece
        self.board[from_row][from_col] = None
        self.current_player = 'black' if self.current_player == 'white' else 'white'

    def evaluate_board(self):
        score = 0

        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece:
                    value = self.piece_values[piece['type']]
                    position_value = 0

                    # Add position value based on piece type
                    if piece['type'] == 'pawn':
                        position_value = self.pawn_table[row if piece['color'] == 'white' else 7-row][col]
                    elif piece['type'] == 'knight':
                        position_value = self.knight_table[row if piece['color'] == 'white' else 7-row][col]
                    elif piece['type'] == 'bishop':
                        position_value = self.bishop_table[row if piece['color'] == 'white' else 7-row][col]
                    elif piece['type'] == 'rook':
                        position_value = self.rook_table[row if piece['color'] == 'white' else 7-row][col]
                    elif piece['type'] == 'queen':
                        position_value = self.queen_table[row if piece['color'] == 'white' else 7-row][col]
                    elif piece['type'] == 'king':
                        position_value = self.king_table[row if piece['color'] == 'white' else 7-row][col]

                    if piece['color'] == 'white':
                        score += value + position_value
                    else:
                        score -= value + position_value

        return score

    def is_game_over(self):
        # Check if current player has any legal moves
        moves = self.get_all_legal_moves(self.current_player)
        return len(moves) == 0

    def minimax(self, depth, alpha, beta, maximizing_player):
        if depth == 0 or self.is_game_over():
            return self.evaluate_board()

        if maximizing_player:
            max_eval = float('-inf')
            moves = self.get_all_legal_moves(self.current_player)

            for move in moves:
                # Make move
                original_piece = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = self.board[move['from_row']][move['from_col']]
                self.board[move['from_row']][move['from_col']] = None
                original_player = self.current_player
                self.current_player = 'black' if self.current_player == 'white' else 'white'

                # Recurse
                eval_score = self.minimax(depth - 1, alpha, beta, False)

                # Undo move
                self.board[move['from_row']][move['from_col']] = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = original_piece
                self.current_player = original_player

                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break  # Alpha-beta pruning

            return max_eval
        else:
            min_eval = float('inf')
            opponent_color = 'black' if self.current_player == 'white' else 'white'
            moves = self.get_all_legal_moves(opponent_color)

            for move in moves:
                # Make move
                original_piece = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = self.board[move['from_row']][move['from_col']]
                self.board[move['from_row']][move['from_col']] = None
                original_player = self.current_player
                self.current_player = 'black' if self.current_player == 'white' else 'white'

                # Recurse
                eval_score = self.minimax(depth - 1, alpha, beta, True)

                # Undo move
                self.board[move['from_row']][move['from_col']] = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = original_piece
                self.current_player = original_player

                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break  # Alpha-beta pruning

            return min_eval

    def get_best_move(self, depth=3):
        best_move = None
        best_value = float('-inf')
        alpha = float('-inf')
        beta = float('inf')

        moves = self.get_all_legal_moves(self.current_player)

        if not moves:
            return None

        for move in moves:
            # Make move
            original_piece = self.board[move['to_row']][move['to_col']]
            self.board[move['to_row']][move['to_col']] = self.board[move['from_row']][move['from_col']]
            self.board[move['from_row']][move['from_col']] = None
            original_player = self.current_player
            self.current_player = 'black' if self.current_player == 'white' else 'white'

            # Evaluate move
            move_value = self.minimax(depth - 1, alpha, beta, False)

            # Undo move
            self.board[move['from_row']][move['from_col']] = self.board[move['to_row']][move['to_col']]
            self.board[move['to_row']][move['to_col']] = original_piece
            self.current_player = original_player

            if move_value > best_value:
                best_value = move_value
                best_move = move

        return best_move

# Global bot instance
bot = ChessBot()

@app.route('/get_bot_move', methods=['POST'])
def get_bot_move():
    try:
        data = request.get_json()
        board = data.get('board', [])
        current_player = data.get('current_player', 'black')

        # Update bot's board and current player
        bot.set_board_from_js(board)
        bot.current_player = current_player

        # Get best move
        best_move = bot.get_best_move(depth=3)

        if best_move:
            return jsonify({
                'success': True,
                'move': {
                    'from_row': best_move['from_row'],
                    'from_col': best_move['from_col'],
                    'to_row': best_move['to_row'],
                    'to_col': best_move['to_col']
                }
            })
        else:
            return jsonify({'success': False, 'error': 'No moves available'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    print("Chess Bot Server starting...")
    print("Bot plays as Black using Minimax algorithm")
    app.run(debug=True, host='0.0.0.0', port=5000)
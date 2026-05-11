import copy
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

class ChessBot:
    def __init__(self):
        self.board = self.initialize_board()
        self.current_player = 'black'
        self.piece_values = {
            'pawn': 10,
            'knight': 30,
            'bishop': 33,
            'rook': 50,
            'queen': 100,
            'king': 20000
        }
        # ===========================================
        # PIECE-SQUARE TABLES - POSITIONAL VALUES
        # ===========================================
        #
        # BOARD ORIENTATION:
        # - Row 0 = Top of board (Black's starting side)
        # - Row 7 = Bottom of board (White's starting side)
        # - Col 0 = Left (a-file), Col 7 = Right (h-file)
        #
        # For white pieces: table[row][col] directly
        # For black pieces: table[7-row][col] (vertically mirrored)
        #
        # Positive values = good positions, Negative values = bad positions
        # ===========================================

        self.pawn_table_white = [
            [100, 100, 100, 100, 100, 100, 100, 100],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [5, 5, 0, 10, 10, 0, 0, 0],
            [0,  0, 0, 20, 20, 0,  0,  0],
            [0,  -10,  -10, 40, 40,  -10,  -10,  0],
            [5, -5,-5,  -10,  -10,-5, -5,  5],
            [10, 15, 15,-20,-20, 15, 15,  10],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ]

        # Black pawn table - mirrored vertically (7-row) because black sees board upside down
        # Row 0 becomes Row 7, Row 7 becomes Row 0
        self.pawn_table_black = [
            [-100,  -100,  -100,  -100,  -100,  -100,  -100,  -100],
            [-50, -50, -50, -50, -50, -50, -50, -50],
            [-5, -5, 0, -10, -10, 0, 0, 0],
            [0,  0, 0, -20, -20, 0,  0,  0],
            [0,  10,  10, -40, -40,  10,  10,  0],
            [-5, 5, 5,  -10,  -10,-5, -5,  5],
            [-10, -15, -15, 20, 20, -15, -15, -10],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ]

        # Knight tables: Corners are bad, center is good
        # White knight table: Row 0-7 from white's perspective (bottom-up)
        self.knight_table_white = [
            [-50,-40,-30,-30,-30,-30,-40,-50],  # Row 0: Black's corner - very bad
            [-40,-20,  0,  0,  0,  0,-20,-40],  # Row 1
            [-30,  0, 10, 15, 15, 10,  0,-30],  # Row 2: Getting better
            [-30,  5, 15, 20, 20, 15,  5,-30],  # Row 3: Center is best
            [-30,  0, 15, 20, 20, 15,  0,-30],  # Row 4: Center still good
            [-30,  5, 10, 15, 15, 10,  5,-30],  # Row 5
            [-40,-20,  0,  5,  5,  0,-20,-40],  # Row 6
            [-50,-40,-30,-30,-30,-30,-40,-50]   # Row 7: White's corner - bad
        ]

        # Black knight table: Values are negated and mirrored (7-row)
        self.knight_table_black = [
            [50, 40, 30, 30, 30, 30, 40, 50],   # Row 0 (becomes Row 7): White's corner
            [40, 20,  0,  0,  0,  0, 20, 40],   # Row 1 (becomes Row 6)
            [30,  0,-10,-15,-15,-10,  0, 30],   # Row 2 (becomes Row 5)
            [30, -5,-15,-20,-20,-15, -5, 30],   # Row 3 (becomes Row 4): Center
            [30,  0,-15,-20,-20,-15,  0, 30],   # Row 4 (becomes Row 3): Center
            [30, -5,-10,-15,-15,-10, -5, 30],   # Row 5 (becomes Row 2)
            [40, 20,  0, -5, -5,  0, 20, 40],  # Row 6 (becomes Row 1)
            [50, 40, 30, 30, 30, 30, 40, 50]    # Row 7 (becomes Row 0): Black's corner
        ]

        self.bishop_table_white = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ]

        self.bishop_table_black = [
            [20, 10, 10, 10, 10, 10, 10, 20],
            [10,  0,  0,  0,  0,  0,  0, 10],
            [10,  0, -5,-10,-10, -5,  0, 10],
            [10, -5, -5,-10,-10, -5, -5, 10],
            [10,  0,-10,-10,-10,-10,  0, 10],
            [10,-10,-10,-10,-10,-10,-10, 10],
            [10, -5,  0,  0,  0,  0, -5, 10],
            [20, 10, 10, 10, 10, 10, 10, 20]
        ]

        self.rook_table_white = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [0,  0,  0,  5,  5,  0,  0,  0]
        ]

        self.rook_table_black = [
            [0,  0,  0, -5, -5,  0,  0,  0],
            [5,  0,  0,  0,  0,  0,  0,  5],
            [5,  0,  0,  0,  0,  0,  0,  5],
            [5,  0,  0,  0,  0,  0,  0,  5],
            [5,  0,  0,  0,  0,  0,  0,  5],
            [5,  0,  0,  0,  0,  0,  0,  5],
            [-5,-10,-10,-10,-10,-10,-10, -5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ]

        self.queen_table_white = [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [-5,  0,  5,  5,  5,  5,  0, -5],
            [0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ]

        self.queen_table_black = [
            [20, 10, 10,  5,  5, 10, 10, 20],
            [10,  0,  0,  0,  0,  0,  0, 10],
            [10,  0, -5, -5, -5, -5,  0, 10],
            [5,  0, -5, -5, -5, -5,  0,  5],
            [0,  0, -5, -5, -5, -5,  0,  5],
            [10, -5, -5, -5, -5, -5,  0, 10],
            [10,  0, -5,  0,  0,  0,  0, 10],
            [20, 10, 10,  5,  5, 10, 10, 20]
        ]

        self.king_table_white = [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [20, 20,  0,  0,  0,  0, 20, 20],
            [20, 30, 10,  0,  0, 10, 30, 20]
        ]

        self.king_table_black = [
            [-20,-30,-10,  0,  0,-10,-30,-20],
            [-20,-20,  0,  0,  0,  0,-20,-20],
            [10, 20, 20, 20, 20, 20, 20, 10],
            [20, 30, 30, 40, 40, 30, 30, 20],
            [30, 40, 40, 50, 50, 40, 40, 30],
            [30, 40, 40, 50, 50, 40, 40, 30],
            [30, 40, 40, 50, 50, 40, 40, 30],
            [30, 40, 40, 50, 50, 40, 40, 30]
        ]

    def initialize_board(self):
        board = [[None for _ in range(8)] for _ in range(8)]

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
        original_piece = self.board[to_row][to_col]
        self.board[to_row][to_col] = self.board[from_row][from_col]
        self.board[from_row][from_col] = None

        king_pos = self.get_king_position(color)
        opponent_color = 'black' if color == 'white' else 'white'
        is_in_check = self.is_square_attacked(king_pos[0], king_pos[1], opponent_color)

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

        if not ignore_check:
            moves = [move for move in moves if not self.would_be_in_check(piece['color'], row, col, move['row'], move['col'])]

        return moves

    def get_pawn_moves(self, row, col, piece):
        moves = []
        direction = -1 if piece['color'] == 'white' else 1
        start_row = 6 if piece['color'] == 'white' else 1

        forward_row = row + direction
        if self.is_valid_position(forward_row, col) and self.board[forward_row][col] is None:
            moves.append({'row': forward_row, 'col': col})

            if row == start_row:
                double_row = row + 2 * direction
                if self.board[double_row][col] is None:
                    moves.append({'row': double_row, 'col': col})

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
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0),
                     (1, 1), (1, -1), (-1, 1), (-1, -1)]

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

                    # Get positional bonus/penalty from piece-square tables
                    if piece['type'] == 'pawn':
                        if piece['color'] == 'white':
                            # White uses table directly: row 0 = black side, row 7 = white side
                            position_value = self.pawn_table_white[row][col]
                        else:
                            # Black uses mirrored table: 7-row flips the board vertically
                            # So row 0 becomes row 7 (black's home), row 7 becomes row 0 (white's side)
                            position_value = self.pawn_table_black[7-row][col]
                    elif piece['type'] == 'knight':
                        if piece['color'] == 'white':
                            position_value = self.knight_table_white[row][col]
                        else:
                            position_value = self.knight_table_black[7-row][col]
                    elif piece['type'] == 'bishop':
                        if piece['color'] == 'white':
                            position_value = self.bishop_table_white[row][col]
                        else:
                            position_value = self.bishop_table_black[7-row][col]
                    elif piece['type'] == 'rook':
                        if piece['color'] == 'white':
                            position_value = self.rook_table_white[row][col]
                        else:
                            position_value = self.rook_table_black[7-row][col]
                    elif piece['type'] == 'queen':
                        if piece['color'] == 'white':
                            position_value = self.queen_table_white[row][col]
                        else:
                            position_value = self.queen_table_black[7-row][col]
                    elif piece['type'] == 'king':
                        if piece['color'] == 'white':
                            position_value = self.king_table_white[row][col]
                        else:
                            position_value = self.king_table_black[7-row][col]

                    score += value + position_value

        return score

    def is_game_over(self):
        moves = self.get_all_legal_moves(self.current_player)
        return len(moves) == 0

    def minimax(self, depth, alpha, beta, maximizing_player):
        if depth == 0 or self.is_game_over():
            return self.evaluate_board()

        if maximizing_player:
            max_eval = float('-inf')
            moves = self.get_all_legal_moves(self.current_player)

            for move in moves:
                original_piece = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = self.board[move['from_row']][move['from_col']]
                self.board[move['from_row']][move['from_col']] = None
                original_player = self.current_player
                self.current_player = 'black' if self.current_player == 'white' else 'white'

                eval_score = self.minimax(depth - 1, alpha, beta, False)

                self.board[move['from_row']][move['from_col']] = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = original_piece
                self.current_player = original_player

                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break

            return max_eval
        else:
            min_eval = float('inf')
            opponent_color = 'black' if self.current_player == 'white' else 'white'
            moves = self.get_all_legal_moves(opponent_color)

            for move in moves:
                original_piece = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = self.board[move['from_row']][move['from_col']]
                self.board[move['from_row']][move['from_col']] = None
                original_player = self.current_player
                self.current_player = 'black' if self.current_player == 'white' else 'white'

                eval_score = self.minimax(depth - 1, alpha, beta, True)

                self.board[move['from_row']][move['from_col']] = self.board[move['to_row']][move['to_col']]
                self.board[move['to_row']][move['to_col']] = original_piece
                self.current_player = original_player

                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break

            return min_eval

    def get_best_move(self, depth=5):
        best_move = None
        best_value = float('-inf')
        alpha = float('-inf')
        beta = float('inf')

        moves = self.get_all_legal_moves(self.current_player)

        if not moves:
            return None

        for move in moves:
            original_piece = self.board[move['to_row']][move['to_col']]
            self.board[move['to_row']][move['to_col']] = self.board[move['from_row']][move['from_col']]
            self.board[move['from_row']][move['from_col']] = None
            original_player = self.current_player
            self.current_player = 'black' if self.current_player == 'white' else 'white'

            move_value = self.minimax(depth - 1, alpha, beta, False)

            self.board[move['from_row']][move['from_col']] = self.board[move['to_row']][move['to_col']]
            self.board[move['to_row']][move['to_col']] = original_piece
            self.current_player = original_player

            if move_value > best_value:
                best_value = move_value
                best_move = move

        return best_move

bot = ChessBot()

@app.route('/get_bot_move', methods=['POST'])
def get_bot_move():
    try:
        data = request.get_json()
        board = data.get('board', [])
        current_player = data.get('current_player', 'black')

        bot.set_board_from_js(board)
        bot.current_player = current_player

        best_move = bot.get_best_move(depth=5)

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
import chess
import chess.engine

board = chess.Board()

engine = chess.engine.SimpleEngine.popen_uci(
    r"C:\Users\doudo\Downloads\stockfish-windows-x86-64-avx2\stockfish-windows-x86-64-avx2.exe"
)

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

        result = engine.play(
            board,
            chess.engine.Limit(depth=12)
        )

        board.push(result.move)

        print("Stockfish joue :", result.move)

engine.quit()
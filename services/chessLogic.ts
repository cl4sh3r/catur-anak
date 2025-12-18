
import { Chess } from 'chess.js';

export class ChessService {
  private game: Chess;

  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  getBoard() {
    return this.game.board();
  }

  getTurn() {
    return this.game.turn();
  }

  getFen() {
    return this.game.fen();
  }

  moves(square?: any) {
    return this.game.moves({ square, verbose: true });
  }

  move(from: string, to: string) {
    try {
      return this.game.move({ from, to, promotion: 'q' });
    } catch (e) {
      return null;
    }
  }

  undo() {
    return this.game.undo();
  }

  reset() {
    this.game.reset();
  }

  isCheck() {
    return this.game.inCheck();
  }

  isCheckmate() {
    return this.game.isCheckmate();
  }

  isDraw() {
    return this.game.isDraw();
  }

  isGameOver() {
    return this.game.isGameOver();
  }

  getHistory() {
    return this.game.history();
  }

  loadFen(fen: string) {
    return this.game.load(fen);
  }
}

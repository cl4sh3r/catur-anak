
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type GameMode = 'local' | 'online';

export interface Square {
  type: PieceType;
  color: Color;
}

export interface Move {
  from: string;
  to: string;
  promotion?: string;
}

export interface GameState {
  fen: string;
  history: string[];
  turn: Color;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  lastMove?: Move;
}

export interface PeerMessage {
  type: 'MOVE' | 'UNDO' | 'RESET' | 'SYNC' | 'READY_CHANGE';
  payload: any;
}

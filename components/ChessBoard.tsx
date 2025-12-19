
import React, { useState } from 'react';
import ChessPiece from './ChessPiece';
import { Color, PieceType, GameMode } from '../types';

interface BoardProps {
  board: any[][];
  onMove: (from: string, to: string) => void;
  turn: Color;
  legalMoves: any[];
  lastMove?: { from: string, to: string };
  isCheck: boolean;
  myColor: Color;
  gameMode: GameMode;
  flipped?: boolean;
}

const ChessBoard: React.FC<BoardProps> = ({ 
  board, 
  onMove, 
  turn, 
  legalMoves, 
  lastMove, 
  isCheck,
  myColor,
  gameMode,
  flipped = false
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const getSquareName = (row: number, col: number) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return `${files[col]}${ranks[row]}`;
  };

  const handleSquareClick = (row: number, col: number) => {
    if (gameMode === 'online' && turn !== myColor) return;

    const square = getSquareName(row, col);
    
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      const isLegal = legalMoves.some(m => m.from === selectedSquare && m.to === square);
      if (isLegal) {
        onMove(selectedSquare, square);
        setSelectedSquare(null);
      } else {
        const piece = board[row][col];
        if (piece && piece.color === turn) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      const piece = board[row][col];
      if (piece && piece.color === turn) {
        setSelectedSquare(square);
      }
    }
  };

  const isHighlighted = (square: string) => {
    return legalMoves.some(m => m.from === selectedSquare && m.to === square);
  };

  const renderBoard = () => {
    const rows = [];
    const displayAsBlack = gameMode === 'online' ? myColor === 'b' : flipped;
    const range = displayAsBlack ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    
    for (const r of range) {
      const cols = [];
      const colRange = displayAsBlack ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
      
      for (const c of colRange) {
        const squareName = getSquareName(r, c);
        const piece = board[r][c];
        const isDark = (r + c) % 2 === 1;
        const isSelected = selectedSquare === squareName;
        const isLegalDest = isHighlighted(squareName);
        const isLastMove = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
        
        cols.push(
          <div
            key={squareName}
            onClick={() => handleSquareClick(r, c)}
            className={`
              relative flex-shrink-0 flex-grow-0
              ${isDark ? 'bg-emerald-200' : 'bg-white'}
              ${isSelected ? 'bg-yellow-200 ring-4 ring-inset ring-yellow-400 z-10' : ''}
              ${isLastMove ? 'bg-yellow-100' : ''}
              cursor-pointer transition-colors duration-75 overflow-hidden
            `}
            style={{ 
              width: '12.5%', 
              height: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Koordinat label (lebih terlihat sedikit karena papan lebih besar) */}
            <span className="absolute top-1 left-1 text-[10px] text-gray-400 font-bold select-none z-0">
              {squareName}
            </span>

            {/* Kontainer Bidak dengan ukuran yang diperbesar (sekitar 80-84px) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-1">
               {piece && <ChessPiece type={piece.type} color={piece.color} size={82} />}
            </div>

            {/* Penanda Langkah Legal yang lebih besar */}
            {isLegalDest && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className={`rounded-full ${piece ? 'w-full h-full border-[10px] border-emerald-500/25' : 'w-6 h-6 bg-emerald-500/40'}`} />
              </div>
            )}

            {/* Efek Skak */}
            {isCheck && piece?.type === 'k' && piece?.color === turn && (
              <div className="absolute inset-0 bg-red-500/30 animate-pulse z-10" />
            )}
          </div>
        );
      }
      rows.push(
        <div key={r} className="flex w-full overflow-hidden" style={{ height: '12.5%' }}>
          {cols}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="w-full aspect-square max-w-[1024px] min-w-[320px] border-[16px] border-emerald-700 rounded-[40px] overflow-hidden shadow-2xl bg-emerald-700 flex flex-col items-stretch justify-stretch">
       {renderBoard()}
    </div>
  );
};

export default ChessBoard;


import React, { useState, useEffect } from 'react';
import ChessPiece from './ChessPiece';
import { Color, PieceType } from '../types';

interface BoardProps {
  board: any[][];
  onMove: (from: string, to: string) => void;
  turn: Color;
  legalMoves: any[];
  lastMove?: { from: string, to: string };
  isCheck: boolean;
  playerColor?: Color;
}

const ChessBoard: React.FC<BoardProps> = ({ 
  board, 
  onMove, 
  turn, 
  legalMoves, 
  lastMove, 
  isCheck,
  playerColor = 'w'
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const getSquareName = (row: number, col: number) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return `${files[col]}${ranks[row]}`;
  };

  const handleSquareClick = (row: number, col: number) => {
    const square = getSquareName(row, col);
    
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    // If a piece is already selected, try to move it
    if (selectedSquare) {
      const isLegal = legalMoves.some(m => m.from === selectedSquare && m.to === square);
      if (isLegal) {
        onMove(selectedSquare, square);
        setSelectedSquare(null);
      } else {
        // If clicking another of own pieces, select that instead
        const piece = board[row][col];
        if (piece && piece.color === turn) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      // Select piece if it's player's turn and square has a piece
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
    for (let r = 0; r < 8; r++) {
      const cols = [];
      for (let c = 0; c < 8; c++) {
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
              relative w-full h-full flex items-center justify-center text-2xl
              ${isDark ? 'bg-emerald-200' : 'bg-white'}
              ${isSelected ? 'ring-4 ring-yellow-400 z-10' : ''}
              ${isLastMove ? 'bg-yellow-100' : ''}
              cursor-pointer transition-all duration-200
              hover:opacity-90
            `}
            style={{ aspectRatio: '1/1' }}
          >
            {/* Square Label (Educational) */}
            <span className="absolute bottom-0.5 right-1 text-[10px] text-gray-400 select-none opacity-50">
              {squareName}
            </span>

            {/* Piece */}
            {piece && <ChessPiece type={piece.type} color={piece.color} size={48} />}

            {/* Legal Move Indicator */}
            {isLegalDest && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full ${piece ? 'bg-red-400/50 scale-150 border-2 border-red-500' : 'bg-emerald-500/30'}`} />
              </div>
            )}

            {/* Check Indicator */}
            {isCheck && piece?.type === 'k' && piece?.color === turn && (
              <div className="absolute inset-0 bg-red-500/30 animate-pulse rounded-full" />
            )}
          </div>
        );
      }
      rows.push(<div key={r} className="flex w-full">{cols}</div>);
    }
    return rows;
  };

  return (
    <div className="w-full max-w-[500px] border-8 border-emerald-600 rounded-xl overflow-hidden shadow-2xl bg-emerald-600">
      <div className="flex flex-col">
        {renderBoard()}
      </div>
    </div>
  );
};

export default ChessBoard;

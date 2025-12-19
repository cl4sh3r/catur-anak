
import React from 'react';
import { PieceType, Color } from '../types';

interface ChessPieceProps {
  type: PieceType;
  color: Color;
  size?: number;
}

const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, size = 42 }) => {
  const isWhite = color === 'w';
  
  // Mapping chess pieces to standard symbols
  const pieceMap: Record<PieceType, string> = {
    p: isWhite ? '♙' : '♟',
    r: isWhite ? '♖' : '♜',
    n: isWhite ? '♘' : '♞',
    b: isWhite ? '♗' : '♝',
    q: isWhite ? '♕' : '♛',
    k: isWhite ? '♔' : '♚',
  };

  const colorClass = isWhite ? 'text-blue-500 drop-shadow-sm' : 'text-orange-600 drop-shadow-sm';

  return (
    <div 
      className={`select-none flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-grab active:cursor-grabbing w-full h-full`}
      style={{ 
        fontSize: `${size}px`, 
        lineHeight: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span className={`${colorClass} block`}>{pieceMap[type]}</span>
    </div>
  );
};

export default ChessPiece;

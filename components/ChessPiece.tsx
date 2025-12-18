
import React from 'react';
import { PieceType, Color } from '../types';

interface ChessPieceProps {
  type: PieceType;
  color: Color;
  size?: number;
}

const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, size = 40 }) => {
  const isWhite = color === 'w';
  
  // Mapping chess pieces to cute SVG characters or standard symbols with soft colors
  const pieceMap: Record<PieceType, string> = {
    p: isWhite ? '♙' : '♟',
    r: isWhite ? '♖' : '♜',
    n: isWhite ? '♘' : '♞',
    b: isWhite ? '♗' : '♝',
    q: isWhite ? '♕' : '♛',
    k: isWhite ? '♔' : '♚',
  };

  const colorClass = isWhite ? 'text-blue-500' : 'text-orange-600';

  return (
    <div 
      className={`select-none flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing`}
      style={{ fontSize: `${size}px` }}
    >
      <span className={colorClass}>{pieceMap[type]}</span>
    </div>
  );
};

export default ChessPiece;

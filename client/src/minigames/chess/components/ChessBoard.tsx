import ChessPiece from './ChessPieces';
import { COLOR_BLACK, type Square } from '../constants';

interface ChessBoardProps {
  board: Square[];
  selectedSquare: number | null;
  legalMoves: number[];
  playerColor: number;
  onSquareClick: (square: number) => void;
  disabled?: boolean;
}

export default function ChessBoard({
  board,
  selectedSquare,
  legalMoves,
  playerColor,
  onSquareClick,
  disabled = false,
}: ChessBoardProps) {
  // Flip board if player is black
  const shouldFlip = playerColor === COLOR_BLACK;

  const getSquareColor = (row: number, col: number): string => {
    return (row + col) % 2 === 0 ? '#f5deb3' : '#8b6914'; // Amber tones
  };

  const renderSquare = (visualRow: number, visualCol: number) => {
    // Convert visual position to actual board index
    const actualRow = shouldFlip ? 7 - visualRow : visualRow;
    const actualCol = shouldFlip ? 7 - visualCol : visualCol;
    const squareIndex = actualRow * 8 + actualCol;

    const piece = board[squareIndex];
    const isSelected = selectedSquare === squareIndex;
    const isLegalMove = legalMoves.includes(squareIndex);
    const hasPiece = piece && piece.piece_type !== 0;
    const isCapture = isLegalMove && hasPiece;

    const squareStyle: React.CSSProperties = {
      position: 'relative',
      aspectRatio: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: getSquareColor(actualRow, actualCol),
      cursor: disabled ? 'default' : 'pointer',
      transition: 'all 0.1s',
      outline: isSelected ? '4px solid #facc15 inset' : 'none',
      boxShadow: isSelected ? 'inset 0 0 0 4px #facc15' : 'none',
    };

    const labelColor = (actualRow + actualCol) % 2 === 0 ? '#8b6914' : '#f5deb3';

    return (
      <button
        key={squareIndex}
        onClick={() => !disabled && onSquareClick(squareIndex)}
        disabled={disabled}
        style={squareStyle}
      >
        {/* Piece */}
        {hasPiece && (
          <ChessPiece
            pieceType={piece.piece_type}
            color={piece.color}
            style={{ width: '85%', height: '85%' }}
          />
        )}

        {/* Legal move indicator (dot) */}
        {isLegalMove && !isCapture && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }} />
          </div>
        )}

        {/* Capture indicator (ring) */}
        {isCapture && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '4px solid rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none',
          }} />
        )}

        {/* File labels (bottom row) */}
        {visualRow === 7 && (
          <span style={{
            position: 'absolute',
            bottom: '2px',
            right: '4px',
            fontSize: '10px',
            fontWeight: 500,
            color: labelColor,
          }}>
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}

        {/* Rank labels (left column) */}
        {visualCol === 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            left: '4px',
            fontSize: '10px',
            fontWeight: 500,
            color: labelColor,
          }}>
            {8 - actualRow}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '400px',
      aspectRatio: '1',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        width: '100%',
        height: '100%',
        border: '2px solid #78350f',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      }}>
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => renderSquare(row, col))
        )}
      </div>
    </div>
  );
}

import ChessPiece from './ChessPieces';
import { COLOR_WHITE, COLOR_BLACK, PIECE_PAWN, PIECE_KNIGHT, PIECE_BISHOP, PIECE_ROOK, PIECE_QUEEN } from '../constants';

interface CapturedPiecesProps {
  capturedByWhite: number[]; // Pieces captured BY white (black pieces)
  capturedByBlack: number[]; // Pieces captured BY black (white pieces)
  orientation: 'vertical' | 'horizontal';
}

// Piece values for sorting
const PIECE_VALUES: Record<number, number> = {
  [PIECE_PAWN]: 1,
  [PIECE_KNIGHT]: 3,
  [PIECE_BISHOP]: 3,
  [PIECE_ROOK]: 5,
  [PIECE_QUEEN]: 9,
};

function sortPieces(pieces: number[]): number[] {
  return [...pieces].sort((a, b) => (PIECE_VALUES[b] || 0) - (PIECE_VALUES[a] || 0));
}

function calculateMaterialDiff(capturedByWhite: number[], capturedByBlack: number[]): number {
  const whiteMaterial = capturedByWhite.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
  const blackMaterial = capturedByBlack.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
  return whiteMaterial - blackMaterial; // Positive = white ahead
}

export default function CapturedPieces({
  capturedByWhite,
  capturedByBlack,
  orientation,
}: CapturedPiecesProps) {
  const sortedWhiteCaptures = sortPieces(capturedByWhite);
  const sortedBlackCaptures = sortPieces(capturedByBlack);
  const materialDiff = calculateMaterialDiff(capturedByWhite, capturedByBlack);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'vertical' ? 'column' : 'row',
    gap: '16px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
  };

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  };

  const piecesRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px',
    justifyContent: 'center',
    maxWidth: orientation === 'vertical' ? '60px' : '200px',
  };

  const pieceStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
  };

  const diffStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 'bold',
    color: materialDiff > 0 ? '#22c55e' : materialDiff < 0 ? '#ef4444' : '#9ca3af',
    textAlign: 'center',
    marginTop: '8px',
  };

  return (
    <div style={containerStyle}>
      {/* Pieces captured by white (black pieces) */}
      <div style={sectionStyle}>
        <div style={piecesRowStyle}>
          {sortedWhiteCaptures.map((pieceType, index) => (
            <div key={`w-${index}`} style={pieceStyle}>
              <ChessPiece
                pieceType={pieceType}
                color={COLOR_BLACK}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pieces captured by black (white pieces) */}
      <div style={sectionStyle}>
        <div style={piecesRowStyle}>
          {sortedBlackCaptures.map((pieceType, index) => (
            <div key={`b-${index}`} style={pieceStyle}>
              <ChessPiece
                pieceType={pieceType}
                color={COLOR_WHITE}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Material difference */}
      {materialDiff !== 0 && (
        <div style={diffStyle}>
          {materialDiff > 0 ? '+' : ''}{materialDiff}
        </div>
      )}
    </div>
  );
}

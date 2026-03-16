import { PIECE_QUEEN, PIECE_ROOK, PIECE_BISHOP, PIECE_KNIGHT } from '../constants';
import ChessPiece from './ChessPieces';

interface PromotionModalProps {
  playerColor: number;
  onSelect: (pieceType: number) => void;
  onCancel: () => void;
}

export default function PromotionModal({ playerColor, onSelect, onCancel }: PromotionModalProps) {
  const pieces = [PIECE_QUEEN, PIECE_ROOK, PIECE_BISHOP, PIECE_KNIGHT];

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#1f2937',
    padding: '24px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  };

  const titleStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
  };

  const piecesContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '16px',
  };

  const pieceButtonStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    padding: '8px',
    borderRadius: '12px',
    backgroundColor: '#374151',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  const cancelButtonStyle: React.CSSProperties = {
    padding: '8px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4b5563',
    color: '#9ca3af',
    fontSize: '14px',
    cursor: 'pointer',
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>Choose promotion piece</h2>
        <div style={piecesContainerStyle}>
          {pieces.map((pieceType) => (
            <button
              key={pieceType}
              onClick={() => onSelect(pieceType)}
              style={pieceButtonStyle}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChessPiece
                pieceType={pieceType}
                color={playerColor}
                style={{ width: '100%', height: '100%' }}
              />
            </button>
          ))}
        </div>
        <button style={cancelButtonStyle} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

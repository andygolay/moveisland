import {
  COLOR_WHITE,
  COLOR_BLACK,
  isWhiteWin,
  isBlackWin,
  isDraw,
  getResultReason,
} from '../constants';

interface GameOverModalProps {
  status: number;
  playerColor: number | null;
  onClose: () => void;
  whiteRating?: number;
  blackRating?: number;
  ratingChange?: number;
}

export default function GameOverModal({
  status,
  playerColor,
  onClose,
  whiteRating,
  blackRating,
  ratingChange,
}: GameOverModalProps) {
  const whiteWins = isWhiteWin(status);
  const blackWins = isBlackWin(status);
  const draw = isDraw(status);

  let resultText = '';
  let resultColor = '#9ca3af'; // Gray for draw

  if (draw) {
    resultText = 'Draw';
    resultColor = '#9ca3af';
  } else if (playerColor === COLOR_WHITE) {
    resultText = whiteWins ? 'You Win!' : 'You Lose';
    resultColor = whiteWins ? '#22c55e' : '#ef4444';
  } else if (playerColor === COLOR_BLACK) {
    resultText = blackWins ? 'You Win!' : 'You Lose';
    resultColor = blackWins ? '#22c55e' : '#ef4444';
  } else {
    // Spectator
    resultText = whiteWins ? 'White Wins' : blackWins ? 'Black Wins' : 'Draw';
    resultColor = '#9ca3af';
  }

  const reason = getResultReason(status);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#1f2937',
    padding: '32px 48px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    minWidth: '280px',
  };

  const resultStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: resultColor,
    marginBottom: '8px',
  };

  const reasonStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#9ca3af',
    marginBottom: '24px',
  };

  const ratingContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    marginBottom: '24px',
  };

  const ratingBoxStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  const ratingLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  };

  const ratingValueStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
  };

  const ratingChangeStyle: React.CSSProperties = {
    fontSize: '14px',
    color: ratingChange && ratingChange > 0 ? '#22c55e' : ratingChange && ratingChange < 0 ? '#ef4444' : '#9ca3af',
    marginTop: '4px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#C9A227',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.1s',
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={resultStyle}>{resultText}</div>
        {reason && <div style={reasonStyle}>{reason}</div>}

        {(whiteRating || blackRating) && (
          <div style={ratingContainerStyle}>
            {whiteRating && (
              <div style={ratingBoxStyle}>
                <div style={ratingLabelStyle}>White Rating</div>
                <div style={ratingValueStyle}>{whiteRating}</div>
              </div>
            )}
            {blackRating && (
              <div style={ratingBoxStyle}>
                <div style={ratingLabelStyle}>Black Rating</div>
                <div style={ratingValueStyle}>{blackRating}</div>
              </div>
            )}
          </div>
        )}

        {ratingChange !== undefined && playerColor && (
          <div style={ratingChangeStyle}>
            Rating: {ratingChange > 0 ? '+' : ''}{ratingChange}
          </div>
        )}

        <button
          style={buttonStyle}
          onClick={onClose}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Return to World
        </button>
      </div>
    </div>
  );
}

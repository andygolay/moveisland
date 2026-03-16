import { TIME_CONTROLS } from '../constants';

interface TimeControlSelectorProps {
  onSelect: (baseSeconds: number, incrementSeconds: number) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function TimeControlSelector({
  onSelect,
  onCancel,
  disabled = false,
}: TimeControlSelectorProps) {
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
    minWidth: '280px',
  };

  const titleStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px',
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '14px',
    marginBottom: '20px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#374151',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled ? 0.6 : 1,
  };

  const cancelButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>Select Time Control</h2>
        <p style={subtitleStyle}>Choose how much time each player gets</p>

        <div style={gridStyle}>
          {TIME_CONTROLS.map((tc) => (
            <button
              key={tc.label}
              onClick={() => !disabled && onSelect(tc.base, tc.increment)}
              disabled={disabled}
              style={buttonStyle}
              onMouseOver={(e) => {
                if (!disabled) {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {tc.label}
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

import { useState, useEffect } from 'react';
import { formatTime } from '../constants';

interface GameTimerProps {
  timeMs: number;
  isActive: boolean;
  lastMoveTimestamp: number;
}

export default function GameTimer({ timeMs, isActive, lastMoveTimestamp }: GameTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeMs);

  useEffect(() => {
    if (!isActive) {
      setDisplayTime(timeMs);
      return;
    }

    // Update every 100ms for smooth countdown
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastMoveTimestamp;
      const remaining = Math.max(0, timeMs - elapsed);
      setDisplayTime(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [timeMs, isActive, lastMoveTimestamp]);

  // Determine color based on time remaining
  const totalSeconds = Math.floor(displayTime / 1000);
  let backgroundColor = '#22c55e'; // Green - normal
  let textColor = '#fff';
  let animation = '';

  if (totalSeconds <= 10) {
    backgroundColor = '#ef4444'; // Red - critical
    animation = isActive ? 'pulse 1s infinite' : '';
  } else if (totalSeconds <= 30) {
    backgroundColor = '#f97316'; // Orange - low time
  }

  if (!isActive) {
    backgroundColor = '#6b7280'; // Gray - inactive
  }

  const timerStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '20px',
    fontWeight: 'bold',
    backgroundColor,
    color: textColor,
    minWidth: '80px',
    textAlign: 'center',
    animation,
  };

  return (
    <div style={timerStyle}>
      {formatTime(displayTime)}
    </div>
  );
}

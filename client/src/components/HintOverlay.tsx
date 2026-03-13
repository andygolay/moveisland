import { useEffect } from 'react';
import { useHintStore, hints } from '../stores/hintStore';
import './HintOverlay.css';

export function HintOverlay() {
  const currentHint = useHintStore((state) => state.currentHint);
  const dismissHint = useHintStore((state) => state.dismissHint);

  // Show initial hint when component mounts
  useEffect(() => {
    // Small delay so player can see the world first
    const timer = setTimeout(() => {
      hints.shiftToRun();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!currentHint) return null;

  return (
    <div className="hint-overlay" onClick={dismissHint}>
      <div className="hint-card">
        {currentHint.icon && <span className="hint-icon">{currentHint.icon}</span>}
        <span className="hint-message">{currentHint.message}</span>
        {!currentHint.duration && (
          <span className="hint-dismiss">Click to dismiss</span>
        )}
      </div>
    </div>
  );
}

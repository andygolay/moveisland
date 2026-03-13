import { create } from 'zustand';

export interface Hint {
  id: string;
  message: string;
  duration?: number; // ms, undefined = manual dismiss
  icon?: string; // optional icon/emoji
}

interface HintState {
  currentHint: Hint | null;
  hintQueue: Hint[];

  // Show a hint (queues if one is already showing)
  showHint: (hint: Hint) => void;

  // Dismiss current hint
  dismissHint: () => void;

  // Clear all hints
  clearHints: () => void;
}

export const useHintStore = create<HintState>((set, get) => ({
  currentHint: null,
  hintQueue: [],

  showHint: (hint) => {
    const { currentHint, hintQueue } = get();

    if (!currentHint) {
      // No hint showing, display immediately
      set({ currentHint: hint });

      // Auto-dismiss after duration if specified
      if (hint.duration) {
        setTimeout(() => {
          const current = get().currentHint;
          if (current?.id === hint.id) {
            get().dismissHint();
          }
        }, hint.duration);
      }
    } else {
      // Queue the hint
      set({ hintQueue: [...hintQueue, hint] });
    }
  },

  dismissHint: () => {
    const { hintQueue } = get();

    if (hintQueue.length > 0) {
      // Show next hint in queue
      const [nextHint, ...remainingQueue] = hintQueue;
      set({ currentHint: nextHint, hintQueue: remainingQueue });

      // Auto-dismiss if has duration
      if (nextHint.duration) {
        setTimeout(() => {
          const current = get().currentHint;
          if (current?.id === nextHint.id) {
            get().dismissHint();
          }
        }, nextHint.duration);
      }
    } else {
      set({ currentHint: null });
    }
  },

  clearHints: () => {
    set({ currentHint: null, hintQueue: [] });
  },
}));

// Helper to show common hints
export const hints = {
  shiftToRun: () =>
    useHintStore.getState().showHint({
      id: 'shift-to-run',
      message: 'Hold Shift to Run',
      icon: '🏃',
      duration: 4000,
    }),

  nearGame: (gameName: string) =>
    useHintStore.getState().showHint({
      id: `near-game-${gameName}`,
      message: `Press E to play ${gameName}`,
      icon: '🎮',
    }),

  nearPlayer: (playerName: string) =>
    useHintStore.getState().showHint({
      id: `near-player-${playerName}`,
      message: `Press E to interact with ${playerName}`,
      icon: '👋',
    }),
};

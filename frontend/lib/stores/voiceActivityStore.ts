import { create } from "zustand";

export type VoiceActivityState = {
  levels: Record<string, number>;
};

export type VoiceActivityActions = {
  setLevel: (userId: string, level: number) => void;
  removeLevel: (userId: string) => void;
  clearLevels: () => void;
};

export const useVoiceActivityStore = create<
  VoiceActivityState & VoiceActivityActions
>((set) => ({
  levels: {},
  setLevel: (userId, level) =>
    set((state) => ({
      levels: {
        ...state.levels,
        [userId]: Math.max(0, Math.min(level, 1)),
      },
    })),
  removeLevel: (userId) =>
    set((state) => {
      if (!state.levels[userId]) {
        return state;
      }

      const nextLevels = { ...state.levels };
      delete nextLevels[userId];
      return { levels: nextLevels };
    }),
  clearLevels: () => set({ levels: {} }),
}));

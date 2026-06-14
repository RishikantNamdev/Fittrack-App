export type RepCounterState = {
  reps: number;
};

export function useRepCounter(): RepCounterState {
  return {
    reps: 0,
  };
}

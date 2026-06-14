export type PoseTriggerState = {
  isAboveThreshold: boolean;
  isBelowThreshold: boolean;
};

export function usePoseTriggers(): PoseTriggerState {
  return {
    isAboveThreshold: false,
    isBelowThreshold: false,
  };
}

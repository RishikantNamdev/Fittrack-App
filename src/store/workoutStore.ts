export type WorkoutStore = {
  currentSets: number;
  targetReps: number;
  currentScore: number;
};

export const workoutStore: WorkoutStore = {
  currentSets: 0,
  targetReps: 0,
  currentScore: 0,
};

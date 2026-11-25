export type WorkoutStatus = "draft" | "completed";
export type WorkoutUnit = "kg" | "lb";

export interface WorkoutSummary {
  id: string;
  workoutDate: string;
  focus: string;
  unit: WorkoutUnit;
  status: WorkoutStatus;
  completedAt: string | null;
  setCount: number;
}

export interface CompletedWorkoutPage {
  items: WorkoutSummary[];
  nextCursor: string | null;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  position: number;
  setNumber: number;
  weight: string;
  reps: number;
}

export interface LastTime {
  workoutId: string;
  workoutDate: string;
  unit: WorkoutUnit;
  sets: WorkoutSet[];
}

export interface WorkoutExerciseGroup {
  exerciseId: string;
  name: string;
  position: number;
  sets: WorkoutSet[];
  lastTime: LastTime | null;
}

export interface WorkoutActivity {
  activeDates: string[];
}

export interface WorkoutDetail extends WorkoutSummary {
  exercises: WorkoutExerciseGroup[];
}

export interface ExerciseOption {
  id: string;
  name: string;
  equipment: string | null;
}

export interface SaveSetInput {
  id: string;
  exerciseId: string;
  weight: string;
  reps: string;
}

export type SaveState = "idle" | "saving" | "saved" | "failed";

export interface TrainingPreferences {
  repMin: number;
  repMax: number;
  unit: WorkoutUnit;
  weightStep: string; // decimal string, like set weight
}

export type ProgressionStatus = "ready" | "building" | "below" | "stalled";

export interface ExerciseProgression {
  exerciseId: string;
  name: string;
  unit: WorkoutUnit; // unit of the latest session
  lastDate: string; // YYYY-MM-DD
  workingWeight: string;
  reps: number[]; // latest session, in set order
  progress: number; // 0..1
  status: ProgressionStatus;
  suggestedWeight: string | null;
  weightHistory: { date: string; weight: string }[];
}

export interface WorkoutProgression {
  preferences: TrainingPreferences;
  items: ExerciseProgression[];
}

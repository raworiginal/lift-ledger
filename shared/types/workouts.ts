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

ALTER TABLE "workout_sets" DROP CONSTRAINT "workout_sets_workout_exercise_fk";
--> statement-breakpoint
ALTER TABLE "workouts" ALTER COLUMN "focus" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_exercise_fk" FOREIGN KEY ("workout_id","exercise_id") REFERENCES "public"."workout_exercises"("workout_id","exercise_id") ON DELETE restrict ON UPDATE no action;
CREATE TYPE "public"."workout_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"workout_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "workout_exercises_pk" PRIMARY KEY("workout_id","exercise_id")
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"weight" numeric(6, 2) NOT NULL,
	"reps" integer NOT NULL,
	CONSTRAINT "workout_sets_workout_position_unique" UNIQUE("workout_id","position"),
	CONSTRAINT "workout_sets_weight_check" CHECK ("workout_sets"."weight" >= 0),
	CONSTRAINT "workout_sets_reps_check" CHECK ("workout_sets"."reps" > 0 and "workout_sets"."reps" <= 100)
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workout_date" date NOT NULL,
	"focus" text NOT NULL,
	"unit" "workout_unit" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_exercise_fk" FOREIGN KEY ("workout_id","exercise_id") REFERENCES "public"."workout_exercises"("workout_id","exercise_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workouts_one_draft_per_user" ON "workouts" USING btree ("user_id") WHERE "workouts"."completed_at" is null;
CREATE TABLE "exercise_muscles" (
	"exercise_id" text NOT NULL,
	"muscle_id" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "exercise_muscles_pk" PRIMARY KEY("exercise_id","muscle_id"),
	CONSTRAINT "exercise_muscles_role_check" CHECK ("exercise_muscles"."role" in ('primary', 'secondary'))
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_de" text NOT NULL,
	"name_es" text NOT NULL,
	"description_en" text NOT NULL,
	"description_de" text NOT NULL,
	"description_es" text NOT NULL,
	"category" text NOT NULL,
	"force_type" text NOT NULL,
	"mechanic" text NOT NULL,
	"difficulty" text NOT NULL,
	"body_part" text NOT NULL,
	"equipment" text,
	"variation_group" text,
	"goals" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_unilateral" boolean NOT NULL,
	"is_bodyweight" boolean NOT NULL,
	"met" real NOT NULL,
	"instructions" jsonb NOT NULL,
	"tips" jsonb NOT NULL,
	"images" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muscles" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"image_path" text
);
--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_id_muscles_id_fk" FOREIGN KEY ("muscle_id") REFERENCES "public"."muscles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_muscles_muscle_role_idx" ON "exercise_muscles" USING btree ("muscle_id","role","exercise_id");--> statement-breakpoint
CREATE INDEX "exercises_category_idx" ON "exercises" USING btree ("category");--> statement-breakpoint
CREATE INDEX "exercises_force_type_idx" ON "exercises" USING btree ("force_type");--> statement-breakpoint
CREATE INDEX "exercises_mechanic_idx" ON "exercises" USING btree ("mechanic");
CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`equipment` text NOT NULL,
	`movement_pattern` text,
	`is_active` integer DEFAULT true NOT NULL,
	CONSTRAINT "exercises_movement_pattern_chk" CHECK("exercises"."movement_pattern" IS NULL OR "exercises"."movement_pattern" IN ('vertical_pull', 'horizontal_pull', 'vertical_push', 'horizontal_push', 'squat', 'hinge', 'carry', 'rotation', 'anti_rotation', 'elbow_flexion', 'elbow_extension', 'knee_flexion', 'knee_extension', 'calf_raise', 'shoulder_abduction'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_name_equipment_uidx` ON `exercises` ("name" COLLATE NOCASE,`equipment`);--> statement-breakpoint
CREATE TABLE `routine_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`routine_id` integer NOT NULL,
	`position` integer NOT NULL,
	`movement_pattern` text,
	`exercise_id` integer,
	`target` text,
	`notes` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "routine_items_position_chk" CHECK("routine_items"."position" >= 0),
	CONSTRAINT "routine_items_slot_chk" CHECK(("routine_items"."movement_pattern" IS NULL) <> ("routine_items"."exercise_id" IS NULL)),
	CONSTRAINT "routine_items_movement_pattern_chk" CHECK("routine_items"."movement_pattern" IS NULL OR "routine_items"."movement_pattern" IN ('vertical_pull', 'horizontal_pull', 'vertical_push', 'horizontal_push', 'squat', 'hinge', 'carry', 'rotation', 'anti_rotation', 'elbow_flexion', 'elbow_extension', 'knee_flexion', 'knee_extension', 'calf_raise', 'shoulder_abduction'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_items_routine_position_uidx` ON `routine_items` (`routine_id`,`position`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routines_user_name_uidx` ON `routines` (`user_id`,"name" COLLATE NOCASE);--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` integer PRIMARY KEY NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`position` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "workout_exercises_position_chk" CHECK("workout_exercises"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_exercises_workout_position_uidx` ON `workout_exercises` (`workout_id`,`position`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` integer PRIMARY KEY NOT NULL,
	`workout_exercise_id` integer NOT NULL,
	`position` integer NOT NULL,
	`reps` integer NOT NULL,
	`load` real,
	`side` text,
	`rir` integer,
	`notes` text,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workout_sets_position_chk" CHECK("workout_sets"."position" >= 0),
	CONSTRAINT "workout_sets_reps_chk" CHECK("workout_sets"."reps" > 0),
	CONSTRAINT "workout_sets_side_chk" CHECK("workout_sets"."side" IS NULL OR "workout_sets"."side" IN ('left', 'right')),
	CONSTRAINT "workout_sets_rir_chk" CHECK("workout_sets"."rir" IS NULL OR "workout_sets"."rir" BETWEEN 0 AND 10)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_sets_exercise_position_uidx` ON `workout_sets` (`workout_exercise_id`,`position`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`routine_id` integer,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "workouts_completed_chk" CHECK("workouts"."completed_at" IS NULL OR "workouts"."completed_at" >= "workouts"."started_at")
);
--> statement-breakpoint
CREATE INDEX `workouts_user_started_idx` ON `workouts` (`user_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `user` ADD `weightUnit` text DEFAULT 'kg' NOT NULL;
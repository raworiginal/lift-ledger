CREATE TABLE "training_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"rep_min" integer DEFAULT 8 NOT NULL,
	"rep_max" integer DEFAULT 12 NOT NULL,
	"unit" "workout_unit" DEFAULT 'lb' NOT NULL,
	"weight_step" numeric(5, 2) DEFAULT '5' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_preferences_rep_range_check" CHECK ("training_preferences"."rep_min" >= 1 and "training_preferences"."rep_min" < "training_preferences"."rep_max" and "training_preferences"."rep_max" <= 100),
	CONSTRAINT "training_preferences_weight_step_check" CHECK ("training_preferences"."weight_step" > 0)
);
--> statement-breakpoint
ALTER TABLE "training_preferences" ADD CONSTRAINT "training_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
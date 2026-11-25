ALTER TABLE "workout_sets" DROP CONSTRAINT "workout_sets_weight_check";--> statement-breakpoint
UPDATE "workout_sets" ws SET "weight" = -ws."weight" FROM "exercises" e WHERE e."id" = ws."exercise_id" AND e."name_en" ~* '\massisted\M' AND ws."weight" > 0;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_weight_check" CHECK ("workout_sets"."weight" >= -9999.99 and "workout_sets"."weight" <= 9999.99);

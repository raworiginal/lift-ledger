# Database Plan

This is a full-stack nuxt application. This app will be deployed self-hosted in a docker container. The database will be sqlite. The ORM will be drizzle through the nuxthub module.

## Movement Patterns

This is how the exercises will be organized to make routines. So instead of a routine being a list of exercises like:

- Pull-up
- Bench Press
- Seated Row
- Shoulder Press

The routine would be:

- Vertical Pull
- Horizontal Push
- Horizontal Pull
- Vertical Push

The question for this is how to handle isolation exercises? Technically isolation is not a movement pattern. However, for the sake of minimalism and simplicity it does make sense to put exercises like bicep curls and leg extensions in their own category. That way the movement patterns would be:

- Vertical Pull
- Horizontal Pull
- Vertical Push
- Horizontal Push
- Squat
- Hinge
- Carry
- Rotation/Anti-Rotation
- Isolation

## Muscles

This I see a table that will connect data like the body region (upper, lower, core), exercises, and movement patterns.

## Exercises

These are the specific exercises that will be recorded in sessions and sets. So when a user is at the gym and they are following a routine. They can select a specific exercise for fulfill a movement pattern in their routine. For example, the routine calls for a vertical pull, so the user can select a pull-up or a lat pulldown. The exercises will also be specific about the type of resistance or weight (barbell, dumbbell, cable, machine, bodyweight)

## Routines

These are the planned and repeatable sequences of movement patterns. I imagine a user might have a upper body routine or push routine. The user can create them and use them for sessions.

## Sessions

A session is the record of the specific exercises and sets that the user completed during the workout.

## Sets

Sets are the weight and reps of an exercise during a session.

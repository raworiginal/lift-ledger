# Lift Ledger

Lift Ledger tracks progress and consistency in weight-lifting sessions. This glossary defines the terms used across the app, its data, and its UI.

## Training

**Workout**:
A training session recorded on a specific calendar date. A workout is either a draft or completed.
_Avoid_: Session (reserved for login sessions), routine, training day

**Draft**:
A workout that has not been finished. A user can have at most one draft at a time.
_Avoid_: In-progress workout, pending workout

**Completed workout**:
A workout the user has finished. Completed workouts appear in history and count toward the heatmap.
_Avoid_: Finished workout, past workout

**Exercise group**:
One catalog exercise inside a workout, together with the sets logged for it.
_Avoid_: Exercise entry, exercise line

**Set**:
One logged weight and rep count for an exercise group.
_Avoid_: Rep (a rep is one repetition within a set), entry

**Focus**:
A short free-text label for what a workout targets, such as "Push" or "Legs".
_Avoid_: Category, tag, muscle group

**Unit**:
The unit of weight for a workout, either kg or lb. It can't change once the workout has sets.
_Avoid_: System, measurement

## Exercises

**Catalog**:
The shared list of exercises available to every user. Users pick exercises from it but don't edit it.
_Avoid_: Library, exercise list, database

**Last time**:
The most recent completed workout that contains a given exercise, and the sets logged in it. Drafts never count.
_Avoid_: Previous, history, last session

## Progress

**Active day**:
A calendar day on which the user has at least one completed workout, judged by the workout date rather than when it was finished.
_Avoid_: Streak day, training day

**Heatmap**:
A grid of the last 52 weeks, with weeks starting on Monday, showing each day as active (filled) or inactive (empty). Each cell is binary: it does not show how many workouts happened that day.
_Avoid_: Calendar, activity chart

**Rep range**:
The user's target band of reps per set, from a minimum to a maximum. Applies to every exercise. Defaults to 8 to 12.
_Avoid_: Rep goal, target reps

**Working weight**:
The heaviest weight logged for an exercise in one completed workout.
_Avoid_: Top set, max weight, one-rep max

**Weight step**:
The amount the working weight goes up when the user is ready to progress, in the main unit. Defaults to 5.
_Avoid_: Increment, jump, plate size

**Main unit**:
The unit the user trains in by default, either kg or lb. It sets the default unit for new workouts and the unit that suggested weights use.
_Avoid_: Preferred unit, default unit

**Progression status**:
Whether an exercise is ready to add weight, should add reps at the same weight, is below the rep range, or has stalled. Computed from the latest session and the user's current rep range, never stored.
_Avoid_: Level, grade, score

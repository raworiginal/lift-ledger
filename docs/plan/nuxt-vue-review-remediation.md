# Nuxt and Vue Review Remediation Plan

## Goal

Correct the async-state issues identified in the codebase review, improve container/presentational boundaries, and strengthen Nuxt data fetching and automated checks.

Fix correctness first, then refactor boundaries and framework integration. Preserve existing functionality and unrelated uncommitted changes.

## 1. Establish regression coverage

Add Vitest and `@nuxt/test-utils` for component and composable tests. Keep the existing Node tests unchanged.

Cover:

- Concurrent saves across exercises.
- Retry identity after failed requests.
- Out-of-order workout refreshes.
- Metadata-save failures preserving input.
- Overlapping alternatives requests.
- Picker loading, empty, error, and retry states.

Use deferred promises and fake timers rather than timing-dependent tests.

**Acceptance:** Tests reproduce the reported failures before their corresponding fixes and pass afterward.

## 2. Fix workout mutation state

### Primary files

- `app/composables/workouts/useWorkoutEditor.ts`
- `app/pages/app/workouts/[id].vue`
- `app/components/workouts/presentational/SetEntryForm.vue`

### Changes

- Replace the single save tracker with per-exercise save state and retry records.
- Preserve each operation's ID when retrying unchanged input.
- Prevent duplicate submissions for the same exercise.
- Derive workout-wide busy state from all active mutations.
- Block finish/discard and conflicting actions while relevant mutations remain pending.
- Prevent a completed request from clearing another operation's state.
- Preserve edits entered while a request is pending rather than overwriting them during prefill updates.

**Acceptance:** Finishing save A cannot mark pending save B as complete or discard its retry identity.

## 3. Make workout reads race-safe

### Primary file

- `app/composables/workouts/useWorkoutEditor.ts`

### Changes

- Add latest-request protection and cancellation where appropriate.
- Coordinate mutation-triggered refreshes to avoid redundant requests.
- Distinguish mutation failure from a successful mutation followed by a failed refresh.
- Keep existing data visible with an explicit refresh-error/retry state.
- Cancel pending reads when their owning scope is disposed.

**Acceptance:** Older responses never replace newer detail, and refresh failures do not encourage repeating a successful mutation.

## 4. Correct form and search feedback

### Metadata editing

Files:

- `app/components/workouts/presentational/WorkoutHeader.vue`
- `app/pages/app/workouts/[id].vue`

Changes:

- Keep the form's draft state local.
- Pass explicit pending, error, and success signals from the persistence owner.
- Close only after a successful save.
- Preserve entered values after failure.
- Prevent duplicate submissions.

### Alternatives

File:

- `app/pages/app/exercises.vue`

Changes:

- Track pending requests by exercise ID.
- Deduplicate requests for the same exercise.
- Preserve independent cached results and errors.
- Clean up outstanding requests on disposal.

### Exercise picker

Files:

- `app/components/workouts/presentational/ExercisePicker.vue`
- `app/composables/workouts/useWorkoutEditor.ts`
- The focused exercise-search composable introduced in phase 5.

Changes:

- Separate loading, empty, and failed states.
- Add an explicit retry action.
- Cancel superseded searches and pending debounce work.
- Ensure stale results cannot silently represent a failed current search.

**Acceptance:** Failed saves preserve drafts, each alternatives request has independent feedback, and picker failures are distinguishable from empty results.

## 5. Refine container/presentational boundaries

Make focused extractions, not a project-wide rewrite.

| Area | Planned responsibility |
| --- | --- |
| Workout editor | Coordinate detail and mutation workflows |
| Exercise-search composable | Debouncing, cancellation, results, and errors |
| Workout forms | Local input, validation, and explicit submit events |
| Account settings sections | Separate sign-in methods, sessions, and deletion UI |
| Account settings workflows | Focused loading/actions behind those sections |
| Admin user actions | Render capabilities supplied through props |

### Changes

- Extract catalog search from `app/composables/workouts/useWorkoutEditor.ts`.
- Split `layers/auth/app/components/auth/presentational/AccountSettings.vue` into cohesive sections with local confirmation state.
- Separate corresponding workflows in `layers/auth/app/composables/auth/useAccountSettings.ts` without introducing a universal controller.
- Replace `layers/auth/app/components/admin/presentational/AdminUserActions.vue`'s runtime-config dependency with an explicit capability prop.
- Consolidate duplicated account/session types.
- Expose readonly workflow state where callers should use actions.
- Preserve appropriate local UI state instead of forcing every component to be stateless.
- Avoid container wrappers that only forward props and events without hiding meaningful complexity.

**Acceptance:** Each extracted unit owns a cohesive responsibility, persistence stays outside presentational components, and representative UI changes do not require unrelated forwarding edits.

## 6. Adopt intentional Nuxt data fetching

### Primary files

- Workout composables in `app/composables/workouts/`.
- Their consuming pages in `app/pages/app/`.

### Changes

- Move browser-independent initial reads—history, detail, and current draft—to Nuxt async-data APIs.
- Use authenticated, request-scoped fetching so SSR forwards session context.
- Define stable, appropriately scoped keys and cache invalidation.
- Retain client-side initialization for activity's device-local date.
- Render distinct idle, loading, error, and empty states.
- Check direct loads, client navigation, and authentication transitions for stale data or duplicate fetching.

This is not a blanket requirement to SSR every request.

**Acceptance:** Browser-independent reads use intentional Nuxt data lifecycles, authenticated SSR works, and device-local activity behavior remains correct.

## 7. Add correctness linting and CI coverage

### Files

- `package.json`
- `nuxt.config.ts`
- New ESLint configuration.
- `.github/workflows/quality.yml`
- Dependency lockfile and test configuration as required.

### Changes

- Configure `@nuxt/eslint` for Vue, TypeScript, and Nuxt.
- Keep Prettier responsible for formatting.
- Separate `lint` from `format:check`.
- Cover app, auth layer, server, shared code, and tests.
- Add the new frontend tests and formatting check to CI.
- Avoid unrelated formatting churn.

**Acceptance:** CI checks code correctness and formatting separately and runs both existing tests and the new frontend regression suite.

## 8. Final verification

Run:

- Existing unit tests.
- New component/composable regression tests.
- Applicable database integration tests against an isolated test database.
- ESLint.
- Formatting checks.
- Full Nuxt typecheck.
- Production build.

Perform browser checks for:

- Concurrent saves and retries.
- Finishing/discarding while mutations are pending.
- Metadata failures and retained input.
- Picker failures and retry behavior.
- Rapid alternatives switching.
- Account settings actions and confirmations.
- Direct authenticated loads and client navigation.

## Completion criteria

- All reported races have regression tests.
- Failed operations preserve user input.
- Presentational components have explicit dependencies.
- Async workflows have clear state ownership and cleanup.
- Nuxt reads preserve authentication and intended date behavior.
- Existing functionality remains intact.
- Automated checks pass, with any unavailable verification explicitly documented.

## Documentation baseline

- Available skills: `vue-best-practices`, `container-presentational`, `nuxt-ui`, `nuxt-better-auth`, and `nuxthub`.
- [Nuxt data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)
- [Vue props](https://vuejs.org/guide/components/props.html)
- [Vue composables](https://vuejs.org/guide/reusability/composables.html)
- [Nuxt Test Utils](https://github.com/nuxt/test-utils)
- [Nuxt ESLint](https://eslint.nuxt.com/)

Confirm dependency compatibility and current APIs when implementing tooling changes.

import { effectScope } from "vue";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useWorkoutEditor } from "~/composables/workouts/useWorkoutEditor";
import type { WorkoutDetail } from "~~/shared/types/workouts";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

const api = vi.fn();

function fakeAsyncData(
  _key: string,
  handler: (
    nuxtApp: unknown,
    context: { signal: AbortSignal },
  ) => Promise<unknown>,
  options: { default?: () => unknown } = {},
) {
  const data = ref(options.default ? options.default() : undefined);
  const status = ref<"idle" | "pending" | "success" | "error">("idle");
  const error = ref<unknown>(undefined);
  async function refresh() {
    const current = new AbortController();
    status.value = "pending";
    try {
      const value = await handler(undefined, { signal: current.signal });
      data.value = value;
      error.value = undefined;
      status.value = "success";
    } catch (failure) {
      error.value = failure;
      data.value = options.default ? options.default() : undefined;
      status.value = "error";
    }
  }
  void refresh();
  return { data, status, error, refresh, clear: () => {} };
}

mockNuxtImport("useAsyncData", () => fakeAsyncData);
mockNuxtImport("useRequestFetch", () => () => api);
mockNuxtImport(
  "$fetch",
  () =>
    (...args: unknown[]) =>
      api(...args),
);
mockNuxtImport("useUserSession", () => () => ({ user: ref({ id: "u1" }) }));

function workout(overrides: Partial<WorkoutDetail> = {}): WorkoutDetail {
  return {
    id: "w1",
    workoutDate: "2026-11-20",
    focus: "Push",
    unit: "lb",
    status: "draft",
    completedAt: null,
    setCount: 0,
    exercises: [
      {
        exerciseId: "ex-a",
        name: "Bench",
        position: 1,
        sets: [],
        lastTime: null,
      },
      {
        exerciseId: "ex-b",
        name: "Row",
        position: 2,
        sets: [],
        lastTime: null,
      },
    ],
    ...overrides,
  };
}

const failure = (statusMessage: string, statusCode = 500) => ({
  statusCode,
  data: { statusMessage },
});

describe("useWorkoutEditor", () => {
  let scope: ReturnType<typeof effectScope>;

  beforeEach(() => {
    api.mockReset();
    api.mockResolvedValue(workout());
    scope = effectScope();
  });

  function mountEditor() {
    return scope.run(() => useWorkoutEditor("w1"))!;
  }

  function postsToSets() {
    return api.mock.calls.filter(
      ([url, options]) =>
        String(url).endsWith("/sets") && options?.method === "POST",
    );
  }

  it("keeps save state independent per exercise", async () => {
    const editor = mountEditor();
    await flushPromises();
    const posts: Deferred<unknown>[] = [];
    api.mockImplementation((url: string, options?: { method?: string }) => {
      if (String(url).endsWith("/sets") && options?.method === "POST") {
        const post = deferred<unknown>();
        posts.push(post);
        return post.promise;
      }
      return Promise.resolve(workout());
    });

    const first = editor.saveSet("ex-a", "100", "5");
    const second = editor.saveSet("ex-b", "50", "8");
    await flushPromises();
    expect(posts).toHaveLength(2);

    posts[0].resolve({});
    await first;
    expect(editor.saveStateFor("ex-a")).toBe("saved");
    expect(editor.saveStateFor("ex-b")).toBe("saving");
    expect(editor.busy.value).toBe(true);
    expect(await editor.complete()).toBe(false);
    expect(
      api.mock.calls.some(([url]) => String(url).endsWith("/complete")),
    ).toBe(false);

    posts[1].reject(failure("Boom"));
    await second;
    expect(editor.saveStateFor("ex-b")).toBe("failed");
    expect(editor.saveErrorFor("ex-b")).toBe("Boom");
    expect(editor.saveStateFor("ex-a")).toBe("saved");
  });

  it("reuses the operation id when retrying unchanged input", async () => {
    const editor = mountEditor();
    await flushPromises();
    api.mockImplementation((url: string, options?: { method?: string }) => {
      if (String(url).endsWith("/sets") && options?.method === "POST") {
        return Promise.reject(failure("Network"));
      }
      return Promise.resolve(workout());
    });

    await editor.saveSet("ex-a", "100", "5");
    await editor.saveSet("ex-a", "100", "5");
    await editor.saveSet("ex-a", "100", "6");

    const ids = postsToSets().map(([, options]) => options.body.id);
    expect(ids).toHaveLength(3);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it("finishing one save does not clear the retry identity of another", async () => {
    const editor = mountEditor();
    await flushPromises();
    const posts: Deferred<unknown>[] = [];
    api.mockImplementation((url: string, options?: { method?: string }) => {
      if (String(url).endsWith("/sets") && options?.method === "POST") {
        const post = deferred<unknown>();
        posts.push(post);
        return post.promise;
      }
      return Promise.resolve(workout());
    });

    const bSave = editor.saveSet("ex-b", "50", "8");
    const aSave = editor.saveSet("ex-a", "100", "5");
    await flushPromises();
    posts[1].resolve({});
    await aSave;
    posts[0].reject(failure("Timeout"));
    await bSave;

    api.mockImplementation(() => Promise.resolve(workout()));
    await editor.saveSet("ex-b", "50", "8");
    expect(postsToSets()).toHaveLength(3);
    expect(postsToSets()[2][1].body.id).toBe(postsToSets()[0][1].body.id);
  });

  it("does not let an older read replace a newer one", async () => {
    const editor = mountEditor();
    await flushPromises();
    const reads: Deferred<WorkoutDetail>[] = [];
    api.mockImplementation((url: string, options?: { method?: string }) => {
      if (options?.method === undefined) {
        const read = deferred<WorkoutDetail>();
        reads.push(read);
        return read.promise;
      }
      return Promise.resolve(workout());
    });

    const first = editor.refresh();
    const second = editor.refresh();
    await flushPromises();
    expect(reads).toHaveLength(1);

    reads[0].resolve(workout());
    await flushPromises();
    expect(reads).toHaveLength(2);

    reads[1].resolve(
      workout({
        exercises: [
          {
            exerciseId: "ex-a",
            name: "Bench",
            position: 1,
            sets: [
              {
                id: "s1",
                exerciseId: "ex-a",
                position: 1,
                setNumber: 1,
                weight: "100",
                reps: 5,
              },
            ],
            lastTime: null,
          },
        ],
      }),
    );
    await Promise.all([first, second]);
    expect(editor.detail.value?.exercises[0].sets).toHaveLength(1);
  });

  it("keeps the entered metadata result on failure and reports success", async () => {
    const editor = mountEditor();
    await flushPromises();
    api.mockImplementation((_url: string, options?: { method?: string }) =>
      options?.method === "PATCH"
        ? Promise.reject(failure("Could not update the workout."))
        : Promise.resolve(workout()),
    );

    expect(await editor.updateMetadata({ focus: "Pull" })).toBe(false);
    expect(editor.metadata.state).toBe("error");
    expect(editor.metadata.error).toBe("Could not update the workout.");
    expect(editor.detail.value?.focus).toBe("Push");

    api.mockImplementation(() => Promise.resolve(workout({ focus: "Pull" })));
    expect(await editor.updateMetadata({ focus: "Pull" })).toBe(true);
    expect(editor.metadata.state).toBe("success");
    expect(editor.detail.value?.focus).toBe("Pull");
  });

  it("keeps the current detail visible when a refresh fails", async () => {
    const editor = mountEditor();
    await flushPromises();
    api.mockImplementation(() => Promise.reject(failure("Down", 503)));

    await editor.refresh();
    expect(editor.detail.value?.focus).toBe("Push");
    expect(editor.refreshError.value).not.toBeNull();
  });

  afterEach(() => scope.stop());
});

describe("useExerciseAlternatives", () => {
  let scope: ReturnType<typeof effectScope>;

  beforeEach(() => {
    api.mockReset();
    scope = effectScope();
  });

  afterEach(() => scope.stop());

  it("deduplicates overlapping requests for the same exercise and keeps errors per exercise", async () => {
    const { useExerciseAlternatives } = await import(
      "~/composables/exercises/useExerciseAlternatives"
    );
    const alternatives = scope.run(() => useExerciseAlternatives())!;
    const pending = new Map<string, Deferred<{ alternatives: unknown[] }>>();
    api.mockImplementation((url: string) => {
      const request = deferred<{ alternatives: unknown[] }>();
      pending.set(String(url), request);
      return request.promise;
    });

    alternatives.toggle("a");
    alternatives.toggle("a");
    alternatives.toggle("a");
    alternatives.toggle("b");
    expect(api).toHaveBeenCalledTimes(2);
    expect(alternatives.loading["a"]).toBe(true);
    expect(alternatives.loading["b"]).toBe(true);

    pending.get("/api/exercises/a/alternatives")!.reject(failure("x"));
    pending
      .get("/api/exercises/b/alternatives")!
      .resolve({ alternatives: [{ id: "c" }] });
    await flushPromises();

    expect(alternatives.errors["a"]).toBeDefined();
    expect(alternatives.errors["b"]).toBeUndefined();
    expect(alternatives.alternatives["b"]).toEqual([{ id: "c" }]);
    expect(alternatives.loading["a"]).toBe(false);
    expect(alternatives.loading["b"]).toBe(false);
  });

  it("aborts outstanding requests when its scope is disposed", async () => {
    const { useExerciseAlternatives } = await import(
      "~/composables/exercises/useExerciseAlternatives"
    );
    const alternatives = scope.run(() => useExerciseAlternatives())!;
    let signal: AbortSignal | undefined;
    api.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });

    alternatives.toggle("a");
    scope.stop();
    expect(signal?.aborted).toBe(true);
  });
});

describe("useExerciseSearch", () => {
  let scope: ReturnType<typeof effectScope>;

  beforeEach(() => {
    vi.useFakeTimers();
    api.mockReset();
    scope = effectScope();
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
  });

  async function mountSearch() {
    const { useExerciseSearch } = await import(
      "~/composables/workouts/useExerciseSearch"
    );
    return scope.run(() => useExerciseSearch())!;
  }

  it("shows loading while debouncing, then results", async () => {
    const search = await mountSearch();
    search.search("ben");
    expect(search.status.value).toBe("pending");
    expect(api).not.toHaveBeenCalled();

    api.mockResolvedValue({
      items: [{ id: "e1", nameEn: "Bench press", equipment: "barbell" }],
    });
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(search.status.value).toBe("success");
    expect(search.results.value).toEqual([
      { id: "e1", name: "Bench press", equipment: "barbell" },
    ]);
  });

  it("separates a failed search from an empty result and recovers on retry", async () => {
    const search = await mountSearch();
    api.mockRejectedValueOnce(failure("down"));
    search.search("ben");
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(search.status.value).toBe("error");
    expect(search.results.value).toEqual([]);

    api.mockResolvedValueOnce({ items: [] });
    search.retry();
    await flushPromises();
    expect(search.status.value).toBe("success");
    expect(search.results.value).toEqual([]);
  });

  it("ignores a superseded search response", async () => {
    const search = await mountSearch();
    const requests: Array<{
      term: string;
      request: Deferred<unknown>;
      signal: AbortSignal;
    }> = [];
    api.mockImplementation(
      (
        _url: string,
        options: { query: { search?: string }; signal: AbortSignal },
      ) => {
        const request = deferred<unknown>();
        requests.push({
          term: options.query.search ?? "",
          request,
          signal: options.signal,
        });
        return request.promise;
      },
    );

    search.search("a");
    await vi.advanceTimersByTimeAsync(200);
    search.search("ab");
    await vi.advanceTimersByTimeAsync(200);
    expect(requests.map((r) => r.term)).toEqual(["a", "ab"]);
    expect(requests[0].signal.aborted).toBe(true);

    requests[1].request.resolve({
      items: [{ id: "x", nameEn: "Ab", equipment: null }],
    });
    await flushPromises();
    requests[0].request.resolve({
      items: [{ id: "y", nameEn: "Stale", equipment: null }],
    });
    await flushPromises();
    expect(search.results.value.map((r) => r.id)).toEqual(["x"]);
  });
});

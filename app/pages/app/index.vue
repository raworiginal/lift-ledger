<template>
  <section class="hero flex-1">
    <div class="hero-content w-full max-w-3xl">
      <div class="card w-full border border-base-content/10 bg-base-300 shadow-xl">
        <div class="card-body gap-6 sm:p-10">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Dashboard</p>
              <h1 class="mt-2 text-4xl font-bold">Ready to train.</h1>
              <p class="mt-2 text-base-content/70">Welcome, {{ user?.name || user?.email }}.</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="signOut">Sign out</button>
          </div>

          <div class="stats stats-vertical border border-base-content/10 shadow sm:stats-horizontal">
            <div class="stat">
              <div class="stat-title">Workouts</div>
              <div class="stat-value">0</div>
              <div class="stat-desc">Your ledger starts here</div>
            </div>
            <div class="stat">
              <div class="stat-title">Current focus</div>
              <div class="stat-value text-2xl">Build</div>
              <div class="stat-desc">Consistency over noise</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const { user, signOut: endSession } = useUserSession();

const signOutAndReturn = async () => {
  await endSession();
  await navigateTo("/");
};

const signOut = signOutAndReturn;
</script>

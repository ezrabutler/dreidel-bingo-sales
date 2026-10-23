<template>
  <main class="dreidel-gradient min-h-screen px-6 py-16">
    <div class="mx-auto max-w-xl rounded-[2rem] border border-slate-700 bg-slate-900/70 p-10 text-center shadow-2xl shadow-slate-950/50">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 text-4xl">!</div>
      <p class="text-sm uppercase tracking-[0.35em] text-amber-300">Payment canceled</p>
      <h1 class="mt-4 text-4xl font-black text-white">Checkout was canceled.</h1>
      <p class="mt-4 text-slate-300">No charge was made. You can restart the order at any time.</p>
      <NuxtLink to="/" class="mt-8 inline-block rounded-2xl bg-amber-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-amber-300">
        Return to store
      </NuxtLink>
    </div>
  </main>
</template>

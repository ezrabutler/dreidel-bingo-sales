<template>
  <main class="min-h-screen bg-[#f2f2f0] px-6 py-16 text-slate-900">
    <div class="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl text-amber-700">!</div>
      <p class="text-xs font-bold uppercase tracking-[0.35em] text-amber-700">Payment canceled</p>
      <h1 class="mt-4 text-4xl font-black">Checkout was canceled.</h1>
      <p class="mt-4 text-slate-600">No charge was made and no seed strings were consumed.</p>
      <NuxtLink to="/" class="mt-8 inline-block rounded-2xl bg-amber-400 px-6 py-4 font-black text-slate-950 transition hover:bg-amber-300">
        Return to the storefront
      </NuxtLink>
    </div>
  </main>
</template>

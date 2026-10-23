<script setup lang="ts">
const text = ref('')
const loading = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const inventory = ref({ availableCount: 0, usedCount: 0, totalCount: 0 })

async function loadInventory() {
  const result = await $fetch('/api/admin/seed-strings')
  inventory.value = result
}

onMounted(() => {
  loadInventory()
})

async function submitBulkLines() {
  loading.value = true
  feedback.value = null

  try {
    const lines = text.value
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) {
      throw new Error('Paste at least one 128-digit seed string.')
    }

    const result = await $fetch('/api/admin/seed-strings', {
      method: 'POST',
      body: { lines }
    }) as { added: number; availableCount: number; usedCount: number; totalCount: number }

    feedback.value = {
      type: 'success',
      message: `Added ${result.added} new seed strings. ${result.availableCount} are available for sale.`
    }
    text.value = ''
    await loadInventory()
  } catch (err) {
    feedback.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Unable to upload seed strings.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-6 py-12 text-white">
    <div class="mx-auto max-w-5xl">
      <header class="mb-8 flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">Admin</p>
          <h1 class="mt-3 text-4xl font-black">Dreidel Bingo seed inventory</h1>
        </div>
        <NuxtLink to="/" class="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
          Back to storefront
        </NuxtLink>
      </header>

      <section class="grid gap-6 md:grid-cols-3">
        <div class="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p class="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Available</p>
          <div class="mt-4 text-4xl font-black text-emerald-300">{{ inventory.availableCount }}</div>
        </div>
        <div class="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p class="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Used</p>
          <div class="mt-4 text-4xl font-black text-amber-300">{{ inventory.usedCount }}</div>
        </div>
        <div class="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p class="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Total</p>
          <div class="mt-4 text-4xl font-black text-sky-300">{{ inventory.totalCount }}</div>
        </div>
      </section>

      <section class="mt-8 rounded-[2rem] border border-slate-800 bg-slate-900 p-8">
        <h2 class="text-2xl font-black">Bulk upload 128-digit seed strings</h2>
        <p class="mt-2 text-sm text-slate-400">Upload each line as a single 128-digit string. Once a row is used, it is removed permanently and never reused.</p>

        <textarea
          v-model="text"
          rows="18"
          class="mt-6 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none focus:border-amber-500"
          placeholder="123456789012345678901234...128 digits per line"
        />

        <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            :disabled="loading"
            @click="submitBulkLines"
            class="rounded-2xl bg-amber-400 px-6 py-3 font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading ? 'Uploading…' : 'Upload seed strings' }}
          </button>
        </div>

        <p
          v-if="feedback"
          :class="[
            'mt-6 rounded-2xl border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          ]"
        >
          {{ feedback.message }}
        </p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
const form = reactive({
  sheets: 25,
  variant: '5-color',
  paperSize: 'letter',
  playerName: '',
  email: ''
})

const loading = ref(false)
const error = ref('')
const availableCount = ref(0)

const pricing = {
  '4-color': 2.5,
  '5-color': 3.5,
  '6-color': 4.5
} as const

const total = computed(() => {
  const perSheet = pricing[form.variant as keyof typeof pricing] || pricing['5-color']
  return (Number(form.sheets) || 0) * perSheet
})

onMounted(async () => {
  try {
    const inventory = await $fetch('/api/admin/seed-strings')
    availableCount.value = Number(inventory.availableCount || 0)
  } catch (err) {
    console.error('Unable to load seed inventory', err)
  }
})

async function submitOrder() {
  loading.value = true
  error.value = ''

  try {
    const payload = {
      sheets: Number(form.sheets),
      variant: form.variant,
      paperSize: form.paperSize,
      name: form.playerName,
      email: form.email
    }

    if (Number(form.sheets) > availableCount.value) {
      error.value = `Only ${availableCount.value} printable seed strings remain in inventory. Please lower your sheet count or upload more strings.`
      return
    }

    const result = await $fetch('/api/checkout', {
      method: 'POST',
      body: payload
    }) as { url?: string; orderId?: string; sessionId?: string }

    if (result.url) {
      window.location.href = result.url
      return
    }

    window.location.href = `/success?orderId=${result.orderId || ''}`
  } catch (err) {
    console.error(err)
    error.value = err instanceof Error ? err.message : 'Something went wrong while creating your order.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#f2f2f0] text-slate-900">
    <div class="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <header class="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-black uppercase tracking-[0.4em] text-slate-700">Dreidel Bingo</p>
          <h1 class="mt-3 text-4xl font-black tracking-tight md:text-6xl">Printable game sheets</h1>
        </div>
        <div class="flex gap-3">
          <NuxtLink
            to="/admin"
            class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Seed inventory
          </NuxtLink>
        </div>
      </header>

      <section class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div class="mb-8 flex items-center justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Build your order</p>
              <h2 class="mt-2 text-2xl font-black">Custom printables</h2>
            </div>
            <div class="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {{ availableCount }} strings available
            </div>
          </div>

          <div class="space-y-6">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Number of sheets</label>
              <input
                v-model.number="form.sheets"
                min="1"
                max="1000"
                type="number"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none focus:border-amber-500"
                placeholder="25"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Color version</label>
              <select
                v-model="form.variant"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none focus:border-amber-500"
              >
                <option value="4-color">4 Color</option>
                <option value="5-color">5 Color</option>
                <option value="6-color">6 Color</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Paper size</label>
              <select
                v-model="form.paperSize"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none focus:border-amber-500"
              >
                <option value="letter">8.5" x 11" Letter</option>
                <option value="a4">A4</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Player name to print</label>
              <input
                v-model="form.playerName"
                type="text"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500"
                placeholder="Mia & Family"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Email for delivery</label>
              <input
                v-model="form.email"
                type="email"
                class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-lg text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500"
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>

        <aside class="rounded-[2rem] border border-slate-200 bg-[#1f2937] p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <p class="text-xs font-bold uppercase tracking-[0.3em] text-slate-300">Order summary</p>

          <div class="mt-6 space-y-4 text-slate-200">
            <div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
              <span>Sheets</span>
              <span class="font-bold text-white">{{ form.sheets }}</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
              <span>Version</span>
              <span class="font-bold text-white">{{ form.variant }}</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
              <span>Paper</span>
              <span class="font-bold text-white">{{ form.paperSize === 'a4' ? 'A4' : 'Letter' }}</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
              <span>Name</span>
              <span class="font-bold text-white">{{ form.playerName || 'Custom' }}</span>
            </div>
          </div>

          <div class="mt-8 rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5">
            <div class="flex items-center justify-between text-slate-200">
              <span class="text-xs font-bold uppercase tracking-[0.3em]">Total</span>
              <span class="text-3xl font-black text-white">${{ total.toFixed(2) }}</span>
            </div>
          </div>

          <button
            :disabled="loading || !form.email || !form.sheets || Number(form.sheets) > availableCount"
            @click="submitOrder"
            class="mt-8 w-full rounded-2xl bg-amber-400 px-5 py-4 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading ? 'Processing…' : 'Checkout with Stripe' }}
          </button>

          <p v-if="error" class="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {{ error }}
          </p>
        </aside>
      </section>
    </div>
  </main>
</template>

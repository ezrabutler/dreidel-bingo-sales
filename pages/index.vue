<script setup lang="ts">
const form = reactive({
  sheets: 25,
  variant: '5-color',
  playerName: '',
  email: ''
})

const loading = ref(false)
const error = ref('')
const successMessage = ref('')

const pricing = {
  '4-color': 2.5,
  '5-color': 3.5,
  '6-color': 4.5
}

const total = computed(() => {
  const perSheet = pricing[form.variant as keyof typeof pricing] || pricing['5-color']
  return (Number(form.sheets) || 0) * perSheet
})

async function submitOrder() {
  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const payload = {
      sheets: Number(form.sheets),
      variant: form.variant,
      name: form.playerName,
      email: form.email
    }

    const result = await $fetch('/api/checkout', {
      method: 'POST',
      body: payload
    }) as { url?: string; orderId?: string; sessionId?: string }

    if (result.url) {
      window.location.href = result.url
      return
    }

    successMessage.value = `Your order was created. Order ID: ${result.orderId || 'unknown'}`
  } catch (err) {
    console.error(err)
    error.value = err instanceof Error ? err.message : 'Something went wrong while creating your order.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="dreidel-gradient min-h-screen">
    <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <header class="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-medium uppercase tracking-[0.3em] text-amber-300">Dreidel Bingo</p>
          <h1 class="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">Printable game sheets for every table.</h1>
        </div>
        <div class="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2 text-sm text-slate-300 shadow-lg shadow-slate-950/30">
          8 cards per sheet · custom player name · instant PDF fulfillment
        </div>
      </header>

      <section class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="card-sheen rounded-3xl p-8">
          <div class="mb-8 flex items-center justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.25em] text-slate-400">Choose your set</p>
              <h2 class="mt-2 text-2xl font-bold text-white">Build your order</h2>
            </div>
            <div class="rounded-full bg-amber-400/15 px-3 py-1 text-sm font-medium text-amber-200">
              {{ form.sheets }} sheets
            </div>
          </div>

          <div class="space-y-6">
            <div>
              <label for="sheets" class="mb-2 block text-sm font-medium text-slate-200">Number of sheets</label>
              <input
                id="sheets"
                v-model.number="form.sheets"
                min="1"
                max="500"
                type="number"
                class="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-lg text-white outline-none ring-0 placeholder:text-slate-500 focus:border-amber-400"
                placeholder="25"
              />
            </div>

            <div>
              <label for="variant" class="mb-2 block text-sm font-medium text-slate-200">Color version</label>
              <select
                id="variant"
                v-model="form.variant"
                class="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-lg text-white outline-none focus:border-amber-400"
              >
                <option value="4-color">4 Color</option>
                <option value="5-color">5 Color</option>
                <option value="6-color">6 Color</option>
              </select>
            </div>

            <div>
              <label for="name" class="mb-2 block text-sm font-medium text-slate-200">Player name to print</label>
              <input
                id="name"
                v-model="form.playerName"
                type="text"
                class="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-lg text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
                placeholder="Mia & Family"
              />
            </div>

            <div>
              <label for="email" class="mb-2 block text-sm font-medium text-slate-200">Email for delivery</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-lg text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>

        <aside class="card-sheen rounded-3xl p-8">
          <p class="text-sm uppercase tracking-[0.25em] text-slate-400">Order summary</p>

          <div class="mt-6 space-y-4 text-slate-300">
            <div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3">
              <span>Sheets</span>
              <span class="font-semibold text-white">{{ form.sheets }}</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3">
              <span>Version</span>
              <span class="font-semibold text-white">{{ form.variant }}</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3">
              <span>Printed name</span>
              <span class="font-semibold text-white">{{ form.playerName || 'Custom' }}</span>
            </div>
          </div>

          <div class="mt-8 rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5">
            <div class="flex items-center justify-between text-slate-200">
              <span class="text-sm uppercase tracking-[0.2em]">Total</span>
              <span class="text-3xl font-black text-white">${{ total.toFixed(2) }}</span>
            </div>
          </div>

          <button
            :disabled="loading || !form.email || !form.sheets"
            @click="submitOrder"
            class="mt-8 w-full rounded-2xl bg-amber-400 px-5 py-4 text-lg font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.01] hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading ? 'Processing...' : 'Checkout with Stripe' }}
          </button>

          <p v-if="error" class="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {{ error }}
          </p>
          <p v-if="successMessage" class="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {{ successMessage }}
          </p>
        </aside>
      </section>
    </div>
  </main>
</template>

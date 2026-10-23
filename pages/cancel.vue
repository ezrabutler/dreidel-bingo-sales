<script setup lang="ts">
const route = useRoute()
const orderId = computed(() => (route.query.orderId as string) || '')
const sessionId = computed(() => (route.query.session_id as string) || '')
const order = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    if (orderId.value) {
      order.value = await $fetch(`/api/orders/${orderId.value}`)
    } else if (sessionId.value) {
      order.value = await $fetch(`/api/orders/session/${sessionId.value}`)
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#f2f2f0] px-6 py-16 text-slate-900">
    <div class="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-4xl text-emerald-700">
        ✓
      </div>

      <p class="text-xs font-bold uppercase tracking-[0.35em] text-emerald-700">Order complete</p>
      <h1 class="mt-4 text-4xl font-black md:text-5xl">Your Dreidel Bingo sheets are ready.</h1>

      <div v-if="loading" class="mt-8 text-slate-500">Loading order details…</div>

      <div v-else-if="order" class="mt-8 space-y-6 text-left text-slate-700">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p><span class="font-bold text-slate-900">Order:</span> {{ order.id }}</p>
          <p><span class="font-bold text-slate-900">Customer:</span> {{ order.customerName }}</p>
          <p><span class="font-bold text-slate-900">Sheets:</span> {{ order.sheets }}</p>
          <p><span class="font-bold text-slate-900">Paper:</span> {{ order.paperSize === 'a4' ? 'A4' : 'Letter' }}</p>
        </div>

        <a
          :href="order.downloadUrl"
          class="inline-flex w-full justify-center rounded-2xl bg-amber-400 px-6 py-4 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
        >
          Download PDF
        </a>
      </div>

      <div v-else class="mt-8 text-slate-600">
        Payment was received and your file is being prepared.
      </div>

      <NuxtLink to="/" class="mt-8 inline-block text-sm font-semibold text-slate-700 underline decoration-slate-400 underline-offset-8">
        Back to store
      </NuxtLink>
    </div>
  </main>
</template>

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
  <main class="dreidel-gradient min-h-screen px-6 py-16">
    <div class="mx-auto max-w-3xl rounded-[2rem] border border-slate-700 bg-slate-900/70 p-10 text-center shadow-2xl shadow-slate-950/40">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-4xl">
        ✓
      </div>

      <p class="text-sm uppercase tracking-[0.35em] text-emerald-300">Order complete</p>
      <h1 class="mt-4 text-4xl font-black text-white md:text-5xl">Your Dreidel Bingo sheets are ready.</h1>

      <div v-if="loading" class="mt-8 text-slate-300">Loading order details…</div>

      <div v-else-if="order" class="mt-8 space-y-6 text-left text-slate-200">
        <div class="rounded-2xl border border-slate-700 bg-slate-950/60 p-5">
          <p><span class="font-semibold text-white">Order:</span> {{ order.id }}</p>
          <p><span class="font-semibold text-white">Customer:</span> {{ order.customerName }}</p>
          <p><span class="font-semibold text-white">Sheets:</span> {{ order.sheets }}</p>
          <p><span class="font-semibold text-white">Variant:</span> {{ order.variant }}</p>
        </div>

        <a
          :href="order.downloadUrl"
          class="inline-flex w-full justify-center rounded-2xl bg-amber-400 px-6 py-4 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
        >
          Download PDF
        </a>
      </div>

      <div v-else class="mt-8 text-slate-300">
        We’ve received your payment and are preparing the printable file.
      </div>

      <NuxtLink to="/" class="mt-8 inline-block text-sm text-amber-300 underline decoration-amber-400/40 underline-offset-8">
        Back to the storefront
      </NuxtLink>
    </div>
  </main>
</template>

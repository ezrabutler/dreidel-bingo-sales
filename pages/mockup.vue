<template>
  <div class="min-h-screen bg-white p-8">
    <div class="mx-auto max-w-[1200px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 class="mb-6 text-3xl font-bold text-slate-900">Dreidel Bingo Mockup</h1>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="relative mx-auto aspect-[330/255] w-full max-w-[1100px] bg-white">
          <div class="absolute inset-0 flex flex-col">
            <div class="flex items-center justify-center pt-6 text-center">
              <div>
                <div class="text-4xl font-black tracking-tight text-slate-900">CJC HANUKKAH PARTY</div>
                <div class="mt-2 text-2xl font-light tracking-wide text-slate-700">HANUKKAH 2026 / 5787</div>
              </div>
            </div>

            <div class="mt-8 grid grid-cols-4 gap-x-8 gap-y-10 px-8">
              <BoardCard v-for="n in 8" :key="n" :board-number="n" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const BoardCard = {
  props: {
    boardNumber: { type: Number, required: true }
  },
  setup(props) {
    const grid = Array.from({ length: 16 }, (_, index) => {
      const palette = ['#facc15', '#60a5fa', '#f87171', '#4ade80', '#c084fc', '#f59e0b']
      return palette[(props.boardNumber + index) % palette.length]
    })

    return {
      grid
    }
  },
  template: `
    <div class="w-full">
      <div class="relative h-[240px] w-full rounded border border-slate-200 bg-white p-3">
        <div class="mb-2 grid grid-cols-4 text-center text-[10px] font-medium uppercase tracking-wide text-slate-700">
          <div>shin</div>
          <div>hey</div>
          <div>gimmel</div>
          <div>nūn</div>
        </div>

        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="(color, index) in grid"
            :key="index"
            class="flex aspect-square items-center justify-center rounded-full border border-slate-200"
            :style="{ backgroundColor: color }"
          ></div>
        </div>

        <div class="mt-4 text-left text-xs font-medium text-slate-700">game #{{ boardNumber }}</div>
      </div>
    </div>
  `
}
</script>

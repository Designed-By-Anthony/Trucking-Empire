<template>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 flex-shrink-0" style="border-bottom: 1px solid rgba(226,232,240,0.8);">
    <h2 class="text-base font-bold" style="color: #0f172a;">Financials</h2>
    <span class="text-xs font-medium" style="color: #94a3b8;">{{ gameStore.formattedTime }}</span>
  </div>

  <div class="modal-body p-4 space-y-4">

    <!-- Cash hero -->
    <div
      class="rounded-xl p-5 text-center"
      :style="gameStore.company.cash >= 0
        ? 'background: rgba(240,253,244,0.9); border: 1px solid rgba(134,239,172,0.5);'
        : 'background: rgba(254,242,242,0.9); border: 1px solid rgba(252,165,165,0.5);'"
    >
      <p class="text-[11px] font-bold uppercase tracking-widest mb-2" :style="{ color: gameStore.company.cash >= 0 ? '#059669' : '#dc2626' }">Cash Balance</p>
      <p
        class="text-3xl font-black tabular-nums"
        style="letter-spacing: -0.04em;"
        :style="{ color: gameStore.company.cash >= 0 ? '#059669' : '#dc2626' }"
      >{{ gameStore.formattedCash }}</p>
    </div>

    <!-- Save & Sync — email-based cross-device progress -->
    <div class="rounded-xl overflow-hidden" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
      <p class="text-[10px] font-bold uppercase tracking-widest px-4 py-2.5" style="color: #64748b; border-bottom: 1px solid rgba(226,232,240,0.8);">Save &amp; Sync</p>
      <div class="px-4 py-3 flex flex-col gap-2.5">
        <!-- Already linked -->
        <div v-if="gameStore.company.player_email" class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span class="text-[11px] font-semibold flex-1 truncate" style="color: #059669;">{{ gameStore.company.player_email }}</span>
          <button
            @click="unlinkEmail"
            class="text-[10px] font-bold rounded px-2 py-0.5"
            style="color: #94a3b8; background: rgba(241,245,249,0.9); border: 1px solid rgba(226,232,240,0.8);"
          >Unlink</button>
        </div>
        <!-- Email input -->
        <template v-else>
          <p class="text-[11px] leading-relaxed" style="color: #64748b;">Enter your email to sync progress across web &amp; PWA. Same email on any device restores your save.</p>
          <input
            v-model="emailInput"
            type="email"
            placeholder="your@email.com"
            class="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style="background: white; border: 1px solid rgba(226,232,240,0.8); color: #0f172a;"
            @keydown.enter="doSync"
          />
          <button
            @click="doSync"
            :disabled="!emailInput.includes('@') || syncing"
            class="w-full rounded-lg py-2.5 text-sm font-black text-white transition-all active:scale-95 disabled:opacity-50"
            style="background: linear-gradient(135deg, #2563eb, #7c3aed);"
          >{{ syncing ? 'Connecting…' : 'Link / Restore Save' }}</button>
          <!-- Result feedback -->
          <p v-if="syncMsg" class="text-[11px] font-semibold text-center" :style="syncMsg.type === 'error' ? 'color: #dc2626;' : 'color: #059669;'">
            {{ syncMsg.text }}
          </p>
        </template>
      </div>
    </div>

    <!-- Stats 2×2 grid -->
    <div class="grid grid-cols-2 gap-2.5">
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1.5" style="color: #94a3b8;">Revenue</p>
        <p class="text-sm font-black tabular-nums" style="color: #2563eb; letter-spacing: -0.02em;">{{ fmt(gameStore.company.total_revenue) }}</p>
      </div>
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1.5" style="color: #94a3b8;">Expenses</p>
        <p class="text-sm font-black tabular-nums" style="color: #dc2626; letter-spacing: -0.02em;">{{ fmt(gameStore.company.total_expenses) }}</p>
      </div>
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1.5" style="color: #94a3b8;">Net P&L</p>
        <p class="text-sm font-black tabular-nums" :style="{ color: gameStore.netProfit >= 0 ? '#059669' : '#dc2626', letterSpacing: '-0.02em' }">{{ fmt(gameStore.netProfit) }}</p>
      </div>
      <div class="rounded-xl p-3.5" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color: #94a3b8;">Reputation</p>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
            <div class="h-full rounded-full" :style="{ width: `${gameStore.company.reputation}%`, background: '#f59e0b' }" />
          </div>
          <span class="text-xs font-black tabular-nums" style="color: #d97706;">{{ gameStore.company.reputation }}</span>
        </div>
      </div>
    </div>

    <!-- Expense breakdown -->
    <div v-if="Object.keys(expenseBreakdown).length > 0">
      <p class="text-[11px] font-bold uppercase tracking-widest mb-2" style="color: #94a3b8;">Expenses</p>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid rgba(226,232,240,0.8);">
        <div
          v-for="(total, category) in expenseBreakdown"
          :key="category"
          class="flex items-center justify-between px-4 py-3"
          style="background: rgba(248,250,252,0.9);"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-base leading-none">{{ categoryEmoji(category) }}</span>
            <span class="text-sm font-semibold capitalize" style="color: #334155;">{{ category }}</span>
          </div>
          <span class="text-sm font-bold tabular-nums" style="color: #dc2626;">−{{ fmt(total) }}</span>
        </div>
      </div>
    </div>

    <!-- Recent deliveries -->
    <div v-if="gameStore.recentRevenue.length > 0">
      <p class="text-[11px] font-bold uppercase tracking-widest mb-2" style="color: #94a3b8;">Recent Deliveries</p>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid rgba(226,232,240,0.8);">
        <div
          v-for="entry in gameStore.recentRevenue.slice().reverse().slice(0, 8)"
          :key="entry.tick"
          class="flex items-center justify-between px-4 py-3"
          style="background: rgba(248,250,252,0.9);"
        >
          <span class="text-xs font-medium tabular-nums" style="color: #94a3b8;">Hour {{ Math.floor(entry.tick) }}</span>
          <span class="text-sm font-bold tabular-nums" style="color: #059669;">+{{ fmt(entry.amount) }}</span>
        </div>
      </div>
    </div>

    <div v-if="gameStore.recentRevenue.length === 0" class="text-center py-6">
      <div class="text-3xl mb-2 opacity-20">📊</div>
      <p class="text-xs" style="color: #94a3b8;">Complete a delivery to see revenue</p>
    </div>

    <!-- Dev reset — wipes all state and restarts onboarding -->
    <div class="pt-2" style="border-top: 1px solid rgba(226,232,240,0.6);">
      <button
        @click="gameStore.nukeAndResetGame()"
        class="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
        style="background: rgba(254,242,242,0.8); color: #dc2626; border: 1px solid rgba(252,165,165,0.4);"
      >
        ⚙ Reset to Day 1 (Dev)
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { forceSaveNow } from '~/composables/usePersistStatus'
import { syncByEmail } from '~/composables/useSyncEmail'
import { useGameStore } from '~/stores/useGameStore'

const gameStore = useGameStore()

const emailInput = ref('')
const syncing = ref(false)
const syncMsg = ref<{ type: 'ok' | 'error'; text: string } | null>(null)

async function doSync() {
  if (!emailInput.value.includes('@') || syncing.value) return
  syncing.value = true
  syncMsg.value = null
  const result = await syncByEmail(emailInput.value)
  syncing.value = false
  if (result === 'restored') {
    syncMsg.value = { type: 'ok', text: 'Progress restored from cloud!' }
    emailInput.value = ''
  } else if (result === 'linked') {
    syncMsg.value = { type: 'ok', text: 'Save linked — access anywhere with this email.' }
    emailInput.value = ''
  } else {
    syncMsg.value = { type: 'error', text: 'Connection failed. Try again.' }
  }
}

async function unlinkEmail() {
  gameStore.company.player_email = undefined
  syncMsg.value = null
  await forceSaveNow()
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const categoryEmoji = (cat: string) =>
  ({ fuel: '⛽', wages: '👤', maintenance: '🔧', overhead: '🏢', vehicle: '🚐' }[cat] ?? '💸')

const expenseBreakdown = computed(() => {
  const b: Record<string, number> = {}
  gameStore.recentExpenses.forEach(e => { b[e.category] = (b[e.category] ?? 0) + e.amount })
  return b
})
</script>

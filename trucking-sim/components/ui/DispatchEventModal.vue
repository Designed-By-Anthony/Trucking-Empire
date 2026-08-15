<template>
  <Teleport to="body">
    <div
      v-if="ev"
      class="fixed inset-0 flex items-end sm:items-center justify-center"
      style="z-index: 100; background: rgba(15,23,42,0.72); backdrop-filter: blur(4px);"
    >
      <div
        class="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style="
          background: #fff;
          box-shadow: 0 24px 64px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06);
          max-height: 92vh;
          overflow-y: auto;
        "
      >
        <!-- ── Red urgent header strip ── -->
        <div
          class="flex items-center gap-3 px-5 py-4"
          style="background: rgba(254,242,242,0.96); border-bottom: 1px solid rgba(239,68,68,0.3);"
        >
          <div
            class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style="background: rgba(220,38,38,0.12); border: 1.5px solid rgba(220,38,38,0.25);"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-widest" style="color: #dc2626;">Dispatch Call</p>
            <p class="text-sm font-bold truncate" style="color: #0f172a;">{{ ev.job.customer_name }}</p>
          </div>
          <div class="flex-shrink-0 text-right">
            <p class="text-[10px] font-semibold uppercase tracking-wider" style="color: #94a3b8;">Expires</p>
            <p class="text-xs font-bold tabular-nums" style="color: #dc2626;">{{ expiresIn }}</p>
          </div>
        </div>

        <!-- ── Body ── -->
        <div class="px-5 pt-4 pb-2">
          <p class="text-sm leading-relaxed mb-4" style="color: #0f172a;">{{ ev.message }}</p>

          <!-- 3-column detail grid -->
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="rounded-xl p-3 text-center" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
              <p class="text-[10px] font-bold uppercase tracking-wider mb-1" style="color: #94a3b8;">Weight</p>
              <p class="text-sm font-black tabular-nums" style="color: #0f172a;">{{ ev.job.weight_lbs }}<span class="text-[10px] font-semibold ml-0.5" style="color: #64748b;">lbs</span></p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
              <p class="text-[10px] font-bold uppercase tracking-wider mb-1" style="color: #94a3b8;">Volume</p>
              <p class="text-sm font-black tabular-nums" style="color: #0f172a;">{{ ev.job.volume_ft3 }}<span class="text-[10px] font-semibold ml-0.5" style="color: #64748b;">ft³</span></p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background: rgba(240,253,244,0.9); border: 1px solid rgba(5,150,105,0.2);">
              <p class="text-[10px] font-bold uppercase tracking-wider mb-1" style="color: #059669;">Payout</p>
              <p class="text-sm font-black tabular-nums" style="color: #059669;">${{ ev.job.payout }}</p>
            </div>
          </div>

          <!-- ── Route Check (HOS + window, not capacity) ── -->
          <div
            class="rounded-xl p-4 mb-4"
            style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider mb-3" style="color: #64748b;">Route Check</p>

            <!-- HOS row -->
            <div class="flex items-center justify-between py-2" style="border-bottom: 1px solid rgba(226,232,240,0.7);">
              <div>
                <p class="text-xs font-semibold" style="color: #0f172a;">Hours of Service</p>
                <p class="text-[10px] mt-0.5" style="color: #94a3b8;">
                  {{ hosAvailable.toFixed(1) }}h available · {{ totalTimeNeeded.toFixed(1) }}h needed
                </p>
              </div>
              <span
                class="text-xs font-bold px-2.5 py-1 rounded-full"
                :style="hosOk
                  ? 'background: rgba(240,253,244,0.9); color: #059669;'
                  : 'background: rgba(254,242,242,0.9); color: #dc2626;'"
              >{{ hosOk ? '✓ OK' : '✗ Short' }}</span>
            </div>

            <!-- Pickup window row -->
            <div class="flex items-center justify-between pt-2">
              <div>
                <p class="text-xs font-semibold" style="color: #0f172a;">Pickup Window</p>
                <p class="text-[10px] mt-0.5" style="color: #94a3b8;">
                  Closes {{ fmtHour(ev.job.window_close) }} · Free ~{{ fmtHour(lastStopDoneHour) }}
                </p>
              </div>
              <span
                class="text-xs font-bold px-2.5 py-1 rounded-full"
                :style="canMakeWindow
                  ? 'background: rgba(240,253,244,0.9); color: #059669;'
                  : 'background: rgba(254,242,242,0.9); color: #dc2626;'"
              >{{ canMakeWindow ? '✓ On Time' : '✗ Too Late' }}</span>
            </div>
          </div>

          <!-- Context note about how the pickup works -->
          <p class="text-[11px] mb-4" style="color: #94a3b8;">
            <span style="color: #0f172a; font-weight: 600;">{{ remainingStops.length }} stop{{ remainingStops.length !== 1 ? 's' : '' }} remaining.</span>
            Van clears first — pickup loads after final delivery.
          </p>

          <!-- Routing conflict note when can't add to today's route -->
          <div
            v-if="!canAddToRoute && blockReason"
            class="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
            style="background: rgba(255,251,235,0.9); border: 1px solid rgba(217,119,6,0.3);"
          >
            <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="#d97706">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <p class="text-xs font-semibold" style="color: #d97706;">{{ blockReason }} — scheduled for tomorrow instead</p>
          </div>

          <!-- Equipment tags -->
          <div v-if="ev.job.equipment_tags.length > 0" class="flex flex-wrap gap-1.5 mb-4">
            <span
              v-for="tag in ev.job.equipment_tags"
              :key="tag"
              class="text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
              style="background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(217,119,6,0.2);"
            >{{ tag }}</span>
          </div>
        </div>

        <!-- ── Action buttons ── -->
        <div class="px-5 pb-6 pt-2 flex flex-col gap-2">
          <!-- Primary: Add to today's route (only when time + space work) -->
          <button
            v-if="canAddToRoute"
            @click="accept"
            class="w-full text-sm font-bold text-white rounded-xl py-3.5 transition-all active:scale-95"
            style="background: #059669; box-shadow: 0 4px 16px rgba(5,150,105,0.35);"
          >
            Add to Route  +${{ ev.job.payout }}
          </button>

          <!-- Secondary: Schedule for tomorrow — always available -->
          <button
            @click="schedule"
            class="w-full text-sm font-bold rounded-xl py-3.5 transition-all active:scale-95"
            :style="canAddToRoute
              ? 'background: rgba(248,250,252,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);'
              : 'background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(217,119,6,0.3); box-shadow: 0 2px 8px rgba(217,119,6,0.15);'"
          >
            {{ canAddToRoute ? 'Schedule Tomorrow Instead' : 'Schedule Tomorrow  +$' + ev.job.payout }}
          </button>

          <!-- Decline -->
          <button
            @click="decline"
            class="w-full text-sm font-bold rounded-xl py-2.5 transition-all active:scale-95"
            style="background: transparent; color: #94a3b8;"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDayStore } from '~/stores/useDayStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useGameStore } from '~/stores/useGameStore'
import { serviceHoursForJob } from '~/composables/useServiceTime'

const dayStore = useDayStore()
const fleetStore = useFleetStore()
const gameStore = useGameStore()

const ev = computed(() => dayStore.active_event)

// ─── Remaining route analysis ─────────────────────────────────────────────

const remainingStops = computed(() =>
  dayStore.manifest
    .slice(dayStore.current_stop_index)
    .filter(s => s.job.status !== 'delivered')
)

// Game tick when the last remaining stop will be fully completed
const lastStopDoneTick = computed(() => {
  const last = remainingStops.value[remainingStops.value.length - 1]
  if (!last) return gameStore.company.date_tick
  return last.eta_game_hour + serviceHoursForJob(last.job)
})

// As a clock hour (0-23) for display
const lastStopDoneHour = computed(() => lastStopDoneTick.value % 24)

// Hours from now until route completes
const timeToFinishRoute = computed(() =>
  Math.max(0, lastStopDoneTick.value - gameStore.company.date_tick)
)

// ─── HOS check ────────────────────────────────────────────────────────────

const PICKUP_SERVICE_H = 0.5   // estimated time at pickup location

const totalTimeNeeded = computed(() => timeToFinishRoute.value + PICKUP_SERVICE_H)

const driver = computed(() =>
  fleetStore.drivers.find(d => d.id === dayStore.driver_id)
)

const hosAvailable = computed(() => driver.value?.hos_drive_remaining ?? 11)

const hosOk = computed(() => hosAvailable.value >= totalTimeNeeded.value)

// ─── Window check ─────────────────────────────────────────────────────────

// Pickup window_close is a clock hour (0-23); convert to absolute tick
const pickupWindowCloseTick = computed(() => {
  if (!ev.value) return 0
  const dayBase = Math.floor(gameStore.company.date_tick / 24) * 24
  return dayBase + ev.value.job.window_close
})

const canMakeWindow = computed(() =>
  lastStopDoneTick.value <= pickupWindowCloseTick.value
)

// ─── Space check (post-delivery capacity) ─────────────────────────────────
// Pickup happens after remaining stops deliver — van will be cleared.
// Check: pickup alone fits in empty van.

const spaceOk = computed(() => {
  if (!ev.value) return false
  return ev.value.job.weight_lbs <= dayStore.capacity_lbs && ev.value.job.volume_ft3 <= dayStore.capacity_ft3
})

// ─── Route path: add to today's route ────────────────────────────────────
// Both time (HOS + window) AND space must work.

const canAddToRoute = computed(() => hosOk.value && canMakeWindow.value && spaceOk.value)

// ─── Plan path: schedule for tomorrow ────────────────────────────────────
// Always available as a fallback — job queues into next morning's board.

const blockReason = computed(() => {
  if (!hosOk.value) return `Not enough HOS — need ${totalTimeNeeded.value.toFixed(1)}h, have ${hosAvailable.value.toFixed(1)}h`
  if (!canMakeWindow.value) return `Pickup window closes before route finishes`
  return ''
})

// ─── Expiry countdown ────────────────────────────────────────────────────

const expiresIn = computed(() => {
  if (!ev.value) return ''
  const hoursLeft = ev.value.expires_at_tick - gameStore.company.date_tick
  if (hoursLeft <= 0) return 'Now'
  const mins = Math.round(hoursLeft * 60)
  return mins < 60 ? `${mins}m` : `${hoursLeft.toFixed(1)}h`
})

// Auto-expire when tick passes
watch(
  () => gameStore.company.date_tick,
  (tick) => {
    const event = ev.value
    if (event && tick >= event.expires_at_tick) {
      dayStore.declineDispatchEvent(event)
    }
  }
)

function accept() {
  if (!ev.value || !canAddToRoute.value) return
  dayStore.acceptDispatchEvent(ev.value)
}

function schedule() {
  if (!ev.value) return
  dayStore.scheduleDispatchEvent(ev.value)
}

function decline() {
  if (!ev.value) return
  dayStore.declineDispatchEvent(ev.value)
}

function fmtHour(h: number): string {
  const hour = Math.floor(h) % 24
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:00 ${ampm}`
}
</script>

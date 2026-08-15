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

          <!-- ── Fleet Truck Picker (shown when 2+ trucks are active) ── -->
          <div v-if="fleetFeasibility.length > 1" class="rounded-xl overflow-hidden mb-4" style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
            <p class="text-[11px] font-bold uppercase tracking-widest px-4 py-2.5" style="color: #64748b; border-bottom: 1px solid rgba(226,232,240,0.8);">Assign to Truck</p>
            <div v-for="t in fleetFeasibility" :key="t.truckId"
              @click="t.canAdd && (routeTargetId = t.truckId)"
              class="flex items-center justify-between px-4 py-3 transition-all"
              :style="[
                t.truckId === routeTargetId ? 'background: rgba(219,234,254,0.7);' : '',
                t.canAdd ? 'cursor: pointer;' : 'opacity: 0.5;',
                'border-bottom: 1px solid rgba(226,232,240,0.6);',
              ].join(' ')"
            >
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-bold" style="color: #0f172a;">{{ t.truckName }}</span>
                  <span v-if="t.truckId === routeTargetId" class="text-[9px] font-black rounded px-1 py-0.5" style="background: #2563eb; color: white;">SELECTED</span>
                </div>
                <p class="text-[10px] mt-0.5" style="color: #94a3b8;">{{ t.driverName }} · {{ t.remainingStops }} stops left · free ~{{ fmtHour(t.lastFreeHour) }}</p>
              </div>
              <span class="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                :style="t.canAdd ? 'background: rgba(240,253,244,0.9); color: #059669;' : 'background: rgba(254,242,242,0.9); color: #dc2626;'"
              >{{ t.canAdd ? '✓ Eligible' : '✗ Blocked' }}</span>
            </div>
          </div>

          <!-- ── Route Check (HOS + window, not capacity) ── -->
          <div
            class="rounded-xl p-4 mb-4"
            style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider mb-3" style="color: #64748b;">Route Check{{ fleetFeasibility.length > 1 ? ` · ${targetFeasibility?.truckName}` : '' }}</p>

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
            <span style="color: #0f172a; font-weight: 600;">{{ remainingStops }} stop{{ remainingStops !== 1 ? 's' : '' }} remaining.</span>
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
            Add to {{ fleetFeasibility.length > 1 ? (targetFeasibility?.truckName ?? 'Route') : 'Route' }}  +${{ ev.job.payout }}
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
import { ref, computed, watch } from 'vue'
import { useDayStore } from '~/stores/useDayStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useGameStore } from '~/stores/useGameStore'
import { serviceHoursForJob } from '~/composables/useServiceTime'

const dayStore = useDayStore()
const fleetStore = useFleetStore()
const gameStore = useGameStore()

const ev = computed(() => dayStore.active_event)
const PICKUP_SERVICE_H = 0.5

// ─── Fleet feasibility — evaluate every active route ─────────────────────

interface TruckFeasibility {
  truckId: string
  truckName: string
  driverName: string
  remainingStops: number
  hosOk: boolean
  windowOk: boolean
  spaceOk: boolean
  canAdd: boolean
  hosAvailable: number
  timeNeeded: number
  lastFreeHour: number
}

const dayBase = computed(() => Math.floor(gameStore.company.date_tick / 24) * 24)
const pickupWindowCloseTick = computed(() => {
  if (!ev.value) return 0
  return dayBase.value + ev.value.job.window_close
})

const fleetFeasibility = computed((): TruckFeasibility[] => {
  if (!ev.value) return []
  return Object.entries(dayStore.fleet_routes)
    .filter(([, route]) => route.route_phase === 'in_progress')
    .map(([truckId, route]) => {
      const truck = fleetStore.getTruckById(truckId)
      const driver = route.driver_id ? fleetStore.getDriverById(route.driver_id) : null
      const remaining = route.manifest.slice(route.current_stop_index).filter(s => s.job.status !== 'delivered')
      const lastStop = remaining[remaining.length - 1]
      const lastDoneTick = lastStop ? lastStop.eta_game_hour + serviceHoursForJob(lastStop.job) : gameStore.company.date_tick
      const timeToFinish = Math.max(0, lastDoneTick - gameStore.company.date_tick)
      const timeNeeded = timeToFinish + PICKUP_SERVICE_H
      const hosAvailable = driver?.hos_drive_remaining ?? 11
      const hosOk = hosAvailable >= timeNeeded
      const windowOk = lastDoneTick <= pickupWindowCloseTick.value
      const spaceOk = ev.value!.job.weight_lbs <= (truck?.max_weight_lbs ?? 99999) && ev.value!.job.volume_ft3 <= (truck?.volume_ft3 ?? 99999)
      return {
        truckId,
        truckName: truck?.name ?? truckId,
        driverName: driver?.name ?? 'No driver',
        remainingStops: remaining.length,
        hosOk,
        windowOk,
        spaceOk,
        canAdd: hosOk && windowOk && spaceOk,
        hosAvailable,
        timeNeeded,
        lastFreeHour: lastDoneTick % 24,
      }
    })
})

const eligibleTrucks = computed(() => fleetFeasibility.value.filter(t => t.canAdd))
const ineligibleTrucks = computed(() => fleetFeasibility.value.filter(t => !t.canAdd))

// Selected route target — auto-set to first eligible truck, or current selected
const routeTargetId = ref('')
watch([fleetFeasibility, () => dayStore.selected_truck_id], () => {
  if (eligibleTrucks.value.length > 0 && !eligibleTrucks.value.find(t => t.truckId === routeTargetId.value)) {
    routeTargetId.value = eligibleTrucks.value[0]?.truckId ?? dayStore.selected_truck_id ?? ''
  } else if (!routeTargetId.value) {
    routeTargetId.value = dayStore.selected_truck_id ?? ''
  }
}, { immediate: true })

const targetFeasibility = computed(() =>
  fleetFeasibility.value.find(t => t.truckId === routeTargetId.value) ?? fleetFeasibility.value[0]
)

// ─── Expose current target's data for the template ───────────────────────

const remainingStops = computed(() => targetFeasibility.value?.remainingStops ?? 0)
const hosAvailable = computed(() => targetFeasibility.value?.hosAvailable ?? 11)
const totalTimeNeeded = computed(() => targetFeasibility.value?.timeNeeded ?? 0)
const hosOk = computed(() => targetFeasibility.value?.hosOk ?? false)
const canMakeWindow = computed(() => targetFeasibility.value?.windowOk ?? false)
const lastStopDoneHour = computed(() => targetFeasibility.value?.lastFreeHour ?? 0)
const canAddToRoute = computed(() => targetFeasibility.value?.canAdd ?? false)

const blockReason = computed(() => {
  const t = targetFeasibility.value
  if (!t) return 'No active route'
  if (!t.hosOk) return `Not enough HOS — need ${t.timeNeeded.toFixed(1)}h, have ${t.hosAvailable.toFixed(1)}h`
  if (!t.windowOk) return `Pickup window closes before route finishes`
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
  if (routeTargetId.value && routeTargetId.value !== dayStore.selected_truck_id) {
    dayStore.selectRoute(routeTargetId.value)
  }
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

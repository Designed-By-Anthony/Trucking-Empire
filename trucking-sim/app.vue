<template>
  <div class="fixed inset-0 overflow-hidden" style="background: #020817;">

    <!-- Full-screen map -->
    <div class="absolute inset-0 z-0">
      <ClientOnly>
        <GameMap />
      </ClientOnly>
    </div>

    <!-- Floating pill HUD — top center; safe-area-inset-top keeps it below Dynamic Island -->
    <div class="absolute left-0 right-0 z-50 flex justify-center px-4 pointer-events-none" style="top: max(12px, env(safe-area-inset-top, 0px))">
      <div class="pointer-events-auto w-full max-w-md">
        <HudBar />
      </div>
    </div>

    <!-- Modal overlay via Teleport -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="activeTab && activeTab !== 'map'"
          class="fixed inset-0 z-40 flex items-center justify-center p-4"
          @click.self="activeTab = null"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/50"
            style="backdrop-filter: blur(4px);"
            @click="activeTab = null"
          />
          <!-- Modal card -->
          <div
            class="relative w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
            style="
              max-height: 78vh;
              background: rgba(255, 255, 255, 0.97);
              backdrop-filter: blur(24px) saturate(180%);
              border: 1px solid rgba(203, 213, 225, 0.6);
              box-shadow: 0 25px 60px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.9) inset;
            "
          >
            <!-- Drag handle + X -->
            <div class="flex items-center justify-center pt-3 pb-1 flex-shrink-0 relative">
              <div class="w-9 h-1 rounded-full" style="background: rgba(0,0,0,0.12);"></div>
              <button
                @click="activeTab = null"
                class="absolute right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors active:scale-95"
                style="background: rgba(0,0,0,0.06); color: #94a3b8;"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <component
              :is="activeComponent"
              @start-day="handleStartDay"
              @launch-all="handleLaunchAll"
              @start-new-day="handleStartNewDay"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- FTUE onboarding wizard — shown when player has no truck yet.
         Pinia resets on every load so this is iOS-snapshot-proof. -->
    <OnboardingWizard v-if="fleetStore.fleet.length === 0 || gameStore.onboarding_step <= 3" />

    <!-- Mid-day dispatch event interrupt (manages its own Teleport) -->
    <DispatchEventModal />

    <!-- End-of-day debrief overlay -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showDebrief"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/60" style="backdrop-filter: blur(4px);" />
          <div
            class="relative w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
            style="
              max-height: 78vh;
              background: rgba(255,255,255,0.97);
              backdrop-filter: blur(24px) saturate(180%);
              border: 1px solid rgba(203,213,225,0.6);
              box-shadow: 0 25px 60px rgba(0,0,0,0.3);
            "
          >
            <div class="flex items-center justify-center pt-3 pb-1 flex-shrink-0">
              <div class="w-9 h-1 rounded-full" style="background: rgba(0,0,0,0.12);"></div>
            </div>
            <DayDebriefModal @start-new-day="handleStartNewDay" @view-week-summary="handleViewWeekSummary" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Week 1 P&L summary overlay — shown after Day 5 debrief -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showWeekSummary"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/70" style="backdrop-filter: blur(4px);" />
          <div
            class="relative w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
            style="
              max-height: 82vh;
              background: rgba(255,255,255,0.97);
              backdrop-filter: blur(24px) saturate(180%);
              border: 1px solid rgba(203,213,225,0.6);
              box-shadow: 0 25px 60px rgba(0,0,0,0.3);
            "
          >
            <div class="flex items-center justify-center pt-3 pb-1 flex-shrink-0">
              <div class="w-9 h-1 rounded-full" style="background: rgba(0,0,0,0.12);"></div>
            </div>
            <WeeklyPnLModal @advance-week="handleAdvanceWeek" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Floating pill tab bar — bottom center, clear of home indicator + Safari chrome -->
    <div
      class="absolute left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
      style="bottom: max(16px, env(safe-area-inset-bottom, 16px));"
    >
      <nav
        class="pointer-events-auto flex items-center gap-0.5 p-1.5 rounded-full"
        style="
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.9) inset;
        "
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = activeTab === tab.id ? null : tab.id"
          class="relative flex flex-col items-center gap-0.5 py-1.5 rounded-full transition-all duration-200"
          :class="activeTab === tab.id ? 'px-3' : 'px-2.5'"
          :style="activeTab === tab.id
            ? 'background: #2563eb; color: white;'
            : 'color: #94a3b8;'"
        >
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path :d="tab.icon" />
          </svg>
          <!-- Label only on active tab -->
          <span v-if="activeTab === tab.id" class="text-[10px] font-semibold tracking-wide whitespace-nowrap" style="line-height: 1;">{{ tab.label }}</span>
          <!-- Unread dot for dispatch -->
          <span
            v-if="tab.id === 'dispatch' && contractStore.available.length > 0 && activeTab !== 'dispatch'"
            class="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-400"
          />
          <!-- Planning dot for route tab -->
          <span
            v-if="tab.id === 'route' && dayStore.phase === 'planning' && activeTab !== 'route'"
            class="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-green-400"
          />
          <!-- Outbound freight dot for brokers tab -->
          <span
            v-if="tab.id === 'brokers' && (networkStore.outbound_pending.length > 0 || networkStore.dock_incompatible_count > 0) && activeTab !== 'brokers'"
            class="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400"
          />
        </button>
      </nav>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/useGameStore'
import { useContractStore } from '~/stores/useContractStore'
import { useDayStore } from '~/stores/useDayStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { useGameLoop } from '~/composables/useGameLoop'
import { useDispatchEvents } from '~/composables/useDispatchEvents'
import DispatchPanel from '~/components/ui/DispatchPanel.vue'
import FleetPanel from '~/components/ui/FleetPanel.vue'
import FinancialsPanel from '~/components/ui/FinancialsPanel.vue'
import MorningBoard from '~/components/ui/MorningBoard.vue'
import DeliveryPanel from '~/components/ui/DeliveryPanel.vue'
import DispatchEventModal from '~/components/ui/DispatchEventModal.vue'
import DayDebriefModal from '~/components/ui/DayDebriefModal.vue'
import WeeklyPnLModal from '~/components/ui/WeeklyPnLModal.vue'
import OnboardingWizard from '~/components/ui/OnboardingWizard.vue'
import BrandContractsPanel from '~/components/ui/BrandContractsPanel.vue'
import FreightBrokersPanel from '~/components/ui/FreightBrokersPanel.vue'
import { serviceHoursForStop } from '~/composables/useServiceTime'
import { useBrandContractStore } from '~/stores/useBrandContractStore'

const gameStore = useGameStore()
const contractStore = useContractStore()
const dayStore = useDayStore()
const fleetStore = useFleetStore()
const networkStore = useNetworkStore()
const brandContractStore = useBrandContractStore()
const dispatchEvents = useDispatchEvents()
const { start } = useGameLoop()

const activeTab = ref<string | null>(null)
const showDebrief = ref(false)
const showWeekSummary = ref(false)

const tabs = [
  {
    id: 'route',
    label: 'Route',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    id: 'dispatch',
    label: 'Contracts',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h4',
  },
  {
    id: 'brands',
    label: 'Brands',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'brokers',
    label: 'Brokers',
    icon: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
  },
  {
    id: 'fleet',
    label: 'Fleet',
    icon: 'M1 17h14V8H1v9zM15 17h7v-6l-2-4h-5v10zM4.5 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM18.5 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  },
  {
    id: 'financials',
    label: 'Money',
    icon: 'M3 19l4-6 4 3 4-8 4 4M3 5h18',
  },
]

const serviceHours = serviceHoursForStop

const activeComponent = computed(() => ({
  route: dayStore.phase === 'in_progress' ? DeliveryPanel : MorningBoard,
  dispatch: DispatchPanel,
  brands: BrandContractsPanel,
  brokers: FreightBrokersPanel,
  fleet: FleetPanel,
  financials: FinancialsPanel,
}[activeTab.value ?? ''] ?? null))

function getPlayerId(): string {
  const email = gameStore.company.player_email?.trim().toLowerCase()
  if (email) return `email:${email}`
  return localStorage.getItem('fe:pid') ?? ''
}

function notifyRouteLaunch() {
  const pid = getPlayerId()
  if (!pid) return
  // Fire-and-forget: store departure time + manifest so server can compute offline progression
  const manifests = Object.values(dayStore.fleet_routes)
    .filter(r => r.route_phase === 'in_progress')
    .map(r => r.manifest)
  fetch('/api/route-launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: pid, launchedAt: Date.now(), manifest: manifests }),
  }).catch(() => {})
}

function handleStartDay({ truckId, driverId }: { truckId: string; driverId: string }) {
  dayStore.startDay(truckId, driverId)
  dispatchEvents.scheduleEvents(gameStore.company.current_day, gameStore.company.date_tick)
  notifyRouteLaunch()
  activeTab.value = 'route'
}

function handleLaunchAll({ routes }: { routes: { truckId: string; driverId: string }[] }) {
  for (const { truckId, driverId } of routes) {
    dayStore.startDay(truckId, driverId)
  }
  dispatchEvents.scheduleEvents(gameStore.company.current_day, gameStore.company.date_tick)
  notifyRouteLaunch()
  activeTab.value = 'route'
}

function handleViewWeekSummary() {
  showDebrief.value = false
  showWeekSummary.value = true
}

function handleAdvanceWeek() {
  showWeekSummary.value = false
  dayStore.clearWeekHistory()
  handleStartNewDay()
}

function handleStartNewDay() {
  showDebrief.value = false
  gameStore.advanceDay()
  gameStore.snapToMorning()

  // Full overnight transition — strict sequential order:

  // 1. End previous shift for every route that was active
  for (const route of Object.values(dayStore.fleet_routes)) {
    if (route.driver_id) {
      fleetStore.endPhase0Route(route.truck_id, route.driver_id)
    }
  }

  // 1b. Settle hired-driver payroll — only idle drivers; active ones paid per-tick
  const activeDriverIds = new Set(
    Object.values(dayStore.fleet_routes)
      .filter(r => r.route_phase !== 'pending')
      .flatMap(r => r.driver_id ? [r.driver_id] : [])
  )
  fleetStore.settleDriverPayroll(activeDriverIds)
  brandContractStore.settleWeek(gameStore.company.current_day)

  // 2. Demurrage — charge for outbound freight sitting past grace period
  networkStore.applyDemurrage(gameStore.company.current_day)

  // 3. Night cycle — carrier-assigned freight departs; dock_pending stays
  networkStore.processNightCycle(gameStore.company.current_day)

  // 4. Refresh inbound dock — purge delivered items, seed overnight arrivals
  networkStore.refreshDailyFreight(gameStore.company.current_day)

  // 5. Refresh spot-market carrier quotes for the new day
  networkStore.refreshLineHaulMarket(gameStore.company.current_day)

  // 6. Rebuild morning board, tag brand deliveries, then start planning
  const { deliveries, pickups } = networkStore.buildMorningBoard(gameStore.company.current_day)
  const brandTagged = brandContractStore.tagJobs(deliveries)
  dayStore.startPlanningPhase([...brandTagged, ...pickups])

  // 7. Refresh driver hire marketplace for the new day
  fleetStore.generateDriverPool(gameStore.company.current_day)

  activeTab.value = 'route'
}

// When the fleet changes during planning (e.g. onboarding purchase), ensure every
// owned truck has a route entry so the MorningBoard can accept manifest additions.
watch(() => fleetStore.trucks.length, () => {
  if (dayStore.phase !== 'planning') return
  for (const truck of fleetStore.trucks) {
    if (!dayStore.fleet_routes[truck.id]) {
      dayStore.createRoute(truck.id, truck.driver_id)
    }
  }
})

watch(() => gameStore.company.date_tick, (tick) => {
  dispatchEvents.tick(tick)

  if (dayStore.phase !== 'in_progress') return

  // ── Advance each active route independently ───────────────────────────────
  let anyRouteStillRunning = false

  for (const [truckId, route] of Object.entries(dayStore.fleet_routes)) {
    if (route.route_phase !== 'in_progress') continue
    anyRouteStillRunning = true

    const stop = route.manifest[route.current_stop_index]
    if (stop && stop.job.status !== 'delivered') {
      if (tick >= stop.eta_game_hour + serviceHours(stop)) {
        if (stop.job.brand_id) brandContractStore.recordDelivery(stop.job.brand_id)
        dayStore.completeStop(tick, truckId)
      }
      continue
    }

    // This route's stops are all done — settle it
    if (route.current_stop_index >= route.manifest.length && route.manifest.length > 0) {
      const delivered = route.manifest.filter(s => s.job.status === 'delivered')
      const revenue = delivered.reduce((sum, s) => sum + s.job.payout, 0)
      const penalties = route.manifest.filter(s => s.on_time === false).length * 25
      gameStore.addCash(revenue - penalties, `day-${gameStore.company.current_day}-${truckId}`)

      // Stage pickups on the outbound dock
      const completedPickups = delivered.filter(s => s.job.job_type === 'pickup')
      if (completedPickups.length > 0) {
        for (const s of completedPickups) {
          networkStore.stagePickupAsOutbound(s.job, gameStore.company.current_day)
        }
      } else {
        for (const item of networkStore.dock) {
          if (item.status === 'on_manifest') item.status = 'delivered'
        }
      }

      dayStore.completeRoute(truckId)
      anyRouteStillRunning = false
    }
  }

  // All configured routes complete → produce day result + show debrief
  if (!anyRouteStillRunning && dayStore.all_routes_complete) {
    dayStore.finishDay(tick, gameStore.company.current_day)

    if (!gameStore.has_completed_onboarding) {
      gameStore.completeOnboarding()
    }

    showDebrief.value = true
    activeTab.value = null
  }
})

watch(() => dayStore.active_event, async (ev) => {
  if (ev) await dispatchEvents.notifyIfAway(ev)
})

watch(() => dayStore.phase, (phase) => {
  if (phase === 'debrief') showDebrief.value = true
})

onMounted(() => {
  fleetStore.ensureDefaultDriver()
  contractStore.generateContracts(gameStore.company.date_tick, gameStore.company.phase)

  // Seed terminal dock on first launch — fills it with 24 items representing
  // freight that arrived before the player's first shift
  if (!networkStore.initialized) {
    networkStore.seedDay1()
  }

  // Build morning board from dock + today's scheduled pickup requests
  const { deliveries, pickups } = networkStore.buildMorningBoard(gameStore.company.current_day)
  dayStore.startPlanningPhase([...deliveries, ...pickups])

  gameStore.startGame()
  start()
})
</script>

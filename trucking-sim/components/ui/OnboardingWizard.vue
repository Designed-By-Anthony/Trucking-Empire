<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 flex items-center justify-center p-5"
      style="z-index: 60; background: rgba(2,8,23,0.90); backdrop-filter: blur(10px);"
    >
      <div
        class="w-full max-w-xs rounded-2xl overflow-hidden"
        style="
          background: rgba(255,255,255,0.98);
          border: 1px solid rgba(203,213,225,0.6);
          box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.9) inset;
        "
      >

        <!-- Step 1: Company name -->
        <div v-if="step === 1" class="p-6">
          <div class="text-center mb-6">
            <div class="text-4xl mb-3">🚚</div>
            <h2 class="text-lg font-black" style="color: #0f172a;">Name Your Empire</h2>
            <p class="text-xs mt-1" style="color: #94a3b8;">Your logistics company starts here in Utica, NY</p>
          </div>

          <div class="flex flex-col gap-4">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-widest mb-2" style="color: #64748b;">Company Name</label>
              <input
                v-model="companyName"
                type="text"
                placeholder="Mohawk Express"
                maxlength="32"
                class="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all"
                style="background: rgba(248,250,252,0.9); border: 1.5px solid rgba(148,163,184,0.5); color: #0f172a;"
                @keyup.enter="confirmName"
              />
            </div>

            <div class="rounded-xl p-3.5" style="background: rgba(239,246,255,0.9); border: 1px solid rgba(147,197,253,0.4);">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">🏢</span>
                <div>
                  <p class="text-xs font-bold" style="color: #1e40af;">Home Terminal</p>
                  <p class="text-[11px]" style="color: #3b82f6;">Utica Terminal · Utica, NY</p>
                </div>
              </div>
            </div>

            <button
              @click="confirmName"
              :disabled="!companyName.trim()"
              class="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
              :style="companyName.trim()
                ? 'background: #2563eb; box-shadow: 0 4px 16px rgba(37,99,235,0.35);'
                : 'background: #cbd5e1; cursor: not-allowed;'"
            >
              Begin →
            </button>
          </div>
        </div>

        <!-- Step 2: Buy starter van -->
        <div v-if="step === 2" class="p-6">
          <div class="text-center mb-5">
            <div class="text-4xl mb-3">🚐</div>
            <h2 class="text-lg font-black" style="color: #0f172a;">Get Rolling</h2>
            <p class="text-xs mt-1" style="color: #94a3b8;">Purchase your first van to start hauling freight</p>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-4 py-3 rounded-xl" style="background: rgba(240,253,244,0.9); border: 1px solid rgba(134,239,172,0.5);">
              <span class="text-xs font-bold" style="color: #059669;">Starting Capital</span>
              <span class="text-sm font-black tabular-nums" style="color: #059669;">${{ gameStore.company.cash.toLocaleString() }}</span>
            </div>

            <div class="rounded-xl p-4" style="background: rgba(248,250,252,0.9); border: 1.5px solid rgba(37,99,235,0.3);">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <p class="text-sm font-black" style="color: #0f172a;">{{ starterVan.name }}</p>
                  <p class="text-[11px] mt-0.5" style="color: #64748b;">{{ starterVan.tagline }}</p>
                </div>
                <span class="text-sm font-black" style="color: #2563eb;">${{ starterVan.price.toLocaleString() }}</span>
              </div>
              <div class="flex gap-2 flex-wrap">
                <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 7px;">
                  {{ starterVan.max_weight_lbs.toLocaleString() }} lbs
                </span>
                <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 7px;">
                  {{ starterVan.mpg }} mpg
                </span>
                <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 7px;">
                  {{ starterVan.speed_mph }} mph
                </span>
              </div>
            </div>

            <p class="text-[11px] text-center" style="color: #94a3b8;">
              After purchase: <strong style="color: #0f172a;">${{ (gameStore.company.cash - starterVan.price).toLocaleString() }}</strong> remaining
            </p>

            <button
              @click="buyVan"
              class="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
              style="background: #059669; box-shadow: 0 4px 16px rgba(5,150,105,0.35);"
            >
              Buy Van · ${{ starterVan.price.toLocaleString() }}
            </button>
          </div>
        </div>

        <!-- Step 3: Route guide -->
        <div v-if="step === 3" class="p-6">
          <div class="text-center mb-5">
            <div class="text-4xl mb-3">🗺️</div>
            <h2 class="text-lg font-black" style="color: #0f172a;">Plan Your First Route</h2>
            <p class="text-xs mt-1" style="color: #94a3b8;">Four steps to your first paycheck</p>
          </div>

          <div class="flex flex-col gap-2 mb-5">
            <div
              v-for="(tip, i) in routeTips"
              :key="i"
              class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
              style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
            >
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                style="background: #2563eb; color: white;"
              >{{ i + 1 }}</div>
              <p class="text-xs font-semibold leading-snug" style="color: #334155;">{{ tip }}</p>
            </div>
          </div>

          <div class="rounded-xl px-4 py-3 mb-4" style="background: rgba(254,243,199,0.9); border: 1px solid rgba(251,191,36,0.4);">
            <p class="text-[11px] leading-snug" style="color: #92400e;">
              <strong>Tip:</strong> Use the speed controls in the top bar to fast-forward while on route.
            </p>
          </div>

          <button
            @click="dismiss"
            class="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
            style="background: #2563eb; box-shadow: 0 4px 16px rgba(37,99,235,0.35);"
          >
            Let's Go!
          </button>
        </div>

        <!-- Step indicator (animated pill) -->
        <div class="flex items-center justify-center gap-1.5 pb-5">
          <div
            v-for="n in 3"
            :key="n"
            class="h-1.5 rounded-full transition-all duration-300"
            :style="n === step
              ? 'width: 20px; background: #2563eb;'
              : 'width: 6px; background: #cbd5e1;'"
          />
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '~/stores/useGameStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { VEHICLE_CATALOG } from '~/data/vehicles'

const gameStore = useGameStore()
const fleetStore = useFleetStore()

const step = computed(() => gameStore.onboarding_step)
const starterVan = VEHICLE_CATALOG[0]

const companyName = ref(
  gameStore.company.name === 'Empire Freight LLC' ? '' : gameStore.company.name
)

const routeTips = [
  'Tap the Route tab below to open Morning Board',
  'Add jobs to your manifest — mix pickups and deliveries',
  'Assign your van and driver in the planning panel',
  'Hit Start Route and watch your earnings roll in',
]

function confirmName() {
  if (!companyName.value.trim()) return
  gameStore.setCompanyName(companyName.value.trim())
  gameStore.advanceOnboardingStep()
}

function buyVan() {
  fleetStore.purchaseVehicle(starterVan)
  gameStore.advanceOnboardingStep()
}

function dismiss() {
  gameStore.advanceOnboardingStep()
}
</script>

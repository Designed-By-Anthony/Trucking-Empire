<template>
  <!-- Header -->
  <div
    class="flex items-center justify-between px-5 py-4 flex-shrink-0"
    style="border-bottom: 1px solid rgba(226,232,240,0.8);"
  >
    <h2 class="text-base font-bold" style="color: #0f172a;">Morning Board</h2>
    <div class="flex items-center gap-2">
      <span
        class="text-xs font-bold"
        style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 8px;"
      >{{ gameTimeFmt }}</span>
      <span
        class="text-xs font-bold"
        style="background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5); border-radius: 6px; padding: 2px 8px;"
      >
        {{ dayStore.manifest.length }} stop{{ dayStore.manifest.length !== 1 ? 's' : '' }} · ${{ totalPayout.toLocaleString() }}
      </span>
    </div>
  </div>

  <!-- No truck yet — onboarding state -->
  <div v-if="fleetStore.idleTrucks.length === 0 && fleetStore.trucks.length === 0" class="flex-1 flex items-center justify-center p-8">
    <div class="text-center flex flex-col gap-4">
      <!-- Van SVG icon -->
      <div class="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center" style="background: rgba(219,234,254,0.8); border: 1px solid rgba(147,197,253,0.5);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 17h14V8H1v9zM15 17h7v-6l-2-4h-5v10zM4.5 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM18.5 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
        </svg>
      </div>
      <div>
        <p class="text-sm font-bold mb-1" style="color: #0f172a;">You need a vehicle first</p>
        <p class="text-xs leading-relaxed" style="color: #94a3b8;">Head to the Fleet tab to buy your first cargo van and start taking deliveries.</p>
      </div>
      <p class="text-xs font-bold" style="color: #2563eb;">Fleet tab → Buy Vehicle</p>
    </div>
  </div>

  <!-- Normal planning UI -->
  <div v-else class="modal-body p-4 flex flex-col gap-4" style="overflow-y: auto;">

    <!-- Truck Tabs — shown when 2+ trucks are configured -->
    <div
      v-if="truckTabs.length > 1"
      class="flex gap-1.5 p-1 rounded-xl"
      style="background: rgba(241,245,249,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <button
        v-for="tab in truckTabs"
        :key="tab.id"
        @click="selectedTruckId = tab.id"
        class="flex-1 rounded-lg px-2 py-2 text-[10px] font-black transition-all duration-150 flex flex-col items-center gap-0.5"
        :style="selectedTruckId === tab.id
          ? 'background: #2563eb; color: white; box-shadow: 0 2px 6px rgba(37,99,235,0.3);'
          : 'color: #64748b;'"
      >
        <span class="truncate max-w-full">{{ tab.truck?.name ?? tab.id }}</span>
        <span :style="selectedTruckId === tab.id ? 'color: rgba(255,255,255,0.75);' : 'color: #94a3b8;'" style="font-weight: 600;">
          {{ tab.stopCount }} stop{{ tab.stopCount !== 1 ? 's' : '' }}
        </span>
      </button>
    </div>

    <!-- Vehicle Selection -->
    <div
      class="rounded-xl p-4 flex flex-col gap-3"
      style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #94a3b8;">Assign Vehicle &amp; Driver</p>
      <div class="grid grid-cols-2 gap-2">
        <!-- Truck selector -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-widest" style="color: #64748b;">Truck</label>
          <div class="relative">
            <select
              v-model="selectedTruckId"
              class="w-full text-xs font-semibold rounded-lg appearance-none pr-6 pl-3 py-2 outline-none"
              style="background: white; border: 1px solid rgba(226,232,240,0.8); color: #0f172a;"
            >
              <option value="">-- Select --</option>
              <option
                v-for="truck in fleetStore.idleTrucks"
                :key="truck.id"
                :value="truck.id"
              >{{ truck.name ?? truck.id }}</option>
            </select>
            <!-- Chevron icon -->
            <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Driver selector -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-widest" style="color: #64748b;">Driver</label>
          <div class="relative">
            <select
              v-model="selectedDriverId"
              class="w-full text-xs font-semibold rounded-lg appearance-none pr-6 pl-3 py-2 outline-none"
              style="background: white; border: 1px solid rgba(226,232,240,0.8); color: #0f172a;"
            >
              <option value="">-- Select --</option>
              <option
                v-for="driver in driversForTruck"
                :key="driver.id"
                :value="driver.id"
              >{{ driver.name ?? driver.id }}</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Route preview stats — only when 2+ stops on manifest -->
    <div v-if="dayStore.manifest.length >= 2" class="rounded-xl px-4 py-3 flex items-center gap-3"
         style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
      <div class="flex-1">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color: #94a3b8;">Route Preview</p>
        <p class="text-[11px] font-semibold" style="color: #64748b;">{{ routeSummaryLabel }}</p>
        <p class="text-[11px] font-semibold mt-0.5" style="color: #64748b;">{{ densityLabel }}</p>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-base font-black tabular-nums" :style="{ color: densityColor }">{{ densityScore }}</p>
        <p class="text-[10px]" style="color: #94a3b8;">density</p>
      </div>
    </div>

    <!-- Capacity Bars -->
    <div
      class="rounded-xl p-4 flex flex-col gap-3"
      style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);"
    >
      <div class="flex items-center justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #94a3b8;">Load Capacity (Per Trip)</p>
        <span
          v-if="dayStore.is_over_capacity"
          class="text-[10px] font-bold"
          style="background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(252,165,165,0.5); border-radius: 6px; padding: 2px 8px;"
        >SHIFT FULL</span>
        <span
          v-else-if="dayStore.wave_info.waves > 1"
          class="text-[10px] font-bold"
          style="background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5); border-radius: 6px; padding: 2px 8px;"
        >{{ dayStore.wave_info.waves }} WAVES</span>
      </div>

      <!-- Weight -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold" style="color: #64748b;">Weight</span>
          <span class="text-[11px] font-bold tabular-nums" :style="{ color: dayStore.weight_pct > 85 ? '#dc2626' : '#0f172a' }">
            {{ dayStore.manifest_weight_lbs.toLocaleString() }} / {{ dayStore.capacity_lbs.toLocaleString() }} lbs
          </span>
        </div>
        <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{
              width: `${Math.min(dayStore.weight_pct, 100)}%`,
              background: dayStore.weight_pct > 85 ? '#dc2626' : '#2563eb'
            }"
          />
        </div>
      </div>

      <!-- Volume -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold" style="color: #64748b;">Volume</span>
          <span class="text-[11px] font-bold tabular-nums" :style="{ color: dayStore.volume_pct > 85 ? '#dc2626' : '#0f172a' }">
            {{ dayStore.manifest_volume_ft3.toFixed(1) }} / {{ dayStore.capacity_ft3 }} ft³
          </span>
        </div>
        <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(226,232,240,0.8);">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{
              width: `${Math.min(dayStore.volume_pct, 100)}%`,
              background: dayStore.volume_pct > 85 ? '#dc2626' : '#059669'
            }"
          />
        </div>
      </div>
    </div>

    <!-- Manifest Section -->
    <div class="flex flex-col gap-2">
      <!-- Section header -->
      <div class="flex items-center gap-2">
        <p class="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style="color: #94a3b8;">
          Route ({{ dayStore.wave_info.stops }} stop{{ dayStore.wave_info.stops !== 1 ? 's' : '' }})
        </p>
        <div class="flex-1 h-px" style="background: rgba(226,232,240,0.8);"></div>
        <button
          v-if="dayStore.manifest.length >= 2"
          @click="optimizeAndFlash"
          class="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 transition-all duration-150 active:scale-95"
          :style="optimized
            ? 'background: rgba(240,253,244,0.9); color: #059669; border: 1px solid rgba(134,239,172,0.5);'
            : 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'"
        >
          <!-- Route-optimize icon (two arrows forming a loop) -->
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="!optimized" d="M21 3L15 3L21 9M3 21L9 21L3 15M21 3C18 9 14 12 9 14M3 21C6 15 10 12 15 10"/>
            <path v-else d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-[10px] font-black">{{ optimized ? 'Optimized' : 'Auto Optimize' }}</span>
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="dayStore.manifest.length === 0"
        class="rounded-xl flex items-center justify-center py-6"
        style="border: 1.5px dashed rgba(226,232,240,0.8);"
      >
        <div class="text-center">
          <!-- Route icon -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="mx-auto mb-2" style="color: #cbd5e1;">
            <circle cx="6" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="18" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 6h4a4 4 0 0 1 4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M16 18h-4a4 4 0 0 1-4-4v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p class="text-xs font-medium" style="color: #94a3b8;">Add stops from the job board below</p>
        </div>
      </div>

      <!-- Manifest stops -->
      <div
        v-for="(entry, idx) in dayStore.manifest"
        :key="entry.job.id"
        :data-stop-idx="idx"
        class="rounded-xl flex items-start gap-2 p-3 transition-all duration-150"
        :style="{
          background: 'rgba(248,250,252,0.9)',
          border: dragToIdx === idx && dragFromIdx !== null && dragFromIdx !== idx
            ? '1px solid #2563eb'
            : '1px solid rgba(226,232,240,0.8)',
          opacity: dragFromIdx === idx ? '0.4' : '1',
          transform: dragToIdx === idx && dragFromIdx !== null && dragFromIdx !== idx ? 'scale(1.01)' : 'scale(1)',
        }"
      >
        <!-- Drag handle — pointer events only, touch-action: none prevents scroll interference -->
        <div
          class="flex-shrink-0 mt-1"
          style="color: #cbd5e1; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none;"
          @pointerdown="startDrag(idx, $event)"
          @pointermove="onPointerMove"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            <circle cx="3" cy="2" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="2" r="1.2" fill="currentColor"/>
            <circle cx="3" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="3" cy="12" r="1.2" fill="currentColor"/>
            <circle cx="7" cy="12" r="1.2" fill="currentColor"/>
          </svg>
        </div>

        <!-- Sequence pill -->
        <div
          class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
          style="background: #2563eb; color: white;"
        >{{ entry.sequence }}</div>

        <!-- Main content -->
        <div class="flex-1 min-w-0 flex flex-col gap-1.5">
          <div class="flex items-start justify-between gap-1">
            <div class="min-w-0">
              <p class="text-xs font-bold truncate" style="color: #0f172a;">{{ entry.job.customer_name }}</p>
              <p class="text-[10px] truncate" style="color: #64748b;">{{ entry.job.delivery_address }}</p>
            </div>
          </div>

          <!-- Badges row 1: weight · volume · payout -->
          <div class="flex flex-wrap gap-1">
            <span class="text-[10px] font-bold rounded" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 6px;">
              {{ entry.job.weight_lbs }} lbs
            </span>
            <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 6px;">
              {{ entry.job.volume_ft3 }} ft³
            </span>
            <span class="text-[10px] font-bold" style="background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5); border-radius: 6px; padding: 2px 6px;">
              ${{ entry.job.payout }}
            </span>
            <!-- Window -->
            <span class="text-[10px] font-bold" style="background: rgba(254,243,199,0.8); color: #d97706; border: 1px solid rgba(251,191,36,0.5); border-radius: 6px; padding: 2px 6px;">
              {{ fmtHour(entry.job.window_open) }}–{{ fmtHour(entry.job.window_close) }}
            </span>
          </div>

          <!-- Badges row 2: equipment tags + ETA -->
          <div class="flex flex-wrap gap-1">
            <span
              v-for="tag in entry.job.equipment_tags"
              :key="tag"
              class="text-[10px] font-bold"
              :style="tagStyle(tag) + ' border-radius: 6px; padding: 2px 6px;'"
            >{{ tagLabel(tag) }}</span>
            <span
              v-if="entry.eta_game_hour != null"
              class="text-[10px] font-bold"
              style="background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5); border-radius: 6px; padding: 2px 6px;"
            >~{{ fmtHour(entry.eta_game_hour) }}</span>
          </div>
        </div>

        <!-- Remove button -->
        <button
          @click="dayStore.removeFromManifest(entry.job.id)"
          class="flex-shrink-0 rounded-lg flex items-center justify-center transition-colors duration-150 mt-0.5"
          style="width: 24px; height: 24px; background: rgba(254,242,242,0.8); color: #dc2626; border: 1px solid rgba(252,165,165,0.4);"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Dock status row -->
    <div class="rounded-xl px-4 py-3 flex items-center gap-3"
         style="background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);">
      <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="22" height="18" rx="2"/>
        <path d="M1 9h22M8 3v18M16 3v18"/>
      </svg>
      <div class="flex-1">
        <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #94a3b8;">Terminal Dock</p>
        <p class="text-xs font-semibold mt-0.5" style="color: #0f172a;">
          {{ networkStore.dock_available_count }} freight items staged
        </p>
      </div>
      <div class="flex-shrink-0 text-right" v-if="networkStore.outbound_count > 0">
        <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #94a3b8;">Outbound</p>
        <p class="text-xs font-bold" style="color: #d97706;">{{ networkStore.outbound_count }} staged</p>
      </div>
    </div>

    <!-- Low dock warning + supplement purchase option -->
    <div
      v-if="networkStore.dock_available_count < 4"
      class="rounded-xl px-4 py-3 flex items-center gap-3"
      style="background: rgba(255,251,235,0.9); border: 1px solid rgba(217,119,6,0.3);"
    >
      <div class="flex-1">
        <p class="text-xs font-bold" style="color: #d97706;">
          {{ networkStore.dock_available_count === 0 ? 'Dock empty' : 'Dock running low' }}
        </p>
        <p class="text-[10px] mt-0.5" style="color: #92400e;">
          Buy spot freight from a broker to fill the dock, or run pickups and wait for your own line haul.
        </p>
      </div>
      <button
        @click="buySupplementFreight"
        :disabled="gameStore.company.cash < SUPPLEMENT_COST"
        class="flex-shrink-0 rounded-lg px-3 py-2 text-[11px] font-black transition-all active:scale-95"
        :style="gameStore.company.cash >= SUPPLEMENT_COST
          ? 'background: #d97706; color: white; box-shadow: 0 2px 8px rgba(217,119,6,0.3);'
          : 'background: rgba(241,245,249,0.9); color: #94a3b8; border: 1px solid rgba(226,232,240,0.8);'"
      >
        Buy 8 Pallets<br>
        <span class="text-[10px] font-semibold">${{ SUPPLEMENT_COST.toLocaleString() }}</span>
      </button>
    </div>

    <!-- Job Board Section -->
    <div class="flex flex-col gap-2">
      <!-- Section header -->
      <div class="flex items-center gap-2">
        <p class="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style="color: #94a3b8;">
          Job Board ({{ dayStore.available_jobs.length }})
        </p>
        <div class="flex-1 h-px" style="background: rgba(226,232,240,0.8);"></div>
      </div>

      <!-- Job cards -->
      <div
        v-for="job in dayStore.available_jobs"
        :key="job.id"
        class="rounded-xl p-3 flex flex-col gap-2"
        :style="jobCardStyle(job)"
      >
        <!-- Job header: name + add/full button -->
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 mb-0.5">
              <!-- Pickup indicator -->
              <span
                v-if="job.job_type === 'pickup'"
                class="flex-shrink-0 text-[9px] font-black rounded px-1"
                style="background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(217,119,6,0.25);"
              >PICKUP</span>
              <!-- Urgent indicator -->
              <div
                v-if="isUrgent(job)"
                class="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                style="background: #dc2626;"
              />
              <p class="text-xs font-bold truncate" style="color: #0f172a;">{{ job.customer_name }}</p>
            </div>
            <p class="text-[10px] truncate" style="color: #64748b;">
              {{ job.job_type === 'pickup' ? job.pickup_address : job.delivery_address }}
            </p>
          </div>

          <!-- Add or Full button -->
          <button
            v-if="dayStore.can_add_job(job)"
            @click="dayStore.addToManifest(job)"
            class="flex-shrink-0 rounded-lg flex items-center justify-center transition-colors duration-150"
            style="width: 28px; height: 28px; background: rgba(240,253,244,0.9); color: #059669; border: 1px solid rgba(134,239,172,0.5);"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <div
            v-else
            class="flex-shrink-0 text-[9px] font-black rounded-lg flex items-center justify-center"
            :title="dayStore.job_block_reason(job) ?? 'Full'"
            style="padding: 2px 6px; height: 28px;"
            :style="blockChipStyle(job)"
          >{{ blockChipLabel(job) }}</div>
        </div>

        <!-- Stats row -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 6px;">
            {{ job.weight_lbs }} lbs
          </span>
          <span class="text-[10px] font-bold" style="background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8); border-radius: 6px; padding: 2px 6px;">
            {{ job.volume_ft3 }} ft³
          </span>
          <span class="text-[10px] font-bold" style="background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5); border-radius: 6px; padding: 2px 6px;">
            ${{ job.payout }}
          </span>
        </div>

        <!-- Tag row -->
        <div class="flex flex-wrap gap-1">
          <!-- Window -->
          <span
            class="text-[10px] font-bold"
            :style="isUrgent(job)
              ? 'background: rgba(254,242,242,0.9); color: #dc2626; border: 1px solid rgba(252,165,165,0.5); border-radius: 6px; padding: 2px 6px;'
              : 'background: rgba(254,243,199,0.8); color: #d97706; border: 1px solid rgba(251,191,36,0.5); border-radius: 6px; padding: 2px 6px;'"
          >
            {{ fmtHour(job.window_open) }}–{{ fmtHour(job.window_close) }}{{ isUrgent(job) ? ' !' : '' }}
          </span>
          <!-- Delivery type -->
          <span class="text-[10px] font-bold" :style="tagStyle(job.delivery_type) + ' border-radius: 6px; padding: 2px 6px;'">
            {{ tagLabel(job.delivery_type) }}
          </span>
          <!-- Equipment tags -->
          <span
            v-for="tag in job.equipment_tags"
            :key="tag"
            class="text-[10px] font-bold"
            :style="tagStyle(tag) + ' border-radius: 6px; padding: 2px 6px;'"
          >{{ tagLabel(tag) }}</span>
        </div>
      </div>

      <!-- Empty job board -->
      <div
        v-if="dayStore.available_jobs.length === 0"
        class="rounded-xl py-5 flex items-center justify-center"
        style="border: 1.5px dashed rgba(226,232,240,0.8);"
      >
        <p class="text-xs font-medium" style="color: #94a3b8;">No jobs available</p>
      </div>
    </div>

    <!-- Lock in Route CTA -->
    <button
      @click="lockInRoute"
      :disabled="!canLock"
      class="w-full rounded-xl py-3.5 text-sm font-black transition-all duration-200"
      :style="lockBtnStyle"
    >
      <template v-if="canLock">
        Lock in Route
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display: inline; margin-left: 4px; vertical-align: middle;">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ({{ dayStore.wave_info.stops }} stop{{ dayStore.wave_info.stops !== 1 ? 's' : '' }}, ${{ totalPayout.toLocaleString() }})
      </template>
      <template v-else-if="dayStore.is_over_capacity">Shift Full — Remove Stops</template>
      <template v-else-if="!selectedTruckId || !selectedDriverId">Select Truck &amp; Driver First</template>
      <template v-else>Add Stops to Lock Route</template>
    </button>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDayStore } from '~/stores/useDayStore'
import { useFleetStore } from '~/stores/useFleetStore'
import { useGameStore } from '~/stores/useGameStore'
import { useNetworkStore } from '~/stores/useNetworkStore'
import { useRoutePlanner } from '~/composables/useRoutePlanner'
import type { Job } from '~/types/game'

// ─── Stores ──────────────────────────────────────────────────────────────────
const dayStore = useDayStore()
const fleetStore = useFleetStore()
const gameStore = useGameStore()
const networkStore = useNetworkStore()
const { planRoute } = useRoutePlanner()

// ─── Emits ────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  (e: 'start-day', payload: { truckId: string; driverId: string }): void
}>()

// ─── Local state ─────────────────────────────────────────────────────────────
const selectedTruckId = ref(dayStore.selected_truck_id ?? '')
const selectedDriverId = ref(dayStore.current_route?.driver_id ?? '')
const dragFromIdx = ref<number | null>(null)
const dragToIdx = ref<number | null>(null)
const optimized = ref(false)
let stopRects: DOMRect[] = []

// ─── Sync truck tab ↔ store ───────────────────────────────────────────────────
watch(() => dayStore.selected_truck_id, (id) => {
  if (id) selectedTruckId.value = id
})
watch(selectedTruckId, (id) => {
  if (id && dayStore.fleet_routes[id]) {
    dayStore.selectRoute(id)
    selectedDriverId.value = dayStore.fleet_routes[id]?.driver_id ?? ''
  }
})
watch(selectedDriverId, (id) => {
  const route = selectedTruckId.value ? dayStore.fleet_routes[selectedTruckId.value] : null
  if (route) route.driver_id = id || null
})
watch(() => dayStore.configured_truck_ids.length, (count) => {
  if (count > 0 && !selectedTruckId.value) {
    selectedTruckId.value = dayStore.configured_truck_ids[0] ?? ''
  }
}, { immediate: true })

// ─── Computed ─────────────────────────────────────────────────────────────────
const truckTabs = computed(() =>
  dayStore.configured_truck_ids.map(id => ({
    id,
    truck: fleetStore.getTruckById(id),
    stopCount: (dayStore.fleet_routes[id]?.manifest ?? []).filter(s => s.stop_type !== 'terminal_return').length,
  }))
)

// Show drivers that are unassigned OR already assigned to the selected truck
// (Phase 0: "You" drive your own van — you're pre-assigned to it after purchase)
const driversForTruck = computed(() =>
  fleetStore.drivers.filter(d =>
    d.status === 'Available' &&
    (d.assigned_truck_id === null || d.assigned_truck_id === selectedTruckId.value)
  )
)

const totalPayout = computed(() =>
  dayStore.manifest.reduce((sum, e) => sum + e.job.payout, 0)
)

const canLock = computed(() =>
  dayStore.manifest.length > 0 &&
  !!selectedTruckId.value &&
  !!selectedDriverId.value &&
  !dayStore.is_over_capacity
)

const lockBtnStyle = computed(() =>
  canLock.value
    ? 'background: #2563eb; color: white; border: none; cursor: pointer;'
    : 'background: rgba(241,245,249,0.9); color: #94a3b8; border: 1px solid rgba(226,232,240,0.8); cursor: not-allowed;'
)

const gameTimeFmt = computed(() => {
  const tick = gameStore.company.date_tick % 24
  const h = Math.floor(tick)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:00 ${ampm}`
})

const routePlan = computed(() => {
  if (dayStore.manifest.length < 2) return null
  return planRoute(dayStore.manifest, 7)
})

const estimatedHours = computed(() =>
  routePlan.value ? routePlan.value.total_drive_hours.toFixed(1) : '0'
)

const routeSummaryLabel = computed(() => {
  const info = dayStore.wave_info
  if (info.stops === 0) return '—'
  const waveText = info.relays > 0
    ? ` · ${info.waves} Waves (${info.relays} Relay${info.relays !== 1 ? 's' : ''})`
    : ''
  return `${info.stops} Stop${info.stops !== 1 ? 's' : ''}${waveText} · ~${info.estimated_hours.toFixed(1)}h shift`
})

const densityScore = computed(() => routePlan.value?.density_score ?? 0)

const densityColor = computed(() => {
  const s = densityScore.value
  if (s >= 70) return '#059669'
  if (s >= 40) return '#d97706'
  return '#dc2626'
})

const densityLabel = computed(() => {
  const s = densityScore.value
  if (s >= 70) return 'Tight zone'
  if (s >= 40) return 'Spread out'
  return 'Wide area'
})

// ─── Drag and drop (pointer events — works on iOS touch + desktop mouse) ────
function startDrag(idx: number, e: PointerEvent) {
  e.preventDefault()
  dragFromIdx.value = idx
  dragToIdx.value = idx
  optimized.value = false
  // Capture pointer so move/up fire here as finger moves anywhere on screen
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  // Snapshot rects of all stop cards right now before any DOM updates
  stopRects = Array.from(document.querySelectorAll('[data-stop-idx]'))
    .map(el => el.getBoundingClientRect())
}

function onPointerMove(e: PointerEvent) {
  if (dragFromIdx.value === null) return
  const cy = e.clientY
  for (let i = 0; i < stopRects.length; i++) {
    const rect = stopRects[i]
    if (rect && cy >= rect.top && cy <= rect.bottom) {
      dragToIdx.value = i
      return
    }
  }
}

function endDrag() {
  if (dragFromIdx.value !== null && dragToIdx.value !== null && dragFromIdx.value !== dragToIdx.value) {
    dayStore.reorderManifest(dragFromIdx.value, dragToIdx.value)
  }
  dragFromIdx.value = null
  dragToIdx.value = null
  stopRects = []
}

watch(() => dayStore.manifest.length, () => { optimized.value = false })

// ─── Auto optimize ───────────────────────────────────────────────────────────
function optimizeAndFlash() {
  dayStore.optimizeManifest()
  optimized.value = true
  setTimeout(() => { optimized.value = false }, 3000)
}

// ─── Actions ─────────────────────────────────────────────────────────────────
const SUPPLEMENT_COST = 750   // $750 for 8 broker pallets (~$94/pallet)

function buySupplementFreight() {
  const success = networkStore.purchaseFreightSupplement(
    gameStore.company.current_day,
    8,
    SUPPLEMENT_COST,
  )
  if (success) {
    // Rebuild available jobs from updated dock
    const { deliveries } = networkStore.buildMorningBoard(gameStore.company.current_day)
    // Merge new deliveries into available jobs (don't duplicate ones already there)
    const existingIds = new Set(dayStore.available_jobs.map(j => j.id))
    const fresh = deliveries.filter(j => !existingIds.has(j.id))
    dayStore.available_jobs.push(...fresh)
  }
}

function lockInRoute() {
  if (!canLock.value) return
  emit('start-day', { truckId: selectedTruckId.value, driverId: selectedDriverId.value })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtHour(h: number): string {
  const hour = Math.floor(h) % 24
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:00 ${ampm}`
}

function tagStyle(tag: string): string {
  if (tag === 'dock' || tag === 'dock_high') return 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'
  if (tag === 'residential' || tag === 'residential_only') return 'background: rgba(240,253,244,0.8); color: #059669; border: 1px solid rgba(134,239,172,0.5);'
  if (tag === 'liftgate') return 'background: rgba(254,243,199,0.8); color: #d97706; border: 1px solid rgba(251,191,36,0.5);'
  if (tag === 'commercial') return 'background: rgba(219,234,254,0.8); color: #2563eb; border: 1px solid rgba(147,197,253,0.5);'
  return 'background: rgba(241,245,249,0.9); color: #64748b; border: 1px solid rgba(226,232,240,0.8);'
}

function tagLabel(tag: string): string {
  const labels: Record<string, string> = {
    dock: 'DOCK',
    dock_high: 'DOCK HIGH',
    residential: 'RESI',
    residential_only: 'RESI',
    liftgate: 'LIFT',
    commercial: 'COMM',
  }
  return labels[tag] ?? tag.toUpperCase()
}

function isUrgent(job: { window_close: number }): boolean {
  const currentHour = Math.floor(gameStore.company.date_tick) % 24
  return (job.window_close - currentHour) < 3
}

function jobCardStyle(job: { is_emergency?: boolean }): string {
  if (job.is_emergency) {
    return 'background: rgba(254,242,242,0.9); border: 1px solid rgba(252,165,165,0.4);'
  }
  return 'background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.8);'
}

function blockChipLabel(job: Job): string {
  const reason = dayStore.job_block_reason(job) ?? ''
  if (reason.includes('Dock')) return 'DOCK'
  if (reason.includes('Liftgate')) return 'LIFT'
  if (reason.includes('Equipment')) return 'EQUIP'
  return 'FULL'
}

function blockChipStyle(job: Job): string {
  const reason = dayStore.job_block_reason(job) ?? ''
  if (reason.includes('Dock') || reason.includes('Liftgate') || reason.includes('Equipment')) {
    return 'background: rgba(254,243,199,0.9); color: #d97706; border: 1px solid rgba(217,119,6,0.3);'
  }
  return 'background: rgba(241,245,249,0.9); color: #94a3b8; border: 1px solid rgba(226,232,240,0.8);'
}
</script>

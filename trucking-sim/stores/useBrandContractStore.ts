import { defineStore } from 'pinia'
import type { BrandContract, Job } from '~/types/game'
import { useGameStore } from '~/stores/useGameStore'

// 3 fictional brand tiers — no real trademarks
const BRAND_SEED: Omit<BrandContract, 'weekly_volume_delivered' | 'active' | 'week_start_day'>[] = [
  {
    id: 'brand-walkmart',
    brand_name: 'Walk-Mart',
    tier: 'local',
    weekly_volume_target: 30,
    payout_per_package: 0,
    weekly_retainer: 420,
  },
  {
    id: 'brand-aroundhome',
    brand_name: 'Around Home',
    tier: 'regional',
    weekly_volume_target: 50,
    payout_per_package: 0,
    weekly_retainer: 750,
  },
  {
    id: 'brand-wegboys',
    brand_name: 'Wegboys',
    tier: 'national',
    weekly_volume_target: 70,
    payout_per_package: 0,
    weekly_retainer: 1100,
  },
]

export const useBrandContractStore = defineStore('brand_contracts', {
  state: () => ({
    contracts: BRAND_SEED.map(b => ({
      ...b,
      weekly_volume_delivered: 0,
      active: false,
      week_start_day: 0,
    })) as BrandContract[],
  }),

  getters: {
    activeContracts(): BrandContract[] {
      return this.contracts.filter(c => c.active)
    },
  },

  actions: {
    activateContract(id: string) {
      const c = this.contracts.find(c => c.id === id)
      if (!c || c.active) return
      c.active = true
      c.week_start_day = useGameStore().company.current_day
      c.weekly_volume_delivered = 0
    },

    deactivateContract(id: string) {
      const c = this.contracts.find(c => c.id === id)
      if (c) { c.active = false; c.weekly_volume_delivered = 0 }
    },

    recordDelivery(brandId: string, count = 1) {
      const c = this.contracts.find(c => c.id === brandId && c.active)
      if (c) c.weekly_volume_delivered += count
    },

    // Tag a subset of delivery jobs with an active brand ID.
    // Called just before startPlanningPhase each day.
    tagJobs(jobs: Job[]): Job[] {
      const active = this.activeContracts
      if (!active.length) return jobs
      return jobs.map((job, i) => {
        if (job.job_type === 'pickup') return job
        // Tag roughly 35% of deliveries, cycling through active brands
        if ((i % 3) !== 0) return job
        const brand = active[Math.floor(i / 3) % active.length]
        return { ...job, brand_id: brand.id }
      })
    },

    // Settle SLA bonus or penalty every 5 days. Call from handleStartNewDay.
    settleWeek(currentDay: number) {
      const gameStore = useGameStore()
      for (const c of this.contracts) {
        if (!c.active) continue
        const daysElapsed = currentDay - c.week_start_day
        if (daysElapsed < 5) continue

        if (c.weekly_volume_delivered >= c.weekly_volume_target) {
          // SLA met — pay retainer bonus
          gameStore.addCash(c.weekly_retainer, `brand-sla-${c.id}`)
        } else {
          // SLA missed — proportional penalty + reputation hit
          const missRatio = c.weekly_volume_delivered / Math.max(1, c.weekly_volume_target)
          const penalty = Math.round(c.weekly_retainer * 0.5 * (1 - missRatio))
          if (penalty > 0) {
            gameStore.deductCash(penalty, `brand-penalty-${c.id}`)
          }
          gameStore.adjustReputation(-3)
          // Severe miss (<50% of target): deactivate the contract
          if (missRatio < 0.5) {
            this.deactivateContract(c.id)
          }
        }

        c.weekly_volume_delivered = 0
        c.week_start_day = currentDay
      }
    },
  },
})

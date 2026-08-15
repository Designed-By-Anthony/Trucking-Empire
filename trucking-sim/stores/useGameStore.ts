import { defineStore } from 'pinia'
import type { Company, ClockSpeed, ExpenseEntry, RevenueEntry } from '~/types/game'

const START_TICK = 6  // 6:00 AM Monday

export const useGameStore = defineStore('game', {
  state: () => ({
    company: {
      name: 'Empire Freight LLC',
      cash: 15000,
      date_tick: START_TICK,
      current_day: 0,
      phase: 0,
      reputation: 75,
      total_revenue: 0,
      total_expenses: 0,
    } as Company,
    clock_speed: 1 as ClockSpeed,
    is_running: false,
    expense_log: [] as ExpenseEntry[],
    revenue_log: [] as RevenueEntry[],
    has_completed_onboarding: typeof localStorage !== 'undefined' && localStorage.getItem('fte_done') === '1',
    onboarding_step: 1 as 1 | 2 | 3 | 4,
  }),

  getters: {
    formattedTime(): string {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const tick = this.company.date_tick
      const dayOfWeek = Math.floor(tick / 24) % 7
      const hour = Math.floor(tick) % 24
      const minutes = Math.floor((tick % 1) * 60)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const h = hour % 12 || 12
      return `${days[dayOfWeek]} ${h}:${minutes.toString().padStart(2, '0')} ${ampm}`
    },

    formattedCash(): string {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(this.company.cash)
    },

    netProfit(): number {
      return this.company.total_revenue - this.company.total_expenses
    },

    recentExpenses(): ExpenseEntry[] {
      return this.expense_log.slice(-50)
    },

    recentRevenue(): RevenueEntry[] {
      return this.revenue_log.slice(-50)
    },
  },

  actions: {
    setClockSpeed(speed: ClockSpeed) {
      this.clock_speed = speed
    },

    pause() {
      this.clock_speed = 0
    },

    advanceTick(hours: number) {
      this.company.date_tick += hours
    },

    advanceDay() {
      this.company.current_day += 1
    },

    setPhase(phase: number) {
      this.company.phase = Math.max(this.company.phase, phase)
    },

    addCash(amount: number, contractId?: string) {
      this.company.cash += amount
      this.company.total_revenue += amount
      this.revenue_log.push({ tick: this.company.date_tick, contract_id: contractId ?? '', amount })
    },

    deductCash(amount: number, category: ExpenseEntry['category'], truckId?: string) {
      this.company.cash -= amount
      this.company.total_expenses += amount
      this.expense_log.push({ tick: this.company.date_tick, category, amount, truck_id: truckId })
    },

    adjustReputation(delta: number) {
      this.company.reputation = Math.max(0, Math.min(100, this.company.reputation + delta))
    },

    startGame() {
      this.is_running = true
    },

    setCompanyName(name: string) {
      this.company.name = name
    },

    advanceOnboardingStep() {
      if (this.onboarding_step < 4) {
        this.onboarding_step = (this.onboarding_step + 1) as 1 | 2 | 3 | 4
      }
    },

    completeOnboarding() {
      this.has_completed_onboarding = true
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fte_done', '1')
      }
    },

    snapToMorning() {
      // Snap clock to 6 AM of the current day so morning board always starts fresh
      this.company.date_tick = this.company.current_day * 24 + 6
    },

    async resetGameToInitialState() {
      this.pause()
      if (typeof localStorage !== 'undefined') localStorage.clear()
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear()

      // Clear service worker caches so the reload gets fresh assets, not a
      // cached build — critical when running as an installed PWA.
      const cleanAndReload = () => {
        if (typeof window !== 'undefined') window.location.reload()
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const [regs, cacheKeys] = await Promise.all([
            navigator.serviceWorker.getRegistrations(),
            caches.keys(),
          ])
          await Promise.all([
            ...regs.map(r => r.unregister()),
            ...cacheKeys.map(k => caches.delete(k)),
          ])
        } catch (_) {
          // SW not available or already gone — just reload
        }
      }
      cleanAndReload()
    },
  },
})

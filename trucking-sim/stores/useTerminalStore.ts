import { defineStore } from 'pinia'
import type { Terminal } from '~/types/game'
import { INITIAL_TERMINALS } from '~/data/terminals'
import { EMPIRE_ZONES } from '~/data/zones'

// Merge terminals + all zones into one registry.
// Zones are Terminal-compatible and needed for contract lookup by ID.
const buildRegistry = (): Terminal[] => {
  const map = new Map<string, Terminal>()
  for (const t of INITIAL_TERMINALS) map.set(t.id, t)
  for (const z of EMPIRE_ZONES) if (!map.has(z.id)) map.set(z.id, z)
  return [...map.values()]
}

export const useTerminalStore = defineStore('terminals', {
  state: () => ({
    terminals: buildRegistry(),
  }),

  getters: {
    unlocked(): Terminal[] {
      return this.terminals.filter(t => t.unlocked)
    },
    getById(): (id: string) => Terminal | undefined {
      return (id: string) => this.terminals.find(t => t.id === id)
    },
    totalOverheadPerHr(): number {
      // Only count owned terminals (INITIAL_TERMINALS), not zones
      return this.terminals
        .filter(t => t.unlocked && t.overhead_per_hr > 0)
        .reduce((sum, t) => sum + t.overhead_per_hr, 0)
    },
  },

  actions: {
    unlockTerminal(id: string) {
      const terminal = this.terminals.find(t => t.id === id)
      if (terminal) terminal.unlocked = true
    },
    addTerminal(terminal: Terminal) {
      if (!this.terminals.find(t => t.id === terminal.id)) {
        this.terminals.push(terminal)
      }
    },
  },
})

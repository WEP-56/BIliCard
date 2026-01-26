import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface CardState {
  id: string
  type: 'feed' | 'detail' | 'utility' | 'search' | 'login' | 'dynamic' | 'bangumi' | 'live'
  x: number
  y: number
  w: number
  h: number
  zIndex: number
  title: string
  content?: any
  isLocked?: boolean
}

interface State {
  cards: Record<string, CardState>
  activeCardId: string | null
  maxZIndex: number
}

interface Actions {
  addCard: (card: Omit<CardState, 'zIndex'>) => void
  updateCard: (id: string, updates: Partial<CardState>) => void
  removeCard: (id: string) => void
  focusCard: (id: string) => void
  toggleCardLock: (id: string) => void
}

export const useCardStore = create<State & Actions>()(
  immer((set) => ({
    cards: {},
    activeCardId: null,
    maxZIndex: 0,

    addCard: (card) =>
      set((state) => {
        state.maxZIndex += 1
        state.cards[card.id] = { ...card, zIndex: state.maxZIndex }
        state.activeCardId = card.id
      }),

    updateCard: (id, updates) =>
      set((state) => {
        if (state.cards[id]) {
          Object.assign(state.cards[id], updates)
        }
      }),

    removeCard: (id) =>
      set((state) => {
        delete state.cards[id]
        if (state.activeCardId === id) state.activeCardId = null
      }),

    focusCard: (id) =>
      set((state) => {
        if (state.cards[id]) {
          // Optimization: check if already focused and top
          if (state.activeCardId === id && state.cards[id].zIndex === state.maxZIndex) {
            return
          }
          state.maxZIndex += 1
          state.cards[id].zIndex = state.maxZIndex
          state.activeCardId = id
        }
      }),
      
    toggleCardLock: (id) =>
      set((state) => {
        if (state.cards[id]) {
            const newLocked = !state.cards[id].isLocked
            state.cards[id].isLocked = newLocked
            if (newLocked) {
                // When locking, ensure it's on top (optional, but requested "always on top")
                // But "always on top" usually means it stays on top even if others are clicked.
                // To achieve true "always on top", we might need a separate layer or just set a very high zIndex.
                // Let's set a high zIndex but still managed by maxZIndex to avoid conflicts if multiple are locked.
                // Or maybe just force it to maxZIndex + 1000?
                // Let's just focus it for now. The "always on top" requirement might need active maintenance.
                // If I click another card, it calls focusCard which increments maxZIndex.
                // So a locked card might be covered.
                // To prevent covering, we should prevent focusCard from incrementing zIndex ABOVE locked cards?
                // Or simply: Locked cards live in a separate zIndex space (e.g. 10000+).
                state.cards[id].zIndex = 9999 + state.maxZIndex // Hacky but effective?
            } else {
                // Restore to normal zIndex range (current max)
                state.maxZIndex += 1
                state.cards[id].zIndex = state.maxZIndex
            }
        }
      }),
  }))
)

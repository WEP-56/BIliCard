import { create } from 'zustand'
import { combine } from 'zustand/middleware'

export const useCanvasStore = create(
  combine(
    {
      x: 0,
      y: 0,
      scale: 1,
      isLocked: false,
    },
    (set) => ({
      setViewport: (x: number, y: number, scale: number) => set({ x, y, scale }),
      toggleLock: () => set((state) => ({ isLocked: !state.isLocked })),
      moveViewport: (dx: number, dy: number) => set((state) => {
        if (state.isLocked) return {}
        return { x: state.x + dx, y: state.y + dy }
      }),
      zoomViewport: (factor: number) =>
        set((state) => {
          const newScale = Math.max(0.1, Math.min(5, state.scale * factor))
          return { scale: newScale }
        }),
    })
  )
)

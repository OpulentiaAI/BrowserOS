import { create } from 'zustand'

const initialState = {
  messages: [],
  isProcessing: false,
  error: null
}

const normalizeMessage = (message) => ({
  msgId: message.msgId,
  role: message.role,
  content: message.content,
  timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
  metadata: message.metadata || {}
})

export const useChatStore = create((set) => ({
  ...initialState,

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, normalizeMessage(message)]
    }))
  },

  upsertMessage: (message) => {
    set((state) => {
      const existingIndex = state.messages.findIndex((m) => m.msgId === message.msgId)
      if (existingIndex >= 0) {
        const updated = [...state.messages]
        updated[existingIndex] = normalizeMessage({
          ...updated[existingIndex],
          ...message,
          timestamp: message.timestamp || updated[existingIndex].timestamp
        })
        return { messages: updated, error: null }
      }

      return {
        messages: [...state.messages, normalizeMessage(message)],
        error: null
      }
    })
  },

  setProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  clearMessages: () => set({ messages: [] }),

  reset: () => set(initialState)
}))

export const selectMessages = (state) => state.messages
export const selectIsProcessing = (state) => state.isProcessing

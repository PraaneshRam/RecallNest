export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://recallnest.onrender.com')

export const getApiUrl = (path: string) => {
  return `${API_BASE_URL}${path}`
}

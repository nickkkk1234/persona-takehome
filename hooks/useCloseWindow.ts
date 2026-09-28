import { useEffect } from "react"

export const useCloseWindow = () => {
  useEffect(() => {
    window.close()
  }, [])
}

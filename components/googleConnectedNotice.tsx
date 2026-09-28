"use client"

import { useCloseWindow } from "@/hooks/useCloseWindow"

export const GoogleConnectedNotice = () => {
  useCloseWindow()
  return <p className="text-body text-text-tertiary">Google is connected. You can close this window.</p>
}

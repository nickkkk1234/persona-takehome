import type { MouseEvent } from "react"

const POPUP_FEATURES = "popup,width=520,height=680"

export const openInGooglePopup = (event: MouseEvent<HTMLAnchorElement>) => {
  const popup = window.open(event.currentTarget.href, "google-connect", POPUP_FEATURES)
  if (popup) event.preventDefault()
}

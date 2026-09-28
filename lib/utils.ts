import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["title", "section", "display", "nav", "body", "row", "row-title", "meta", "micro", "badge"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isPresent = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

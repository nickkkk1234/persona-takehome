import { MemoryEvidence, MemoryKind } from "@/lib/generated/prisma/enums"

export const getMemorySourceLabel = (evidence: MemoryEvidence) => {
  switch (evidence) {
    case MemoryEvidence.CALL:
      return "From a call"
    case MemoryEvidence.CHAT:
      return "From chat"
    case MemoryEvidence.GOOGLE:
      return "From Google"
    default: {
      const _absurd: never = evidence
      return _absurd
    }
  }
}

export const getMemoryKindLabel = (kind: MemoryKind) => {
  switch (kind) {
    case MemoryKind.GOAL:
      return "Goal"
    case MemoryKind.FACT:
      return "Fact"
    case MemoryKind.INSIGHT:
      return "Insight"
    default: {
      const _absurd: never = kind
      return _absurd
    }
  }
}

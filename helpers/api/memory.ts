import "server-only"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod"
import { db } from "@/lib/db"
import { MemoryStatus, type MemoryEvidence, type MemoryKind } from "@/lib/generated/prisma/enums"
import { getOpenAI, REASONING_EFFORT, TEXT_MODEL } from "@/helpers/api/openai"

const NAME_PATTERN = /\b(?:name|nickname|call (?:you|me|them|the assistant))\b/i
const SETUP_PATTERN =
  /\b(?:connect|connecting|link|linking|hook up)\b.{0,40}\b(?:google|gmail|calendar|drive|account|workspace)\b|\b(?:later|another time|not now|at some point)\b/i

export const isDurableMemory = (content: string) => !NAME_PATTERN.test(content) && !SETUP_PATTERN.test(content)

type MemoryCandidate = { kind: MemoryKind; content: string; evidence: MemoryEvidence; sourceUrl?: string }

const decisionSchema = z.object({
  decisions: z.array(
    z.object({
      candidate: z.number().describe("Index of the candidate this decision is for."),
      action: z.enum(["create", "update", "skip"]),
      memoryId: z.string().nullable().describe("For update, the id of the existing memory to rewrite. Otherwise null."),
      content: z
        .string()
        .describe("For create, the candidate as written. For update, one sentence merging both. For skip, empty."),
    }),
  ),
})

type MemoryDecision = z.infer<typeof decisionSchema>["decisions"][number]

const decideMemoryChanges = async (
  candidates: MemoryCandidate[],
  existing: { id: string; content: string }[],
  rejected: { content: string }[],
) => {
  const response = await getOpenAI().responses.parse({
    model: TEXT_MODEL,
    reasoning: { effort: REASONING_EFFORT },
    store: false,
    instructions: `You keep a personal assistant's memory about a user tidy. For each candidate, decide:
- update: it's about the same thing as an existing memory (even if worded differently or adding detail). Rewrite that memory as one sentence that keeps every detail from both.
- skip: an existing memory already says it, it restates something the user rejected, or another candidate in this batch already covers it.
- create: it's genuinely new.
Write in second person, like the existing memories.`,
    input: JSON.stringify({
      existing,
      rejected: rejected.map((memory) => memory.content),
      candidates: candidates.map((candidate, index) => ({ index, content: candidate.content })),
    }),
    text: { format: zodTextFormat(decisionSchema, "memory_decisions") },
  })
  return response.output_parsed?.decisions ?? []
}

export const saveMemories = async (userId: string, candidates: MemoryCandidate[]) => {
  const durable = candidates.filter((candidate) => isDurableMemory(candidate.content))
  if (durable.length === 0) return []
  const memories = await db.memory.findMany({ where: { userId }, select: { id: true, content: true, status: true } })
  const existing = memories.filter((memory) => memory.status === MemoryStatus.ACCEPTED)
  const rejected = memories.filter((memory) => memory.status === MemoryStatus.REJECTED)
  const decisions: MemoryDecision[] =
    memories.length === 0 && durable.length === 1
      ? durable.map((candidate, index) => ({ candidate: index, action: "create", memoryId: null, content: candidate.content }))
      : await decideMemoryChanges(durable, existing, rejected)
  const existingIds = new Set(existing.map((memory) => memory.id))

  const operations = decisions.flatMap((decision) => {
    const candidate = durable[decision.candidate]
    if (!candidate || decision.action === "skip" || decision.content.trim().length === 0) return []
    const content = decision.content.trim()
    if (decision.action === "update" && decision.memoryId && existingIds.has(decision.memoryId)) {
      return [
        db.memory.update({
          where: { id: decision.memoryId },
          data: {
            content,
            evidence: candidate.evidence,
            ...(candidate.sourceUrl ? { sourceUrl: candidate.sourceUrl } : {}),
          },
        }),
      ]
    }
    return [
      db.memory.create({
        data: { userId, kind: candidate.kind, content, evidence: candidate.evidence, sourceUrl: candidate.sourceUrl },
      }),
    ]
  })
  return db.$transaction(operations)
}

// Run with `npm run fish:sync` after changing tools or call settings.
import { z } from "zod"
import { CALL_TOOL_NAMES, TOOL_DEFINITIONS } from "@/helpers/util/toolDefinitions"

process.loadEnvFile(".env.local")

const FISH_API_URL = "https://api.fish.audio/v1/agent"
const AGENT_NAME = "Persona onboarding"
// "Uk": a young, calm and relaxed British male voice from the Fish voice library.
const VOICE_ID = "7688cb14712946f88602249ca0c0ab0d"
const LLM_MODEL = "openai/gpt-5.6-luna"

const INTERRUPTION_IGNORE_PHRASES = [
  "mm",
  "mhm",
  "mm-hmm",
  "uh-huh",
  "uh",
  "um",
  "hmm",
  "yeah",
  "yep",
  "right",
  "okay",
  "ok",
  "sure",
  "got it",
  "cool",
  "nice",
]

const apiKey = z.string().min(1, "FISH_API_KEY is missing from .env.local.").parse(process.env.FISH_API_KEY)
const existingAgentId = process.env.FISH_AGENT_ID

const requestFish = async (path: string, method: string, body?: unknown) => {
  const response = await fetch(`${FISH_API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Fish ${method} ${path} failed with ${response.status}: ${text}`)
  }
  return text.length > 0 ? JSON.parse(text) : {}
}

const toolListSchema = z.object({
  tools: z.array(z.object({ tool_id: z.string(), name: z.string() })),
})
const toolSchema = z.object({ tool_id: z.string() })
const agentSchema = z.object({ agent_id: z.string() })
const publishSchema = z.object({ version_number: z.number() })

const buildToolPayload = (name: (typeof CALL_TOOL_NAMES)[number]) => {
  const definition = TOOL_DEFINITIONS[name]
  return {
    name,
    description: definition.description,
    expects_response: true,
    timeout_seconds: 30,
    arguments: Object.entries(definition.input.shape).map(([argumentName, schema]) => ({
      name: argumentName,
      description: schema.description ?? "",
    })),
  }
}

const syncTool = async (name: (typeof CALL_TOOL_NAMES)[number], existingTools: Map<string, string>) => {
  const payload = buildToolPayload(name)
  const existingToolId = existingTools.get(name)
  if (existingToolId) {
    await requestFish(`/tools/${existingToolId}`, "PATCH", payload)
    return existingToolId
  }
  return toolSchema.parse(await requestFish("/tools", "POST", { ...payload, tool_type: "client" })).tool_id
}

const main = async () => {
  const { tools } = toolListSchema.parse(await requestFish("/tools?limit=100", "GET"))
  const existingTools = new Map(tools.map((tool) => [tool.name, tool.tool_id]))
  const toolIds = await Promise.all(CALL_TOOL_NAMES.map((name) => syncTool(name, existingTools)))

  const configuration = {
    prompt: {
      system_prompt: "You are Persona, a friendly personal assistant on a phone call. Keep replies short.",
      first_message_mode: "fixed",
      first_message: "Hey, it's Persona. Got a few minutes?",
    },
    voice: { voice_id: VOICE_ID, speaking_language: "en", speed: 1.1, expressive: true },
    conversation: {
      interruptible: true,
      interruption_sensitivity: "low",
      interruption_ignore_phrases: INTERRUPTION_IGNORE_PHRASES,
      eagerness: "balanced",
      response_wait_ms: 400,
      reengage_enabled: true,
      max_duration_seconds: 1800,
    },
    llm: { model: LLM_MODEL },
    tools: { enabled: true, tool_ids: toolIds, system_tools: { hang_up_call: true } },
  }

  const agentId = existingAgentId
    ? existingAgentId
    : agentSchema.parse(await requestFish("/agents", "POST", { name: AGENT_NAME, config: configuration })).agent_id
  if (existingAgentId) {
    await requestFish(`/agents/${agentId}/config`, "PATCH", configuration)
  }

  const { version_number } = publishSchema.parse(
    await requestFish(`/agents/${agentId}/publish`, "POST", { version_title: new Date().toISOString() }),
  )
  console.log(`Published ${AGENT_NAME} version ${version_number} with ${toolIds.length} tools.`)
  console.log(`FISH_AGENT_ID=${agentId}`)
}

const run = async () => {
  try {
    await main()
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}

run()

import "server-only"
import { z } from "zod"

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  FISH_API_KEY: z.string().min(1),
  FISH_AGENT_ID: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((value) => Buffer.from(value, "base64").length === 32, "TOKEN_ENCRYPTION_KEY must be 32 bytes of base64."),
  GMAIL_CLIENT_ID: z.string().min(1),
  GMAIL_CLIENT_SECRET: z.string().min(1),
  APP_URL: z.url().default("http://localhost:3000"),
})

const cache: { environment?: z.infer<typeof environmentSchema> } = {}

export const getEnvironment = () => {
  if (cache.environment) return cache.environment
  const result = environmentSchema.safeParse(process.env)
  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`)
  }
  cache.environment = result.data
  return result.data
}

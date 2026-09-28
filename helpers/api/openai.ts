import "server-only"
import OpenAI from "openai"
import { getEnvironment } from "@/helpers/api/environment"

export const TEXT_MODEL = "gpt-5.6-terra"
export const REASONING_EFFORT = "medium"

const cache: { client?: OpenAI } = {}

export const getOpenAI = () => {
  cache.client ??= new OpenAI({ apiKey: getEnvironment().OPENAI_API_KEY })
  return cache.client
}

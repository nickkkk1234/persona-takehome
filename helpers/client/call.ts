import { FishAgentError } from "@fishaudio/agent-client"

export const describeCallStartError = (error: unknown) =>
  error instanceof FishAgentError && error.code === "mic_permission_denied"
    ? "Allow microphone access to call. You can keep texting in the meantime."
    : "Couldn't start the call. Try again in a moment, or keep texting."


export const frameCallNotice = (content: string) =>
  `(This isn't from them, it's an update for you. ${content} Say it naturally and calmly, without repeating anything you already said.)`

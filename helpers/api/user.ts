import "server-only"
import { db } from "@/lib/db"
import { saveAgentTexts } from "@/helpers/api/message"

const GREETING_TEXTS = [
  "Hey! I'm Persona, your new personal assistant.",
  `A few things you can ask me:
- "What's on my calendar tomorrow?"
- "Find the email with my flight details"
- "Send me a digest of important emails every weekday at 8"`,
  "The quickest way for me to get to know you is a short call. Tap the phone at the top whenever you're ready, or just text me here. First, what's your name?",
]

export const createUserWithGreeting = async () => {
  const user = await db.user.create({ data: {} })
  await saveAgentTexts(user.id, GREETING_TEXTS)
  return user
}

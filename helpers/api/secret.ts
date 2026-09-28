import "server-only"
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { getEnvironment } from "@/helpers/api/environment"

const ALGORITHM = "aes-256-gcm"

const getKey = () => Buffer.from(getEnvironment().TOKEN_ENCRYPTION_KEY, "base64")

export const encryptSecret = (plaintext: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".")
}

export const decryptSecret = (encrypted: string) => {
  const [iv, authTag, ciphertext] = encrypted.split(".").map((part) => Buffer.from(part, "base64url"))
  if (!iv || !authTag || !ciphertext) {
    throw new Error("Encrypted secret is malformed.")
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

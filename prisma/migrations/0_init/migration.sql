-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "MemoryKind" AS ENUM ('GOAL', 'FACT', 'AUTOMATION', 'INSIGHT');

-- CreateEnum
CREATE TYPE "MemoryEvidence" AS ENUM ('CALL', 'CHAT', 'GOOGLE');

-- CreateEnum
CREATE TYPE "MemoryStatus" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "userName" TEXT,
    "agentName" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "transcript" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "MemoryKind" NOT NULL,
    "content" TEXT NOT NULL,
    "evidence" "MemoryEvidence" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" "MemoryStatus" NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "scopes" TEXT[],
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_userId_createdAt_idx" ON "Message"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Call_userId_startedAt_idx" ON "Call"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Memory_userId_status_idx" ON "Memory"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleConnection_googleId_key" ON "GoogleConnection"("googleId");

-- CreateIndex
CREATE INDEX "GoogleConnection_userId_idx" ON "GoogleConnection"("userId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleConnection" ADD CONSTRAINT "GoogleConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


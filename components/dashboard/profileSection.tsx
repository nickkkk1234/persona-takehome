"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { ProfileField } from "@/types/dashboard"
import { updateProfile } from "@/app/actions"
import { DashboardRow, DashboardSection, RowText } from "@/components/dashboard/dashboardSection"
import { Input } from "@/components/ui/input"

type ProfileInputProps = {
  field: ProfileField
  label: string
  placeholder: string
  initialValue: string | null
}

const ProfileInput = ({ field, label, placeholder, initialValue }: ProfileInputProps) => {
  const [value, setValue] = useState(initialValue ?? "")
  const [savedValue, setSavedValue] = useState(initialValue ?? "")
  const [, startTransition] = useTransition()

  const save = () => {
    if (value.trim() === savedValue) return
    startTransition(async () => {
      try {
        await updateProfile(field, value)
        setSavedValue(value.trim())
      } catch (error) {
        console.warn(`Could not save ${field}.`, error)
        toast.error("Couldn't save that. Try again.")
      }
    })
  }

  return (
    <DashboardRow>
      <RowText title={label} />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
        placeholder={placeholder}
        aria-label={label}
        className="h-(--action-height) w-48 rounded-full border-border-field px-(--space-7) text-row shadow-none focus-visible:border-border-field focus-visible:ring-0 md:text-row"
      />
    </DashboardRow>
  )
}

type ProfileSectionProps = { userName: string | null; agentName: string | null }

export const ProfileSection = ({ userName, agentName }: ProfileSectionProps) => (
  <DashboardSection title="Profile">
    <ProfileInput field="userName" label="Your name" placeholder="Add your name" initialValue={userName} />
    <ProfileInput field="agentName" label="Agent name" placeholder="Persona" initialValue={agentName} />
  </DashboardSection>
)

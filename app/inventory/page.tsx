"use client"

import { useRouter } from "next/navigation"
import { InventoryPage } from "@/components/InventoryPage"

export default function InventoryRoutePage() {
  const router = useRouter()
  return <InventoryPage onBack={() => router.push("/")} />
}

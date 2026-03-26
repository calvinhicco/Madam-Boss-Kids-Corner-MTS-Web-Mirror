import type { Inventory, InventoryItem, SaleRecord, SalesUser, StockActionType, StockLogEntry } from "@/types/inventory"

const STORAGE_KEYS = {
  INVENTORIES: "studentTrackInventories",
  SALES: "studentTrackSales",
  SALES_USERS: "studentTrackSalesUsers",
  CURRENT_YEAR: "studentTrackCurrentYear",
} as const

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function nowISO() {
  return new Date().toISOString()
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function computeProfit(costPrice: number, unitPrice: number) {
  const profit = (unitPrice || 0) - (costPrice || 0)
  const profitMargin = unitPrice > 0 ? (profit / unitPrice) * 100 : 0
  return { profit, profitMargin }
}

function syncToFirestore() {
  const w = typeof window !== "undefined" ? (window as any) : null
  const api = w?.electronAPI
  if (api && typeof api.syncToFirestore === "function") {
    try {
      api.syncToFirestore()
    } catch {
      // ignore
    }
  }
}

export function getInventories(): Inventory[] {
  if (typeof window === "undefined") return []
  return safeParseJSON<Inventory[]>(localStorage.getItem(STORAGE_KEYS.INVENTORIES), [])
}

export function saveInventories(inventories: Inventory[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.INVENTORIES, JSON.stringify(inventories))
  syncToFirestore()
}

export function findOrCreateInventory(name: string): Inventory {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error("Inventory name is required")
  }

  const year = getCurrentInventoryYear()
  const inventories = getInventories()
  const found = inventories.find((i) => i.inventoryName === trimmed && i.year === year)
  if (found) return found

  const created: Inventory = {
    inventoryName: trimmed,
    createdAt: nowISO(),
    year,
    items: [],
  }

  saveInventories([...inventories, created])
  return created
}

export function upsertInventory(inventory: Inventory): void {
  const inventories = getInventories()
  const idx = inventories.findIndex(
    (i) => i.inventoryName === inventory.inventoryName && i.year === inventory.year
  )

  if (idx >= 0) {
    inventories[idx] = inventory
  } else {
    inventories.push(inventory)
  }

  saveInventories(inventories)
}

export function appendStockLog(
  inventoryName: string,
  itemName: string,
  quantity: number,
  actionType: StockActionType,
  options?: { note?: string | null; createdBy?: string | null; costPrice?: number; unitPrice?: number }
): Inventory {
  const inventory = findOrCreateInventory(inventoryName)
  const itemIdx = inventory.items.findIndex((it) => it.itemName === itemName)

  const year = inventory.year
  const entry: StockLogEntry = {
    id: makeId(),
    inventoryName,
    itemName,
    quantityChange: quantity,
    actionType,
    note: options?.note ?? null,
    createdAt: nowISO(),
    year,
    createdBy: options?.createdBy ?? null,
  }

  if (itemIdx >= 0) {
    const existing = inventory.items[itemIdx]
    const newQty = Math.max(0, (existing.quantity || 0) + quantity)
    inventory.items[itemIdx] = {
      ...existing,
      quantity: newQty,
      stockLog: [...(existing.stockLog || []), entry],
    }
  } else {
    const costPrice = options?.costPrice ?? 0
    const sellingPrice = options?.unitPrice ?? 0
    const { profit, profitMargin } = computeProfit(costPrice, sellingPrice)

    const newItem: InventoryItem = {
      itemName,
      quantity: Math.max(0, quantity),
      costPrice,
      sellingPrice,
      profit,
      profitMargin,
      createdAt: nowISO(),
      lowStockThreshold: 0,
      stockLog: [entry],
    }

    inventory.items.push(newItem)
  }

  upsertInventory(inventory)
  return inventory
}

export function updateInventoryItem(
  inventoryName: string,
  itemName: string,
  updates: Partial<Omit<InventoryItem, "itemName" | "stockLog" | "createdAt">> & {
    stockLog?: StockLogEntry[]
  }
): Inventory {
  const inventory = findOrCreateInventory(inventoryName)
  const itemIdx = inventory.items.findIndex((it) => it.itemName === itemName)
  if (itemIdx < 0) {
    throw new Error("Item not found")
  }

  const existing = inventory.items[itemIdx]
  const next: InventoryItem = {
    ...existing,
    ...updates,
    itemName: existing.itemName,
    stockLog: updates.stockLog ?? existing.stockLog,
    createdAt: existing.createdAt,
  }

  if (typeof updates.costPrice === "number" || typeof updates.sellingPrice === "number") {
    const costPrice = typeof next.costPrice === "number" ? next.costPrice : 0
    const sellingPrice = typeof next.sellingPrice === "number" ? next.sellingPrice : 0
    const { profit, profitMargin } = computeProfit(costPrice, sellingPrice)
    next.profit = profit
    next.profitMargin = profitMargin
  }

  inventory.items[itemIdx] = next
  upsertInventory(inventory)
  return inventory
}

export function getSales(): SaleRecord[] {
  if (typeof window === "undefined") return []
  return safeParseJSON<SaleRecord[]>(localStorage.getItem(STORAGE_KEYS.SALES), [])
}

export function saveSales(sales: SaleRecord[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales))
  syncToFirestore()
}

export function getSalesUsers(): SalesUser[] {
  if (typeof window === "undefined") return []
  return safeParseJSON<SalesUser[]>(localStorage.getItem(STORAGE_KEYS.SALES_USERS), [])
}

export function saveSalesUsers(users: SalesUser[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.SALES_USERS, JSON.stringify(users))
  syncToFirestore()
}

export function getCurrentInventoryYear(): number {
  if (typeof window === "undefined") return new Date().getFullYear()
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_YEAR)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : new Date().getFullYear()
}

export function setCurrentInventoryYear(year: number): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.CURRENT_YEAR, String(year))
  syncToFirestore()
}

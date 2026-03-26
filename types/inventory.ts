export type StockActionType = "add" | "restock" | "edit" | "sale" | "reverse" | "delete"

export interface StockLogEntry {
  id: string
  inventoryName: string
  itemName: string
  quantityChange: number
  actionType: StockActionType
  note?: string | null
  createdAt: string
  year: number
  createdBy?: string | null
}

export interface InventoryItem {
  itemName: string
  quantity: number
  costPrice: number
  sellingPrice: number
  profit: number
  profitMargin: number
  createdAt: string
  defaultPrice?: number
  lowStockThreshold: number
  stockLog: StockLogEntry[]
}

export interface Inventory {
  inventoryName: string
  createdAt: string
  year: number
  items: InventoryItem[]
}

export interface SaleRecord {
  id: string
  inventoryName: string
  itemName: string
  quantitySold: number
  costPrice: number
  unitPrice: number
  profit: number
  profitMargin: number
  total: number
  soldAt: string
  soldBy: string
  year: number
  status: "completed" | "reversed"
  reversedAt: string | null
  reversedBy: string | null
  reversalReason: string | null
}

export interface SalesUser {
  username: string
  pinHash: string
  createdAt: string
  lastLoginAt: string | null
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Boxes, AlertTriangle } from "lucide-react"
import { subscribe, getInitial } from "@/lib/realtime"
import type { Inventory, SaleRecord, SalesUser } from "@/types/inventory"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface InventoryPageProps {
  onBack: () => void
}

type ReportMode = "daily" | "monthly"

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "0.00"
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseISODateSafe(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function InventoryPage({ onBack }: InventoryPageProps) {
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeInventoryName, setActiveInventoryName] = useState<string | null>(null)
  const [activeYear, setActiveYear] = useState<number | null>(null)

  const [reportMode, setReportMode] = useState<ReportMode>("daily")
  const [reportDate, setReportDate] = useState<string>(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    return `${yyyy}-${mm}`
  })

  useEffect(() => {
    let unsubInventories: (() => void) | null = null
    let unsubSales: (() => void) | null = null
    let unsubSalesUsers: (() => void) | null = null

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const [inv0, sales0, users0] = await Promise.all([
          getInitial<Inventory>("inventories"),
          getInitial<SaleRecord>("sales"),
          getInitial<SalesUser>("salesUsers"),
        ])

        setInventories(inv0)
        setSales(sales0)
        setSalesUsers(users0)

        unsubInventories = subscribe<Inventory>("inventories", (docs) => setInventories(docs))
        unsubSales = subscribe<SaleRecord>("sales", (docs) => setSales(docs))
        unsubSalesUsers = subscribe<SalesUser>("salesUsers", (docs) => setSalesUsers(docs))
      } catch (e: any) {
        setError(e?.message || "Failed to load inventory data")
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => {
      unsubInventories?.()
      unsubSales?.()
      unsubSalesUsers?.()
    }
  }, [])

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const inv of inventories) {
      if (typeof inv.year === "number") set.add(inv.year)
    }
    const arr = Array.from(set)
    arr.sort((a, b) => b - a)
    return arr
  }, [inventories])

  useEffect(() => {
    if (activeYear == null) {
      setActiveYear(years[0] ?? new Date().getFullYear())
    }
  }, [activeYear, years])

  const inventoryNamesForYear = useMemo(() => {
    const set = new Set<string>()
    for (const inv of inventories) {
      if (activeYear != null && inv.year !== activeYear) continue
      if (inv.inventoryName) set.add(inv.inventoryName)
    }
    const arr = Array.from(set)
    arr.sort((a, b) => a.localeCompare(b))
    return arr
  }, [inventories, activeYear])

  useEffect(() => {
    if (!activeInventoryName) {
      setActiveInventoryName(inventoryNamesForYear[0] ?? null)
    } else if (!inventoryNamesForYear.includes(activeInventoryName)) {
      setActiveInventoryName(inventoryNamesForYear[0] ?? null)
    }
  }, [activeInventoryName, inventoryNamesForYear])

  const activeInventory = useMemo(() => {
    if (!activeInventoryName || activeYear == null) return null
    return (
      inventories.find((i) => i.inventoryName === activeInventoryName && i.year === activeYear) ?? null
    )
  }, [inventories, activeInventoryName, activeYear])

  const items = activeInventory?.items ?? []

  const totalStockValueCost = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity || 0) * (it.costPrice || 0), 0)
  }, [items])

  const totalStockValueSell = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity || 0) * (it.sellingPrice || 0), 0)
  }, [items])

  const lowStockItems = useMemo(() => {
    return items
      .filter((it) => (it.lowStockThreshold || 0) > 0 && (it.quantity || 0) <= (it.lowStockThreshold || 0))
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
  }, [items])

  const salesForActive = useMemo(() => {
    if (!activeInventoryName || activeYear == null) return []
    return sales
      .filter((s) => s.inventoryName === activeInventoryName && s.year === activeYear)
      .sort((a, b) => {
        const da = parseISODateSafe(a.soldAt)?.getTime() ?? 0
        const db = parseISODateSafe(b.soldAt)?.getTime() ?? 0
        return db - da
      })
  }, [sales, activeInventoryName, activeYear])

  const reportSales = useMemo(() => {
    if (!activeInventoryName || activeYear == null) return []

    const base = sales.filter((s) => s.inventoryName === activeInventoryName && s.year === activeYear)

    if (reportMode === "daily") {
      const d = parseISODateSafe(reportDate)
      if (!d) return []
      const yyyy = d.getFullYear()
      const mm = d.getMonth()
      const dd = d.getDate()
      return base.filter((s) => {
        const sold = parseISODateSafe(s.soldAt)
        if (!sold) return false
        return sold.getFullYear() === yyyy && sold.getMonth() === mm && sold.getDate() === dd
      })
    }

    const [yyyyS, mmS] = reportMonth.split("-")
    const yyyy = Number(yyyyS)
    const mm = Number(mmS) - 1
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm)) return []

    return base.filter((s) => {
      const sold = parseISODateSafe(s.soldAt)
      if (!sold) return false
      return sold.getFullYear() === yyyy && sold.getMonth() === mm
    })
  }, [sales, activeInventoryName, activeYear, reportMode, reportDate, reportMonth])

  const reportTotals = useMemo(() => {
    const completed = reportSales.filter((s) => s.status === "completed")
    const reversed = reportSales.filter((s) => s.status === "reversed")

    const totals = {
      completedCount: completed.length,
      reversedCount: reversed.length,
      unitsSold: completed.reduce((sum, s) => sum + (s.quantitySold || 0), 0),
      revenue: completed.reduce((sum, s) => sum + (s.total || 0), 0),
      profit: completed.reduce((sum, s) => sum + (s.profit || 0), 0),
    }

    return totals
  }, [reportSales])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Boxes className="w-5 h-5" /> Inventory
          </h1>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading inventory…</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Boxes className="w-5 h-5" /> Inventory
            </h1>
            <Badge variant="secondary">Read-only</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Synced from the desktop app. Editing is disabled in the web mirror.
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-base">Active inventory</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <Select
              value={activeYear != null ? String(activeYear) : undefined}
              onValueChange={(v) => setActiveYear(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={activeInventoryName ?? undefined}
              onValueChange={(v) => setActiveInventoryName(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select inventory" />
              </SelectTrigger>
              <SelectContent>
                {inventoryNamesForYear.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Badge variant="outline">Items: {items.length}</Badge>
              <Badge variant="outline">Sales: {salesForActive.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeInventory && (
            <div className="text-sm text-muted-foreground">
              No inventory data found for the selected year.
            </div>
          )}

          {activeInventory && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Stock value (cost)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatMoney(totalStockValueCost)}</CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Stock value (selling)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatMoney(totalStockValueSell)}</CardContent>
              </Card>

              <Card className={lowStockItems.length > 0 ? "border-amber-200" : undefined}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Low stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {lowStockItems.length === 0 ? (
                    "No low stock items."
                  ) : (
                    <div className="space-y-1">
                      {lowStockItems.slice(0, 5).map((it) => (
                        <div key={it.itemName} className="flex items-center justify-between">
                          <span className="truncate">{it.itemName}</span>
                          <Badge variant="secondary">{it.quantity}</Badge>
                        </div>
                      ))}
                      {lowStockItems.length > 5 && (
                        <div className="text-xs">+{lowStockItems.length - 5} more…</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No items in this inventory.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Low stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items
                  .slice()
                  .sort((a, b) => a.itemName.localeCompare(b.itemName))
                  .map((it) => (
                    <TableRow key={it.itemName}>
                      <TableCell className="font-medium">{it.itemName}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">{formatMoney(it.costPrice)}</TableCell>
                      <TableCell className="text-right">{formatMoney(it.sellingPrice)}</TableCell>
                      <TableCell className="text-right">{formatMoney(it.profit)}</TableCell>
                      <TableCell className="text-right">{(it.profitMargin || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {(it.lowStockThreshold || 0) > 0 ? it.lowStockThreshold : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-base">Sales report</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <Select value={reportMode} onValueChange={(v) => setReportMode(v as ReportMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            {reportMode === "daily" ? (
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            ) : (
              <Input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            )}

            <div className="flex items-center gap-2">
              <Badge variant="outline">Revenue: {formatMoney(reportTotals.revenue)}</Badge>
              <Badge variant="outline">Profit: {formatMoney(reportTotals.profit)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completed</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{reportTotals.completedCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reversed</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{reportTotals.reversedCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Units sold</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{reportTotals.unitsSold}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatMoney(reportTotals.revenue)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Profit</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatMoney(reportTotals.profit)}</CardContent>
            </Card>
          </div>

          {reportSales.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sales found for this period.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sold at</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Sold by</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportSales
                  .slice()
                  .sort((a, b) => {
                    const da = parseISODateSafe(a.soldAt)?.getTime() ?? 0
                    const db = parseISODateSafe(b.soldAt)?.getTime() ?? 0
                    return db - da
                  })
                  .map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {parseISODateSafe(s.soldAt)?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">{s.itemName}</TableCell>
                      <TableCell className="text-right">{s.quantitySold}</TableCell>
                      <TableCell className="text-right">{formatMoney(s.unitPrice)}</TableCell>
                      <TableCell className="text-right">{formatMoney(s.total)}</TableCell>
                      <TableCell>{s.soldBy}</TableCell>
                      <TableCell>
                        {s.status === "completed" ? (
                          <Badge>completed</Badge>
                        ) : (
                          <Badge variant="secondary">reversed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales users</CardTitle>
        </CardHeader>
        <CardContent>
          {salesUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sales users.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesUsers
                  .slice()
                  .sort((a, b) => a.username.localeCompare(b.username))
                  .map((u) => (
                    <TableRow key={u.username}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {parseISODateSafe(u.createdAt)?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {parseISODateSafe(u.lastLoginAt)?.toLocaleString() ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

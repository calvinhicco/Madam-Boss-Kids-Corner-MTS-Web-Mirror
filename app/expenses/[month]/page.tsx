"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getInitial, subscribe } from '@/lib/realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Receipt, Loader2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

interface Expense {
  id: string
  description?: string
  purpose?: string
  amount: number
  date: string
  category: string
  receiptNumber?: string
  notes?: string
  isReversed?: boolean
  reversedAt?: string
  reversalReason?: string
}

type PageProps = {
  params: {
    month: string
  }
}

function safeParseDate(dateString: string) {
  const d = new Date(dateString)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function ExpensesMonthPage({ params }: PageProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()

  const monthNumber = params.month
  const monthIndex = useMemo(() => {
    const parsed = Number.parseInt(monthNumber, 10)
    if (!Number.isFinite(parsed)) return null
    if (parsed < 1 || parsed > 12) return null
    return parsed - 1
  }, [monthNumber])

  const monthLabel = useMemo(() => {
    if (monthIndex === null) return null
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(currentYear, monthIndex, 1))
  }, [currentYear, monthIndex])

  const isMonthAllowed = monthIndex !== null && monthIndex <= currentMonthIndex

  useEffect(() => {
    if (!isMonthAllowed) {
      setLoading(false)
      setError('This month is not available yet.')
      return
    }

    const filterToMonth = (all: Expense[]) => {
      return (all || []).filter((exp) => {
        const d = safeParseDate(exp.date)
        if (!d) return false
        return d.getFullYear() === currentYear && d.getMonth() === monthIndex
      })
    }

    const fetchExpenses = async (forceFresh = false) => {
      try {
        setLoading(true)
        setError(null)

        const expensesData = await getInitial<Expense>('expenses', forceFresh)
        setExpenses(filterToMonth(expensesData || []))
        setLoading(false)
      } catch (err) {
        console.error('❌ Error fetching expenses:', err)
        setError('Failed to load expenses. Please try again later.')
        setLoading(false)
      }
    }

    fetchExpenses(true)

    const unsubscribe = subscribe<Expense>('expenses', (updatedExpenses) => {
      setExpenses(filterToMonth(updatedExpenses || []))
    })

    const autoRefreshInterval = setInterval(() => {
      fetchExpenses(false)
    }, 30000)

    return () => {
      if (unsubscribe) unsubscribe()
      clearInterval(autoRefreshInterval)
    }
  }, [currentYear, isMonthAllowed, monthIndex])

  const activeExpenses = expenses.filter((expense) => !expense.isReversed)
  const reversedExpenses = expenses.filter((expense) => expense.isReversed)

  const totalActive = activeExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  const totalReversed = reversedExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

  // Group by category
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    activeExpenses.forEach((exp) => {
      const cat = exp.category || 'Uncategorized'
      totals[cat] = (totals[cat] || 0) + (exp.amount || 0)
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [activeExpenses])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/expenses">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/expenses">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>

          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {monthLabel || 'Expenses'}
            <span className="text-sm text-muted-foreground font-normal ml-2">({currentYear})</span>
          </h1>
        </div>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No expenses found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No expenses were found for {monthLabel} {currentYear}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-800">Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-600">Total Active Expenses</p>
                  <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalActive)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Reversed</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(totalReversed)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Expenses</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalActive)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {categoryTotals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categoryTotals.map(([category, total]) => (
                    <div key={category} className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground capitalize">{category}</p>
                      <p className="text-lg font-semibold">{formatCurrency(total)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {expenses.map((expense) => (
            <Card
              key={expense.id}
              className={`overflow-hidden ${expense.isReversed ? 'opacity-60 border-red-200 bg-red-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className={`text-lg ${expense.isReversed ? 'text-red-700' : ''}`}>
                      {expense.description || expense.purpose || 'Untitled Expense'}
                      {expense.isReversed && <span className="ml-2 text-sm text-red-600">(REVERSED)</span>}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {expense.category} • {formatDate(expense.date)}
                      {expense.receiptNumber && ` • Receipt #${expense.receiptNumber}`}
                    </CardDescription>
                    {expense.isReversed && expense.reversalReason && (
                      <p className="text-sm text-red-600 mt-1">Reason: {expense.reversalReason}</p>
                    )}
                  </div>
                  <div className={`text-xl font-semibold ${expense.isReversed ? 'line-through text-red-600' : ''}`}>
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
              </CardHeader>
              {expense.notes && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{expense.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"
import { useEffect, useState } from 'react'
import { getInitial, subscribe } from '@/lib/realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReadonlyTooltip } from '@/components/Readonly'
import { Receipt, Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  category: string
  receiptNumber?: string
  notes?: string
  isReversed?: boolean
  reversedAt?: string
  reversalReason?: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchExpenses = async (forceFresh = false) => {
      try {
        setLoading(true)
        setError(null)
        
        console.log(`🔄 Starting expenses fetch (forceFresh: ${forceFresh})...`)
        
        // Force clear any cached data from React state
        setExpenses([])
        
        // Clear any potential browser cache for expenses
        if (typeof window !== 'undefined' && forceFresh) {
          console.log('🧹 Clearing browser cache for expenses...')
          // Force reload from server by adding cache-busting timestamp
          const timestamp = Date.now()
          console.log(`⏰ Cache-busting timestamp: ${timestamp}`)
        }
        
        const expensesData = await getInitial<Expense>('expenses', forceFresh)
        console.log('📊 Expenses fetch completed:', {
          count: expensesData?.length || 0,
          forceFresh: forceFresh,
          timestamp: new Date().toISOString(),
          hasReversedExpenses: expensesData?.some(exp => exp.isReversed) || false,
          reversedCount: expensesData?.filter(exp => exp.isReversed).length || 0
        })
        
        // Log each expense for debugging
        if (expensesData && expensesData.length > 0) {
          console.log('💰 Individual expenses:', expensesData.map(exp => ({
            id: exp.id,
            description: exp.description,
            amount: exp.amount,
            isReversed: exp.isReversed,
            date: exp.date
          })))
        }
        
        setExpenses(expensesData || [])
        setLoading(false)
      } catch (err) {
        console.error('❌ Error fetching expenses:', err)
        setError('Failed to load expenses. Please try again later.')
        setLoading(false)
      }
    }

    // Initial fetch with aggressive cache clearing
    console.log('🚀 Initial expenses page load - forcing fresh data...')
    fetchExpenses(true)

    // Set up real-time subscription to detect changes
    const unsubscribe = subscribe<Expense>('expenses', (updatedExpenses) => {
      console.log('📡 Real-time expenses update received:', {
        count: updatedExpenses?.length || 0,
        timestamp: new Date().toISOString(),
        hasReversedExpenses: updatedExpenses?.some(exp => exp.isReversed) || false,
        reversedCount: updatedExpenses?.filter(exp => exp.isReversed).length || 0
      })
      
      // Log the real-time data for debugging
      if (updatedExpenses && updatedExpenses.length > 0) {
        console.log('📡 Real-time expenses details:', updatedExpenses.map(exp => ({
          id: exp.id,
          description: exp.description,
          amount: exp.amount,
          isReversed: exp.isReversed,
          date: exp.date
        })))
      }
      
      setExpenses(updatedExpenses || [])
    })

    // Set up auto-refresh every 30 seconds with gentle cache clearing
    const autoRefreshInterval = setInterval(() => {
      console.log('⏰ Auto-refresh triggered (30s interval)...')
      fetchExpenses(false) // Use gentle refresh instead of aggressive cache clearing
    }, 30000) // 30 seconds for stable user experience

    return () => {
      console.log('🧹 Cleaning up expenses page subscriptions...')
      if (unsubscribe) unsubscribe()
      clearInterval(autoRefreshInterval)
    }
  }, [])

  // Calculate total expenses excluding reversed ones
  const totalExpenses = expenses
    .filter(expense => !expense.isReversed)
    .reduce((sum, expense) => sum + expense.amount, 0)

  const reversedExpenses = expenses.filter(expense => expense.isReversed)

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
      <div className="max-w-5xl mx-auto p-6">
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
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Receipt className="w-5 h-5"/> 
          Expenses
          <span className="text-sm text-muted-foreground font-normal ml-2">
            ({expenses.length} total, {reversedExpenses.length} reversed)
          </span>
        </h1>
        <ReadonlyTooltip>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2"/> Add expense
          </Button>
        </ReadonlyTooltip>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No expenses found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No expenses have been added yet. Add expenses in the desktop app to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-800">Expenses Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-600">Total Active Expenses</p>
                  <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Reversed</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(reversedExpenses.reduce((sum, exp) => sum + exp.amount, 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Expenses</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses List */}
          {expenses.map((expense) => (
            <Card key={expense.id} className={`overflow-hidden ${expense.isReversed ? 'opacity-60 border-red-200 bg-red-50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className={`text-lg ${expense.isReversed ? 'text-red-700' : ''}`}>
                      {expense.description}
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

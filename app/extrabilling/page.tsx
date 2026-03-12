"use client"
import { useEffect, useState } from 'react'
import { getInitial, subscribe } from '@/lib/realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReadonlyTooltip } from '@/components/Readonly'
import { PackagePlus, Plus, Loader2, User } from 'lucide-react'
import { format } from 'date-fns'

interface ExtraBilling {
  id: string
  studentId: string
  studentName: string
  description: string
  amount: number
  date: string
  dueDate: string
  paid: boolean
  paidDate?: string
  notes?: string
}

export default function ExtraBillingPage() {
  const [billingItems, setBillingItems] = useState<ExtraBilling[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBillingItems = async () => {
      try {
        const billingData = await getInitial<ExtraBilling>('extraBilling')
        setBillingItems(billingData)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching extra billing:', err)
        setError('Failed to load extra billing records. Please try again later.')
        setLoading(false)
      }
    }

    fetchBillingItems()
  }, [])

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
          <PackagePlus className="w-5 h-5"/> 
          Extra Billing
          <span className="text-sm text-muted-foreground font-normal ml-2">
            ({billingItems.length} total)
          </span>
        </h1>
        <ReadonlyTooltip>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2"/> Add item
          </Button>
        </ReadonlyTooltip>
      </div>

      {billingItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No billing records found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No extra billing records have been added yet. Add records in the desktop app to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {billingItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <User className="w-4 h-4" />
                      {item.studentName || 'Unknown Student'}
                    </div>
                    <CardTitle className="text-lg">{item.description}</CardTitle>
                    <CardDescription className="mt-1">
                      Billed: {formatDate(item.date)} • 
                      Due: {formatDate(item.dueDate)}
                      {item.paidDate && ` • Paid: ${formatDate(item.paidDate)}`}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-semibold ${item.paid ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.paid ? 'Paid' : 'Unpaid'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              {item.notes && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{item.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

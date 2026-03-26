"use client"
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Receipt } from 'lucide-react'

export default function ExpensesPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth() // 0-11
  const months = Array.from({ length: currentMonthIndex + 1 }, (_, idx) => idx)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Receipt className="w-5 h-5"/> 
          Expenses
          <span className="text-sm text-muted-foreground font-normal ml-2">({currentYear})</span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select a month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {months.map((monthIdx) => {
              const monthNumber = String(monthIdx + 1).padStart(2, '0')
              const label = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(currentYear, monthIdx, 1))
              return (
                <Button key={monthNumber} asChild variant={monthIdx === currentMonthIndex ? 'default' : 'outline'}>
                  <Link href={`/expenses/${monthNumber}`}>{label}</Link>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

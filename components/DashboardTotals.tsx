"use client"
import { useEffect, useState } from 'react'
import { getInitial, subscribe } from '@/lib/realtime'
import { Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { FeeCollectionCards } from './FeeCollectionCards'
import { calculateOutstandingFromEnrollment, BillingCycle, type Student, type AppSettings } from '@/lib/calculations'

interface DashboardData {
  totalStudents: number
  totalExpenses: number
  totalExtraBilling: number
  totalOutstanding: number
}

export function DashboardTotals() {
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [totalExtraBilling, setTotalExtraBilling] = useState(0)
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)

  // Remove this useEffect that was causing unnecessary loading state changes

  useEffect(() => {
    const loadData = async (forceFresh = false, isAutoRefresh = false) => {
      try {
        // Only show loading state for initial load, not auto-refreshes
        if (!isAutoRefresh) {
          setLoading(true)
        }
        
        console.log(`🔄 Loading dashboard data${forceFresh ? ' (refreshed)' : ''}...`)
        
        // Load initial data
        const studentsData = await getInitial<Student>('students', forceFresh)
        const expensesData = await getInitial('expenses', forceFresh)
        
        // Load extra billing data
        const extraBillingData = await getInitial('extraBilling', forceFresh)
        
        // Load settings for outstanding calculations
        const settingsData = await getInitial<AppSettings>('settings', forceFresh)
        let appSettings: AppSettings | null = null
        if (settingsData.length > 0) {
          appSettings = settingsData[0]
          setSettings(appSettings)
        }
        
        console.log('📊 Dashboard data loaded:', {
          students: studentsData?.length || 0,
          expenses: expensesData?.length || 0,
          extraBilling: extraBillingData?.length || 0,
          settings: appSettings ? 'loaded' : 'missing'
        })
        
        // Calculate totals
        const totalStudents = studentsData?.length || 0
        
        // Calculate expenses excluding reversed ones
        const totalExpenses = expensesData?.reduce((sum: number, expense: any) => {
          if (expense.isReversed || expense.reversed) {
            console.log(`⚠️ Excluding reversed expense: ${expense.description} - $${expense.amount}`)
            return sum
          }
          return sum + (parseFloat(expense.amount) || 0)
        }, 0) || 0
        
        const totalExtraBilling = extraBillingData?.reduce((sum: number, billing: any) => sum + (parseFloat(billing.amount) || 0), 0) || 0
        
        // Use pre-calculated outstanding data from Electron app (same as outstanding page)
        let totalOutstanding = 0
        const outstandingStudentsData = await getInitial<any>('outstandingStudents')
        if (outstandingStudentsData) {
          totalOutstanding = outstandingStudentsData.reduce((sum: number, student: any) => {
            return sum + (student.outstandingAmount || 0)
          }, 0)
          console.log(`💰 Outstanding: $${totalOutstanding} from ${outstandingStudentsData.length} outstanding students (pre-calculated)`)
        }
        
        console.log('📈 Dashboard totals:', {
          students: totalStudents,
          expenses: totalExpenses,
          extraBilling: totalExtraBilling,
          outstanding: totalOutstanding
        })
        
        setTotalStudents(totalStudents)
        setTotalExpenses(totalExpenses)
        setTotalExtraBilling(totalExtraBilling)
        setTotalOutstanding(totalOutstanding)
      } catch (error) {
        console.error('❌ Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial load
    loadData()

    // Subscribe to real-time updates with throttling to prevent excessive updates
    let studentsUpdateTimeout: NodeJS.Timeout | null = null
    const unsubscribeStudents = subscribe<Student>('students', (studentsData) => {
      // Throttle updates to prevent flickering
      if (studentsUpdateTimeout) clearTimeout(studentsUpdateTimeout)
      
      studentsUpdateTimeout = setTimeout(() => {
        console.log('🔄 Students updated:', studentsData?.length || 0)
        setTotalStudents(studentsData?.length || 0)
      }, 1000) // 1 second throttle to prevent excessive updates
    })

    // Subscribe to pre-calculated outstanding students for real-time updates
    let outstandingUpdateTimeout: NodeJS.Timeout | null = null
    const unsubscribeOutstanding = subscribe<any>('outstandingStudents', (outstandingData) => {
      if (outstandingUpdateTimeout) clearTimeout(outstandingUpdateTimeout)
      
      outstandingUpdateTimeout = setTimeout(() => {
        console.log('🔄 Outstanding students updated:', outstandingData?.length || 0)
        const totalOutstanding = outstandingData?.reduce((sum: number, student: any) => {
          return sum + (student.outstandingAmount || 0)
        }, 0) || 0
        console.log(`💰 Outstanding updated: $${totalOutstanding} (pre-calculated)`)
        setTotalOutstanding(totalOutstanding)
      }, 1000)
    })
    
    let expensesUpdateTimeout: NodeJS.Timeout | null = null
    const unsubscribeExpenses = subscribe('expenses', (expensesData) => {
      // Throttle expenses updates
      if (expensesUpdateTimeout) clearTimeout(expensesUpdateTimeout)
      
      expensesUpdateTimeout = setTimeout(() => {
        console.log('🔄 Expenses updated:', expensesData?.length || 0)
        const totalExpenses = expensesData?.reduce((sum: number, expense: any) => {
          if (expense.isReversed || expense.reversed) return sum
          return sum + (parseFloat(expense.amount) || 0)
        }, 0) || 0
        setTotalExpenses(totalExpenses)
      }, 1000) // 1 second throttle
    })
    
    let extraBillingUpdateTimeout: NodeJS.Timeout | null = null
    const unsubscribeExtraBilling = subscribe('extraBilling', (extraBillingData) => {
      // Throttle extra billing updates
      if (extraBillingUpdateTimeout) clearTimeout(extraBillingUpdateTimeout)
      
      extraBillingUpdateTimeout = setTimeout(() => {
        console.log('🔄 Extra billing updated:', extraBillingData?.length || 0)
        const totalExtraBilling = extraBillingData?.reduce((sum: number, billing: any) => sum + (parseFloat(billing.amount) || 0), 0) || 0
        setTotalExtraBilling(totalExtraBilling)
      }, 1000) // 1 second throttle
    })
    
    let settingsUpdateTimeout: NodeJS.Timeout | null = null
    const unsubscribeSettings = subscribe<AppSettings>('settings', (settingsData) => {
      // Throttle settings updates
      if (settingsUpdateTimeout) clearTimeout(settingsUpdateTimeout)
      
      settingsUpdateTimeout = setTimeout(() => {
        console.log('⚙️ Settings updated')
        if (settingsData.length > 0) {
          setSettings(settingsData[0])
        }
      }, 1000) // 1 second throttle
    })

    // Set up auto-refresh every 30 seconds with gentle cache clearing
    const autoRefreshInterval = setInterval(() => {
      console.log('⏰ Auto-refreshing dashboard data (30s interval)...')
      loadData(false, true) // Use gentle refresh, mark as auto-refresh to prevent loading flicker
    }, 30000) // 30 seconds for stable user experience

    return () => {
      // Clear all timeouts
      if (studentsUpdateTimeout) clearTimeout(studentsUpdateTimeout)
      if (outstandingUpdateTimeout) clearTimeout(outstandingUpdateTimeout)
      if (expensesUpdateTimeout) clearTimeout(expensesUpdateTimeout)
      if (extraBillingUpdateTimeout) clearTimeout(extraBillingUpdateTimeout)
      if (settingsUpdateTimeout) clearTimeout(settingsUpdateTimeout)
      
      // Unsubscribe from Firebase
      unsubscribeStudents()
      unsubscribeOutstanding()
      unsubscribeExpenses()
      unsubscribeExtraBilling()
      unsubscribeSettings()
      clearInterval(autoRefreshInterval)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Fee Collection Cards */}
      <FeeCollectionCards />
      
      {/* Existing Dashboard Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-brand-gradient text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Students</CardTitle>
            <Users className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Expenses</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-white/80"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-400 to-purple-500 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Extra Billing</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-white/80"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalExtraBilling}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-400 to-red-500 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Outstanding</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-white/80"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalOutstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

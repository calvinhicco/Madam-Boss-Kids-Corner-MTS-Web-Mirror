"use client"
import { useEffect, useState } from 'react'
import { getInitial, subscribe } from '@/lib/realtime'
import { Loader2, DollarSign } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Student, AppSettings, BillingCycle } from '@/types/student-types'

export function FeeCollectionCards() {
  const [students, setStudents] = useState<Student[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper functions to get current month and year
  const getCurrentMonth = () => new Date().getMonth() + 1 // 1-12 for Jan-Dec
  const getCurrentYear = () => new Date().getFullYear()

  // Calculate tuition fees collected in current month (mirrors electron logic)
  const calculateMonthlyTuitionCollections = (students: Student[]) => {
    const currentYear = getCurrentYear()
    const currentMonth = getCurrentMonth()
    
    return students.reduce((total, student) => {
      if (!Array.isArray(student.feePayments)) return total

      // Get all payments that have any amount paid in the current month
      const studentTuitionPaymentsInCurrentMonth = student.feePayments.filter((payment) => {
        if ((payment.amountPaid || 0) <= 0) return false

        // Check if this is a payment for the current month period
        const isCurrentMonthPeriod = payment.period === currentMonth
        
        // Check if this payment was made in the current calendar month (paidDate)
        let isPaidInCurrentMonth = false
        if (payment.paidDate) {
          try {
            const paymentDate = new Date(payment.paidDate)
            isPaidInCurrentMonth = paymentDate.getFullYear() === currentYear && paymentDate.getMonth() + 1 === currentMonth
          } catch (error) {
            console.warn("Invalid fee payment paidDate:", payment.paidDate, error)
          }
        }
        
        return isCurrentMonthPeriod || isPaidInCurrentMonth
      })

      // Calculate tuition portion only (exclude transport component)
      const sumForStudent = studentTuitionPaymentsInCurrentMonth.reduce((sum, payment) => {
        const totalPaid = payment.amountPaid || 0
        
        // For termly billing, tuition and transport are separate - don't subtract transport from tuition payments
        // For monthly billing, transport is included in the monthly payment and should be subtracted
        if (student.hasTransport && !payment.isTransportWaived && settings?.billingCycle === BillingCycle.MONTHLY) {
          const transportPortion = student.transportFee || 0
          const tuitionPortion = Math.max(0, totalPaid - transportPortion)
          return sum + tuitionPortion
        } else {
          // For termly billing or students without transport, count full payment as tuition
          return sum + totalPaid
        }
      }, 0)

      return total + sumForStudent
    }, 0)
  }

  // Calculate transport fees collected in current month (mirrors electron logic)
  const calculateMonthlyTransportCollections = (students: Student[]) => {
    const currentMonth = getCurrentMonth()
    const currentYear = getCurrentYear()

    return students.reduce((total, student) => {
      if (!student.hasTransport || !Array.isArray(student.transportPayments)) {
        return total
      }

      // Get all transport payments that have any amount paid in the current month
      const studentTransportPaymentsInCurrentMonth = student.transportPayments.filter((payment) => {
        if ((payment.amountPaid || 0) <= 0 || payment.isSkipped) return false

        // Check if this is a payment for the current month period
        const isCurrentMonthPeriod = payment.month === currentMonth
        
        // Check if this payment was made in the current calendar month (paidDate)
        let isPaidInCurrentMonth = false
        if (payment.paidDate) {
          try {
            const paymentDate = new Date(payment.paidDate)
            isPaidInCurrentMonth = paymentDate.getFullYear() === currentYear && paymentDate.getMonth() + 1 === currentMonth
          } catch (error) {
            console.warn("Invalid transport payment paidDate:", payment.paidDate, error)
          }
        }
        
        return isCurrentMonthPeriod || isPaidInCurrentMonth
      })

      // Sum the transport payments made in current month
      const sumForStudent = studentTransportPaymentsInCurrentMonth.reduce((sum, payment) => {
        return sum + (payment.amountPaid || 0)
      }, 0)

      return total + sumForStudent
    }, 0)
  }

  // Get current month name for display
  const getCurrentMonthName = () => {
    return new Date(0, new Date().getMonth()).toLocaleString("default", { month: "long" })
  }

  useEffect(() => {
    setLoading(true)
    
    const loadStudents = async () => {
      try {
        // Load initial data
        const studentsData = await getInitial<Student>('students')
        setStudents(studentsData)
        
        // Load settings
        const settingsData = await getInitial<AppSettings>('settings')
        if (settingsData.length > 0) {
          setSettings(settingsData[0])
        }
        
        setLoading(false)
        setError(null)
      } catch (err) {
        console.error('Error loading students:', err)
        setError('Failed to load students data')
        setLoading(false)
      }
    }

    // Load initial data
    loadStudents()

    // Set up real-time subscription with throttling
    let studentsUpdateTimeout: NodeJS.Timeout | null = null
    const unsubscribe = subscribe<Student>('students', (studentsData) => {
      // Throttle updates to prevent flickering
      if (studentsUpdateTimeout) clearTimeout(studentsUpdateTimeout)
      
      studentsUpdateTimeout = setTimeout(() => {
        console.log('Fee collection students data updated:', studentsData?.length || 0)
        setStudents(studentsData)
      }, 1000) // 1 second throttle to prevent excessive updates
    })

    // Cleanup function
    return () => {
      // Clear timeout
      if (studentsUpdateTimeout) clearTimeout(studentsUpdateTimeout)
      
      // Unsubscribe from Firebase
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-center h-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-center h-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-center h-20">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-center h-20">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentMonthTuitionFees = calculateMonthlyTuitionCollections(students)
  const currentMonthTransportFees = calculateMonthlyTransportCollections(students)
  const currentMonthName = getCurrentMonthName()

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* Tuition Fees Collected Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tuition Fees Collected (Current Month Only)</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-800">
            ${currentMonthTuitionFees.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentMonthName}
          </p>
        </CardContent>
      </Card>

      {/* Transport Fees Collected Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transport Fees Collected (Current Month Only)</CardTitle>
          <DollarSign className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-800">
            ${currentMonthTransportFees.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentMonthName}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

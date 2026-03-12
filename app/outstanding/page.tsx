"use client"
import { useEffect, useState } from 'react'
import { getInitial, subscribe } from '@/lib/realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ReadonlyTooltip } from '@/components/Readonly'
import { AlertTriangle, Plus, DollarSign, User, Phone, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { calculateOutstandingFromEnrollment, getPaymentStatus, BillingCycle, type Student, type AppSettings } from '@/lib/calculations'

interface OutstandingStudent {
  id: string
  fullName: string
  className?: string
  parentContact: string
  classGroup: string
  admissionDate: string
  hasTransport: boolean
  transportFee: number
  outstandingAmount: number
  lastUpdated: string
}

export default function OutstandingPage() {
  const [outstandingStudents, setOutstandingStudents] = useState<OutstandingStudent[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Fetching pre-calculated outstanding students from Electron sync...')
        
        // Fetch pre-calculated outstanding students from Firebase (synced by Electron app)
        const outstandingData = await getInitial<any>('outstandingStudents')
        console.log(`📊 Fetched ${outstandingData.length} outstanding students from Firebase`)
        
        // Fetch settings for billing cycle display
        const settingsData = await getInitial<AppSettings>('settings')
        let appSettings: AppSettings | null = null
        if (settingsData.length > 0) {
          appSettings = settingsData[0]
          setSettings(appSettings)
        }
        
        // Use pre-calculated outstanding data from Electron app
        setOutstandingStudents(outstandingData)
        console.log(`🚨 Using ${outstandingData.length} pre-calculated outstanding students from Electron app`)
        
        setLoading(false)
      } catch (err) {
        console.error('❌ Error fetching data:', err)
        setError('Failed to load outstanding students. Please try again later.')
        setLoading(false)
      }
    }

    fetchData()

    // Subscribe to real-time updates for pre-calculated outstanding students
    const unsubscribeOutstanding = subscribe<any>('outstandingStudents', (outstandingData) => {
      console.log('🔄 Outstanding students real-time update:', outstandingData?.length || 0)
      setOutstandingStudents(outstandingData || [])
    })

    const unsubscribeSettings = subscribe<AppSettings>('settings', (settingsData) => {
      console.log('⚙️ Settings real-time update')
      if (settingsData.length > 0) {
        setSettings(settingsData[0])
      }
    })

    return () => {
      unsubscribeOutstanding()
      unsubscribeSettings()
    }
  }, [settings])

  // Calculate total outstanding from pre-calculated amounts
  const totalOutstanding = outstandingStudents.reduce((sum, student) => {
    return sum + (student.outstandingAmount || 0)
  }, 0)

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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5"/> Outstanding Students
        </h1>
        <ReadonlyTooltip>
          <Button disabled size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2"/> Record Payment
          </Button>
        </ReadonlyTooltip>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-purple-800 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Students with Outstanding Payments
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Total Outstanding Summary</h3>
              <div className="text-3xl font-bold text-red-600 mb-2">${totalOutstanding.toLocaleString()}</div>
              <p className="text-sm text-red-700">
                Across {outstandingStudents.length} students with outstanding payments
              </p>
              <p className="text-xs text-red-600 mt-1">
                Outstanding amounts calculated from enrollment date to current date
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {outstandingStudents.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No students with outstanding payments found.</p>
                <p className="text-sm text-gray-400 mt-2">All students are up to date with their payments!</p>
              </div>
            ) : (
              outstandingStudents
                .map((student) => {
                  if (!settings) return null
                  // Use pre-calculated outstanding amount from Electron app
                  const outstandingAmount = student.outstandingAmount
                  // Determine payment status based on outstanding amount (simplified for pre-calculated data)
                  const paymentStatusData = outstandingAmount === 0 
                    ? { status: 'Paid in Full' as const, color: 'green', icon: 'check-circle' }
                    : outstandingAmount > 0 && outstandingAmount < 200 // Assume partial if small amount
                      ? { status: 'Partial Payment' as const, color: 'yellow', icon: 'alert-triangle' }
                      : { status: 'Outstanding' as const, color: 'red', icon: 'alert-triangle' }
                  const classGroup = settings?.classGroups?.find(g => g.id === student.classGroup)

                  return (
                    <div
                      key={student.id}
                      className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4"
                    >
                      {/* Mobile Layout */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <User className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900">{student.fullName}</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {student.parentContact}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {student.className || classGroup?.name || "No class assigned"}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500 mt-1">
                            <span>Class: {classGroup?.name || "Unassigned"}</span>
                            <span>ID: {student.id}</span>
                            <span>Admitted: {new Date(student.admissionDate).toLocaleDateString()}</span>
                          </div>
                          {student.hasTransport && (
                            <div className="text-xs text-orange-600 mt-1">
                              Transport Service Active (${student.transportFee}/
                              {settings?.billingCycle?.toLowerCase() === 'monthly' ? "month" : "term"})
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount and Actions Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between sm:justify-start gap-4">
                          <div className="text-center sm:text-left">
                            <div className="flex items-center gap-1 text-lg font-bold text-red-600">
                              <DollarSign className="w-4 h-4" />
                              {outstandingAmount.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-600">outstanding since enrollment</p>
                            <p className="text-xs text-red-500 font-medium">
                              {settings?.billingCycle?.toLowerCase() === 'monthly' ? "Monthly" : "Termly"} billing
                            </p>
                          </div>

                          <Badge
                            variant={
                              paymentStatusData.status === "Paid in Full"
                                ? "default"
                                : paymentStatusData.status === "Partial Payment"
                                  ? "outline"
                                  : "secondary"
                            }
                            className="flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span className="hidden sm:inline">{paymentStatusData.status}</span>
                            <span className="sm:hidden">{paymentStatusData.status === "Partial Payment" ? "Partial" : paymentStatusData.status}</span>
                          </Badge>
                        </div>

                        <ReadonlyTooltip>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="text-purple-600 border-purple-600 w-full sm:w-auto"
                          >
                            View Details
                          </Button>
                        </ReadonlyTooltip>
                      </div>
                    </div>
                  )
                })
            )}
          </div>

          {outstandingStudents.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Outstanding Payment Notes:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Outstanding amounts are calculated from each student's enrollment date</li>
                <li>• Only past due payments are included (not future months)</li>
                <li>• Transport fees are billed separately on the 7th of each month</li>
                <li>• Use the desktop app to record payments and manage accounts</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

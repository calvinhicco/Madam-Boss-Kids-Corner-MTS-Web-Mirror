"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { subscribe, getInitial } from '@/lib/realtime'
import type { Student, AppSettings, BillingCycleType } from '@/types/student-types'
import { BillingCycle } from '@/types/student-types'
import { Button } from '@/components/ui/button'
import { ReadonlyTooltip } from '@/components/Readonly'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus } from 'lucide-react'

// Calculate outstanding balance correctly (mirrors Electron app logic)
const calculateOutstandingFromEnrollment = (student: Student, billingCycle: BillingCycleType): number => {
  if (!Array.isArray(student.feePayments)) return 0

  const admissionDate = new Date(student.admissionDate)
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()

  let schoolFeesOutstanding = 0
  let transportOutstanding = 0

  // Calculate school fees outstanding
  student.feePayments.forEach((payment) => {
    let periodStartDate: Date

    if (billingCycle === BillingCycle.MONTHLY) {
      periodStartDate = new Date(currentYear, payment.period - 1, 1)
    } else {
      // Termly - map periods to months
      const termStartMonths = { 1: 0, 2: 4, 3: 8 } // Jan, May, Sep
      const startMonth = termStartMonths[payment.period as keyof typeof termStartMonths] || 0
      periodStartDate = new Date(currentYear, startMonth, 1)
    }

    // Only consider periods after admission and current/past periods
    const admissionPeriodStart = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1)
    
    if (periodStartDate <= currentDate && periodStartDate >= admissionPeriodStart) {
      if (!student.hasTransport || payment.isTransportWaived) {
        schoolFeesOutstanding += payment.outstandingAmount
      } else {
        // Exclude transport component for students with active transport
        const transportPart = student.transportFee || 0
        const tuitionOutstanding = Math.max(0, payment.outstandingAmount - transportPart)
        schoolFeesOutstanding += tuitionOutstanding
      }
    }
  })

  // Calculate transport outstanding
  if (student.hasTransport && Array.isArray(student.transportPayments)) {
    student.transportPayments.forEach((payment) => {
      if (!payment.isSkipped && !payment.isWaived) {
        const paymentMonth = payment.month
        const paymentDate = new Date(currentYear, paymentMonth - 1, 1)
        const admissionMonth = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1)
        
        if (paymentDate <= currentDate && paymentDate >= admissionMonth) {
          transportOutstanding += payment.outstandingAmount
        }
      }
    })
  }

  return schoolFeesOutstanding + transportOutstanding
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    const loadData = async () => {
      // Load settings
      const settingsData = await getInitial<AppSettings>('settings')
      if (settingsData.length > 0) {
        setSettings(settingsData[0])
      }
    }
    
    loadData()
    const unsub = subscribe<Student>('students', (docs) => setStudents(docs))
    return () => unsub()
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Users className="w-5 h-5"/> Students</h1>
        <ReadonlyTooltip>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2"/> Add student
          </Button>
        </ReadonlyTooltip>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {students.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                <Link href={`/students/${s.id}`} className="text-primary hover:underline">{s.fullName}</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-4">
                <span>Class: {s.className}</span>
                <span>Group: {s.classGroup}</span>
                <span>Total Paid: {s.totalPaid ?? 0}</span>
                <span>Outstanding: {settings ? calculateOutstandingFromEnrollment(s, settings.billingCycle) : s.totalOwed ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {students.length === 0 && (
          <p className="text-sm text-muted-foreground">No students yet. Data syncs from the desktop app.</p>
        )}
      </div>
    </div>
  )
}

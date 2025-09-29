// Outstanding calculations for web mirror - matches Electron app logic

interface Student {
  id: string
  fullName: string
  className?: string
  parentContact: string
  classGroup: string
  admissionDate: string
  hasTransport: boolean
  transportFee: number
  hasCustomFees?: boolean
  customSchoolFee?: number
  feePayments: Array<{
    period: number
    amountDue: number
    amountPaid: number
    outstandingAmount: number
    paid: boolean
    paidDate?: string
    isTransportWaived?: boolean
  }>
  transportPayments?: Array<{
    month: number
    amountDue: number
    amountPaid: number
    paid: boolean
    isSkipped?: boolean
  }>
}

interface AppSettings {
  billingCycle: 'MONTHLY' | 'TERMLY' | 'monthly' | 'termly'
  schoolName: string
  classGroups: Array<{ id: string; name: string; standardFee: number }>
}

enum BillingCycle {
  MONTHLY = 'MONTHLY',
  TERMLY = 'TERMLY'
}

const TERMS = [
  { period: 1, months: [1, 2, 3, 4] },    // Term 1: Jan-Apr
  { period: 2, months: [5, 6, 7, 8] },    // Term 2: May-Aug
  { period: 3, months: [9, 10, 11, 12] }  // Term 3: Sep-Dec
]

// Transport months exclude April (4), August (8), December (12)
const TRANSPORT_MONTHS = [1, 2, 3, 5, 6, 7, 9, 10, 11]

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

function getStartOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1)
}

function getStartOfTerm(year: number, termPeriod: number): Date {
  const term = TERMS.find(t => t.period === termPeriod)
  if (!term) return new Date()
  return new Date(year, term.months[0] - 1, 1)
}

/**
 * Calculate transport outstanding for a student
 */
export function calculateTransportOutstanding(student: Student): number {
  if (!student.hasTransport || !Array.isArray(student.transportPayments)) {
    return 0
  }

  const admissionDate = new Date(student.admissionDate)
  const currentMonth = getCurrentMonth()
  const admissionMonth = admissionDate.getMonth() + 1

  let outstanding = 0

  student.transportPayments.forEach((payment) => {
    // Only include transport payments that are:
    // 1. Due on or before current month
    // 2. Not skipped
    // 3. After or equal to admission month
    // 4. In active transport months
    if (
      payment.month <= currentMonth &&
      !payment.isSkipped &&
      payment.month >= admissionMonth &&
      TRANSPORT_MONTHS.includes(payment.month)
    ) {
      outstanding += payment.amountDue - payment.amountPaid
    }
  })

  return Math.max(0, outstanding)
}

/**
 * Calculate school fees outstanding only
 */
export function calculateSchoolFeesOutstanding(student: Student, billingCycle: BillingCycle, settings?: AppSettings): number {
  if (!Array.isArray(student.feePayments)) {
    return 0
  }

  const admissionDate = new Date(student.admissionDate)
  const currentDate = new Date()
  const currentYear = getCurrentYear()

  let outstanding = 0

  student.feePayments.forEach((payment) => {
    // Determine the start date of the current payment period
    let periodStartDate: Date

    if (billingCycle === BillingCycle.MONTHLY) {
      periodStartDate = getStartOfMonth(currentYear, payment.period)
    } else {
      // Termly
      periodStartDate = getStartOfTerm(currentYear, payment.period)
    }

    // Only consider periods that are current or in the past relative to the current date
    // And that are after or in the same period as the admission date
    const admissionPeriodStart = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1)

    if (periodStartDate <= currentDate && periodStartDate >= admissionPeriodStart) {
      // Calculate the correct tuition amount dynamically for custom fee students
      let tuitionAmount = 0
      
      if (student.hasCustomFees && student.customSchoolFee) {
        tuitionAmount = student.customSchoolFee
      } else {
        // Calculate based on class fee and billing cycle
        const classGroup = settings?.classGroups?.find((g) => g.id === student.classGroup)
        const classFee = classGroup?.standardFee || 0
        
        if (billingCycle === BillingCycle.MONTHLY) {
          tuitionAmount = classFee
        } else {
          const term = TERMS.find((t) => t.period === payment.period)
          if (term) {
            tuitionAmount = classFee * term.months.length
          }
        }
      }
      
      // Calculate outstanding based on dynamic tuition amount
      const tuitionOutstanding = Math.max(0, tuitionAmount - payment.amountPaid)
      outstanding += tuitionOutstanding
    }
  })

  return outstanding
}

/**
 * Calculate total outstanding from enrollment (school fees + transport)
 */
export function calculateOutstandingFromEnrollment(student: Student, billingCycle: BillingCycle, settings?: AppSettings): number {
  const schoolFeesOutstanding = calculateSchoolFeesOutstanding(student, billingCycle, settings)
  const transportOutstanding = calculateTransportOutstanding(student)

  return schoolFeesOutstanding + transportOutstanding
}

/**
 * Get payment status for a student
 */
export function getPaymentStatus(student: Student, billingCycle: BillingCycle, settings?: AppSettings): {
  status: 'Paid in Full' | 'Partial Payment' | 'Outstanding'
  color: string
  icon: string
} {
  const outstanding = calculateOutstandingFromEnrollment(student, billingCycle, settings)
  
  if (outstanding === 0) {
    return { status: 'Paid in Full', color: 'green', icon: 'check-circle' }
  } else if (outstanding > 0) {
    // Check if any payments have been made
    const hasPaidSomething = student.feePayments?.some(p => p.amountPaid > 0) || 
                            student.transportPayments?.some(p => p.amountPaid > 0)
    
    if (hasPaidSomething) {
      return { status: 'Partial Payment', color: 'yellow', icon: 'alert-triangle' }
    } else {
      return { status: 'Outstanding', color: 'red', icon: 'alert-triangle' }
    }
  }
  
  return { status: 'Outstanding', color: 'red', icon: 'alert-triangle' }
}

export type { Student, AppSettings }
export { BillingCycle }

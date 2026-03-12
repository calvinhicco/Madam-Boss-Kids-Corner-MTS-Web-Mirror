"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeOne } from '@/lib/realtime'
import type { Student } from '@/types/student-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReadonlyTooltip } from '@/components/Readonly'
import { User } from 'lucide-react'

export default function StudentDetailsPage() {
  const params = useParams()
  const id = params?.id as string
  const [student, setStudent] = useState<Student | null>(null)

  useEffect(() => {
    if (!id) return
    const unsub = subscribeOne<Student>('students', id, setStudent)
    return () => unsub && unsub()
  }, [id])

  if (!id) return null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <User className="w-5 h-5"/> Student Details
        </h1>
        <ReadonlyTooltip>
          <Button disabled>Save</Button>
        </ReadonlyTooltip>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{student?.fullName ?? '—'}</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Class:</span> {student?.className ?? '—'}</div>
          <div><span className="text-muted-foreground">Group:</span> {student?.classGroup ?? '—'}</div>
          <div><span className="text-muted-foreground">Contact:</span> {student?.parentContact ?? '—'}</div>
          <div><span className="text-muted-foreground">Address:</span> {student?.address ?? '—'}</div>
          <div><span className="text-muted-foreground">Total Paid:</span> {student?.totalPaid ?? 0}</div>
          <div><span className="text-muted-foreground">Outstanding:</span> {student?.totalOwed ?? 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}

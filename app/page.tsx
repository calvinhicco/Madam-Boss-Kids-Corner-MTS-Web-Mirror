import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Users, Plus } from 'lucide-react'
import { DashboardTotals } from '@/components/DashboardTotals'

export default function DashboardPage() {

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your school's financials and activities
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Record
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Available in Desktop (Electron) only</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        <DashboardTotals />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Data Overview section removed */}
      </div>
    </div>
  )
}

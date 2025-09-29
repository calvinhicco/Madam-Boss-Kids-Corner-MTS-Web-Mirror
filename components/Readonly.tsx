"use client"
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PropsWithChildren } from 'react'

export function ReadonlyTooltip({ children }: PropsWithChildren) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Children should be rendered with disabled attr where applicable */}
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p>Available in Desktop (Electron) only</p>
      </TooltipContent>
    </Tooltip>
  )
}

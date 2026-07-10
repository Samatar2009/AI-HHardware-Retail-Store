import { forwardRef } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'animate-popover-show z-50 rounded-sm bg-stone-900 px-2 py-1 text-xs text-white shadow-md',
      className
    )}
    {...props}
  >
    {props.children}
    <TooltipPrimitive.Arrow className="fill-stone-900" />
  </TooltipPrimitive.Content>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/** Wrap the app once with this; individual tooltips still need their own <Tooltip>. */
function AppTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, AppTooltipProvider }

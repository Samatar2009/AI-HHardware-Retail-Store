import { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { cn } from '@/lib/utils'

const MobileBottomSheet = DialogPrimitive.Root
const MobileBottomSheetTrigger = DialogPrimitive.Trigger
const MobileBottomSheetClose = DialogPrimitive.Close

const MobileBottomSheetContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { heightClassName?: string }
>(({ className, heightClassName = 'max-h-[85vh]', children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="animate-overlay-show fixed inset-0 z-40 bg-black/40" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'animate-drawer-bottom fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-lg bg-white shadow-xl',
        heightClassName,
        className
      )}
      {...props}
    >
      <div className="mx-auto mb-2 mt-3 h-1 w-10 shrink-0 rounded-full bg-stone-300" />
      <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
MobileBottomSheetContent.displayName = 'MobileBottomSheetContent'

export {
  MobileBottomSheet,
  MobileBottomSheetTrigger,
  MobileBottomSheetClose,
  MobileBottomSheetContent,
}

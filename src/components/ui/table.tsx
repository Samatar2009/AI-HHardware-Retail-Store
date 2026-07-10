import { forwardRef } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'

const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
)
Table.displayName = 'Table'

const TableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }>(
  ({ className, sticky, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('bg-stone-900 text-white', sticky && 'sticky top-0 z-10', className)}
      {...props}
    />
  )
)
TableHeader.displayName = 'TableHeader'

const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-stone-200', className)} {...props} />
  )
)
TableBody.displayName = 'TableBody'

const TableRow = forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { striped?: boolean; selected?: boolean }
>(({ className, striped, selected, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'transition-colors duration-100 motion-reduce:transition-none motion-reduce:duration-0',
      striped ? 'bg-stone-50 hover:bg-stone-100' : 'bg-white hover:bg-stone-50',
      selected && 'bg-orange-50',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

const TableHead = forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em]', className)}
      {...props}
    />
  )
)
TableHead.displayName = 'TableHead'

const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn('px-4 py-3 text-stone-700', className)} {...props} />
)
TableCell.displayName = 'TableCell'

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortDirection?: 'asc' | 'desc' | false
  onSort?: () => void
}

const SortableTableHead = forwardRef<HTMLTableCellElement, SortableTableHeadProps>(
  ({ className, children, sortDirection, onSort, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em]',
        className
      )}
      onClick={onSort}
      {...props}
    >
      <span className="inline-flex items-center">
        {children}
        {sortDirection === 'asc' ? (
          <ChevronUp className="ml-1 size-3.5 text-orange-500" />
        ) : sortDirection === 'desc' ? (
          <ChevronDown className="ml-1 size-3.5 text-orange-500" />
        ) : (
          <ChevronDown className="ml-1 size-3.5 text-stone-400" />
        )}
      </span>
    </th>
  )
)
SortableTableHead.displayName = 'SortableTableHead'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead }

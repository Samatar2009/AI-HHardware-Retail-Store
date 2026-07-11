'use client'

import { useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'

import { SearchInput } from '@/components/forms/search-input'
import { Table, TableBody, TableCell, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/pagination'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  pageSize?: number
}

function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  emptyTitle = 'No results',
  emptyDescription,
  searchPlaceholder,
  onSearch,
  pageSize = 20,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const column = columns.find((c) => c.key === sortKey)
    if (!column?.sortValue) return data
    return [...data].sort((a, b) => {
      const aVal = column.sortValue!(a)
      const bVal = column.sortValue!(b)
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDirection, columns])

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const pageData = sortedData.slice((page - 1) * pageSize, page * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {onSearch && <SearchInput onSearch={onSearch} placeholder={searchPlaceholder} className="max-w-sm" />}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : pageData.length === 0 ? (
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <Table>
            <TableHeader sticky>
              <TableRow>
                {columns.map((column) =>
                  column.sortable ? (
                    <SortableTableHead
                      key={column.key}
                      sortDirection={sortKey === column.key ? sortDirection : false}
                      onSort={() => handleSort(column.key)}
                    >
                      {column.header}
                    </SortableTableHead>
                  ) : (
                    <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em]">
                      {column.header}
                    </th>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((row, i) => (
                <TableRow key={getRowId(row)} striped={i % 2 === 1}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>{column.render(row)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export { DataTable }

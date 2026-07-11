'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

import { formatDate, formatSLSH } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/types/database'

type ReturnRow = Row<'returns'>
type ReturnItem = Row<'return_items'>

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  pending: { icon: Clock, label: 'Pending Review', className: 'text-amber-600' },
  approved: { icon: CheckCircle2, label: 'Approved', className: 'text-green-600' },
  rejected: { icon: XCircle, label: 'Rejected', className: 'text-red-600' },
}

function ReturnPhotos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    if (paths.length === 0) return
    const supabase = createClient()
    Promise.all(
      paths.map(async (path) => {
        const { data } = await supabase.storage.from('return-photos').createSignedUrl(path, 3600)
        return data?.signedUrl
      })
    ).then((results) => setUrls(results.filter((u): u is string => !!u)))
  }, [paths])

  if (urls.length === 0) return null

  return (
    <div className="mt-2 flex gap-2">
      {urls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="Return evidence" className="size-16 rounded-md object-cover" />
      ))}
    </div>
  )
}

export default function ReturnDetailPage({ params }: { params: { id: string } }) {
  const { data } = useQuery({
    queryKey: ['return-detail', params.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data: returnRow } = await supabase
        .from('returns')
        .select('*, items:return_items(*)')
        .eq('id', params.id)
        .single()
      return returnRow as (ReturnRow & { items: ReturnItem[] }) | null
    },
  })

  if (!data) return null

  const status = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.pending
  const StatusIcon = status.icon

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">Return Request</h1>

      <div className={`mb-6 flex items-center gap-2 rounded-md border border-stone-200 bg-white p-4 ${status.className}`}>
        <StatusIcon className="size-5" />
        <span className="font-semibold">{status.label}</span>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {data.items.map((item) => (
          <div key={item.id} className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-stone-900">Qty: {item.quantity}</span>
            </div>
            <p className="mt-1 text-sm text-stone-600">{item.reason}</p>
            {item.photo_urls.length > 0 && <ReturnPhotos paths={item.photo_urls} />}
          </div>
        ))}
      </div>

      {data.status === 'rejected' && data.rejection_reason && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Reason for rejection</p>
          <p className="mt-1">{data.rejection_reason}</p>
        </div>
      )}

      {data.status === 'approved' && data.refund_amount_slsh !== null && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <p className="font-semibold">Refund Details</p>
          <p className="mt-1">Amount: {formatSLSH(data.refund_amount_slsh)}</p>
          {data.refund_method && <p>Method: {data.refund_method}</p>}
          {data.refund_reference && <p>Reference: {data.refund_reference}</p>}
        </div>
      )}

      <p className="mt-6 text-xs text-stone-400">Submitted {formatDate(data.created_at)}</p>
    </div>
  )
}

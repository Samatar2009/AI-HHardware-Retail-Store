'use client'

import { useRef, useState } from 'react'
import { Image as ImageIcon, Upload, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

export interface ImageUploadProps {
  value?: string | null
  onUploaded: (url: string) => void
  onRemove?: () => void
  label?: string
  error?: string
  uploadUrl?: string
}

function ImageUpload({
  value,
  onUploaded,
  onRemove,
  label,
  error,
  uploadUrl = '/api/admin/upload',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setIsUploading(true)
    setLocalError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(uploadUrl, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = (await res.json()) as { url: string }
      onUploaded(data.url)
    } catch {
      setLocalError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) void uploadFile(file)
  }

  const displayError = error ?? localError

  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-sm font-medium text-stone-700">{label}</label>}

      {value ? (
        <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border border-stone-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Uploaded preview" className="size-full object-cover" />
          <button
            type="button"
            aria-label="Remove image"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex aspect-square w-full max-w-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center',
            'transition-colors duration-150 motion-reduce:transition-none motion-reduce:duration-0',
            isDragging ? 'border-orange-500 bg-orange-50' : 'border-stone-300 bg-stone-50 hover:border-stone-400'
          )}
        >
          {isUploading ? (
            <Spinner size="md" />
          ) : (
            <>
              <div className="flex size-10 items-center justify-center rounded-full bg-orange-100">
                {isDragging ? (
                  <Upload className="size-5 text-orange-500" />
                ) : (
                  <ImageIcon className="size-5 text-orange-500" />
                )}
              </div>
              <p className="text-xs text-stone-500">Drag and drop, or click to upload</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {displayError && <p className="mt-1 text-xs text-red-600">{displayError}</p>}
    </div>
  )
}

export { ImageUpload }

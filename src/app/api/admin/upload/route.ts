import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/require-role'

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer())
  const admin = createAdminClient()
  const baseName = `${crypto.randomUUID()}.webp`

  try {
    const [fullImage, thumbnail] = await Promise.all([
      sharp(inputBuffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      sharp(inputBuffer).resize(300, 300, { fit: 'cover' }).webp({ quality: 75 }).toBuffer(),
    ])

    const [imageUpload, thumbnailUpload] = await Promise.all([
      admin.storage.from('product-images').upload(baseName, fullImage, { contentType: 'image/webp' }),
      admin.storage.from('product-thumbnails').upload(baseName, thumbnail, { contentType: 'image/webp' }),
    ])

    if (imageUpload.error || thumbnailUpload.error) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: imageUrl } = admin.storage.from('product-images').getPublicUrl(baseName)
    const { data: thumbnailUrl } = admin.storage.from('product-thumbnails').getPublicUrl(baseName)

    return NextResponse.json({ imageUrl: imageUrl.publicUrl, thumbnailUrl: thumbnailUrl.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Could not process image' }, { status: 500 })
  }
}

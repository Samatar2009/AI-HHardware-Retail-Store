import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/require-role'

export async function POST(request: Request) {
  const { error: authError } = await requireRole(['admin'])
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
  const fileName = `${crypto.randomUUID()}.webp`

  try {
    const icon = await sharp(inputBuffer).resize(128, 128, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()

    const { error: uploadError } = await admin.storage.from('category-icons').upload(fileName, icon, {
      contentType: 'image/webp',
    })

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: publicUrl } = admin.storage.from('category-icons').getPublicUrl(fileName)

    return NextResponse.json({ imageUrl: publicUrl.publicUrl, thumbnailUrl: publicUrl.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Could not process icon' }, { status: 500 })
  }
}

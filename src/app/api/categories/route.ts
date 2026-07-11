import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

interface CategoryNode {
  id: string
  name_en: string
  name_so: string
  parent_id: string | null
  icon_url: string | null
  sort_order: number
  children: CategoryNode[]
}

function buildTree(flat: Omit<CategoryNode, 'children'>[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>(flat.map((c) => [c.id, { ...c, children: [] }]))
  const roots: CategoryNode[] = []

  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_category_tree')

  if (error) {
    return NextResponse.json({ error: 'Could not load categories' }, { status: 500 })
  }

  return NextResponse.json({ categories: buildTree(data ?? []) })
}

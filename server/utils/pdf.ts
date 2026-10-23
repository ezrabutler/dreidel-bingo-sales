import fs from 'node:fs'
import path from 'node:path'
import { getSupabase } from './supabase'

const storageRoot = path.join(process.cwd(), 'server', 'storage')
const inventoryPath = path.join(storageRoot, 'seed-strings.json')

type InventoryState = {
  available: string[]
  used: string[]
  reserved: Record<string, string[]>
}

function normalizeString(value: string) {
  return value.replace(/\s+/g, '').trim()
}

function ensureLocalSeedInventory() {
  fs.mkdirSync(storageRoot, { recursive: true })
  if (!fs.existsSync(inventoryPath)) {
    const initial: InventoryState = { available: [], used: [], reserved: {} }
    fs.writeFileSync(inventoryPath, JSON.stringify(initial, null, 2))
  }
}

function readLocalSeedInventory(): InventoryState {
  ensureLocalSeedInventory()
  const raw = fs.readFileSync(inventoryPath, 'utf8')
  return JSON.parse(raw || '{"available":[],"used":[],"reserved":{}}') as InventoryState
}

function writeLocalSeedInventory(data: InventoryState) {
  fs.writeFileSync(inventoryPath, JSON.stringify(data, null, 2))
}

export async function getSeedInventorySummary() {
  const supabase = getSupabase()

  if (supabase) {
    const [{ count: availableCount = 0 }, { count: usedCount = 0 }] = await Promise.all([
      supabase.from('dreidel_seed_inventory').select('*', { count: 'exact', head: true }).eq('status', 'available'),
      supabase.from('dreidel_seed_inventory').select('*', { count: 'exact', head: true }).eq('status', 'used')
    ])

    return {
      availableCount: Number(availableCount),
      usedCount: Number(usedCount),
      totalCount: Number(availableCount + usedCount)
    }
  }

  const inventory = readLocalSeedInventory()
  return {
    availableCount: inventory.available.length,
    usedCount: inventory.used.length,
    totalCount: inventory.available.length + inventory.used.length
  }
}

export async function uploadSeedStrings(lines: string[]) {
  const supabase = getSupabase()
  const normalized = [...new Set(
    lines
      .map((line) => normalizeString(line))
      .filter((value) => /^\d{128}$/.test(value))
  )]

  if (!normalized.length) {
    return { added: 0, availableCount: 0, usedCount: 0, totalCount: 0 }
  }

  if (supabase) {
    const rows = normalized.map((value) => ({ value, status: 'available' }))
    const { error } = await supabase.from('dreidel_seed_inventory').upsert(rows, { onConflict: 'value' })
    if (error) {
      console.error('Supabase seed upload failed', error)
    }
    return await getSeedInventorySummary()
  }

  const inventory = readLocalSeedInventory()
  const seen = new Set([...inventory.available, ...inventory.used])
  const additions: string[] = []

  for (const value of normalized) {
    if (!seen.has(value)) {
      additions.push(value)
      seen.add(value)
    }
  }

  inventory.available = [...new Set([...inventory.available, ...additions])]
  writeLocalSeedInventory(inventory)

  return {
    added: additions.length,
    ...await getSeedInventorySummary()
  }
}

export async function reserveSeedStrings(count: number, orderId: string) {
  if (count <= 0) {
    return []
  }

  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase
      .from('dreidel_seed_inventory')
      .select('*')
      .eq('status', 'available')
      .limit(count)
      .order('id', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    const reserved = (data || []).map((row) => row.value)
    if (reserved.length < count) {
      throw new Error(`Not enough available seed strings. Requested ${count}, available ${reserved.length}.`)
    }

    const ids = (data || []).map((row) => row.id)
    const { error: updateError } = await supabase
      .from('dreidel_seed_inventory')
      .update({ status: 'reserved', reserved_for_order_id: orderId, reserved_at: new Date().toISOString() })
      .in('id', ids)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return reserved
  }

  const inventory = readLocalSeedInventory()
  if (inventory.available.length < count) {
    throw new Error(`Not enough available seed strings. Requested ${count}, available ${inventory.available.length}.`)
  }

  const reserved = inventory.available.slice(0, count)
  inventory.available = inventory.available.slice(count)
  inventory.reserved[orderId] = reserved
  writeLocalSeedInventory(inventory)
  return reserved
}

export async function finalizeSeedStrings(orderId: string) {
  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase
      .from('dreidel_seed_inventory')
      .select('*')
      .eq('status', 'reserved')
      .eq('reserved_for_order_id', orderId)

    if (!error && data) {
      const ids = data.map((row) => row.id)
      if (ids.length) {
        await supabase
          .from('dreidel_seed_inventory')
          .update({ status: 'used', used_at: new Date().toISOString(), reserved_for_order_id: null, reserved_at: null })
          .in('id', ids)
      }
    }
    return data || []
  }

  const inventory = readLocalSeedInventory()
  const reserved = inventory.reserved[orderId] || []
  if (reserved.length) {
    inventory.used = [...new Set([...inventory.used, ...reserved])]
    delete inventory.reserved[orderId]
    writeLocalSeedInventory(inventory)
  }
  return reserved
}

export async function releaseReservedSeedStrings(orderId: string) {
  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase
      .from('dreidel_seed_inventory')
      .select('*')
      .eq('status', 'reserved')
      .eq('reserved_for_order_id', orderId)

    if (!error && data) {
      const ids = data.map((row) => row.id)
      if (ids.length) {
        await supabase
          .from('dreidel_seed_inventory')
          .update({ status: 'available', reserved_for_order_id: null, reserved_at: null })
          .in('id', ids)
      }
    }
    return data || []
  }

  const inventory = readLocalSeedInventory()
  const reserved = inventory.reserved[orderId] || []
  if (reserved.length) {
    inventory.available = [...reserved, ...inventory.available]
    delete inventory.reserved[orderId]
    writeLocalSeedInventory(inventory)
  }
  return reserved
}

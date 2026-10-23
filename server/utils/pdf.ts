import fs from 'node:fs'
import path from 'node:path'

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

export function ensureSeedInventory() {
  fs.mkdirSync(storageRoot, { recursive: true })

  if (!fs.existsSync(inventoryPath)) {
    const initial: InventoryState = { available: [], used: [], reserved: {} }
    fs.writeFileSync(inventoryPath, JSON.stringify(initial, null, 2))
  }
}

export function readSeedInventory(): InventoryState {
  ensureSeedInventory()
  const raw = fs.readFileSync(inventoryPath, 'utf8')
  return JSON.parse(raw || '{"available":[],"used":[],"reserved":{}}') as InventoryState
}

export function writeSeedInventory(data: InventoryState) {
  fs.writeFileSync(inventoryPath, JSON.stringify(data, null, 2))
}

export function getSeedInventorySummary() {
  const inventory = readSeedInventory()
  return {
    availableCount: inventory.available.length,
    usedCount: inventory.used.length,
    totalCount: inventory.available.length + inventory.used.length
  }
}

export function uploadSeedStrings(lines: string[]) {
  const inventory = readSeedInventory()
  const seen = new Set([...inventory.available, ...inventory.used])
  const additions: string[] = []

  for (const line of lines) {
    const candidate = normalizeString(line)
    if (!/^\d{128}$/.test(candidate)) {
      continue
    }

    if (!seen.has(candidate)) {
      additions.push(candidate)
      seen.add(candidate)
    }
  }

  inventory.available = [...new Set([...inventory.available, ...additions])]
  writeSeedInventory(inventory)

  return {
    added: additions.length,
    ...getSeedInventorySummary()
  }
}

export function reserveSeedStrings(count: number, orderId: string) {
  const inventory = readSeedInventory()

  if (count <= 0) {
    return []
  }

  if (inventory.available.length < count) {
    throw new Error(`Not enough available seed strings. Requested ${count}, available ${inventory.available.length}.`)
  }

  const reserved = inventory.available.slice(0, count)
  inventory.available = inventory.available.slice(count)
  inventory.reserved[orderId] = reserved
  writeSeedInventory(inventory)

  return reserved
}

export function finalizeSeedStrings(orderId: string): string[] {
  const inventory = readSeedInventory()
  const reserved = inventory.reserved[orderId] || []

  if (reserved.length) {
    inventory.used = [...new Set([...inventory.used, ...reserved])]
    delete inventory.reserved[orderId]
    writeSeedInventory(inventory)
  }

  return reserved
}

export function releaseReservedSeedStrings(orderId: string) {
  const inventory = readSeedInventory()
  const reserved = inventory.reserved[orderId] || []

  if (reserved.length) {
    inventory.available = [...reserved, ...inventory.available]
    delete inventory.reserved[orderId]
    writeSeedInventory(inventory)
  }

  return reserved
}

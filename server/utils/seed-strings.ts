import fs from 'node:fs'
import path from 'node:path'
import { getSupabase } from './supabase'

const storageRoot = path.join(process.cwd(), 'server', 'storage')
const ordersFile = path.join(storageRoot, 'orders.json')
const pdfDirectory = path.join(storageRoot, 'pdfs')

function ensureLocalStorage() {
  fs.mkdirSync(storageRoot, { recursive: true })
  fs.mkdirSync(pdfDirectory, { recursive: true })
  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2))
  }
}

export function loadLocalOrders() {
  ensureLocalStorage()
  return JSON.parse(fs.readFileSync(ordersFile, 'utf8')) as any[]
}

export function saveLocalOrder(order: any) {
  const orders = loadLocalOrders()
  const index = orders.findIndex((entry) => entry.id === order.id)
  if (index >= 0) {
    orders[index] = order
  } else {
    orders.push(order)
  }
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2))
  return order
}

export async function getOrderById(orderId: string) {
  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase.from('dreidel_orders').select('*').eq('id', orderId).single()
    if (!error && data) {
      return data
    }
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase getOrderById error', error)
    }
  }

  return loadLocalOrders().find((entry) => entry.id === orderId) || null
}

export async function getOrderBySessionId(sessionId: string) {
  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase.from('dreidel_orders').select('*').eq('stripe_session_id', sessionId).maybeSingle()
    if (!error && data) {
      return data
    }
    if (error) {
      console.error('Supabase getOrderBySessionId error', error)
    }
  }

  return loadLocalOrders().find((entry) => entry.stripeSessionId === sessionId || entry.sessionId === sessionId) || null
}

export async function saveOrder(order: any) {
  const supabase = getSupabase()
  if (supabase) {
    const row = {
      id: order.id,
      customer_name: order.customerName || order.name || null,
      email: order.email || null,
      sheets: Number(order.sheets || 0),
      variant: order.variant || '5-color',
      paper_size: order.paperSize || 'letter',
      status: order.status || 'pending',
      created_at: order.createdAt || new Date().toISOString(),
      stripe_session_id: order.stripeSessionId || null,
      pdf_url: order.pdfUrl || order.downloadUrl || null,
      pdf_path: order.pdfFilePath || null,
      file_name: order.fileName || null,
      reserved_seed_strings: order.reservedSeedStrings || [],
      download_url: order.downloadUrl || null
    }

    const { error } = await supabase.from('dreidel_orders').upsert(row, { onConflict: 'id' })
    if (!error) {
      return order
    }
    console.error('Supabase saveOrder error', error)
  }

  return saveLocalOrder(order)
}

import fs from 'node:fs'
import path from 'node:path'

const storageRoot = path.join(process.cwd(), 'server', 'storage')
const ordersFile = path.join(storageRoot, 'orders.json')
const pdfDirectory = path.join(storageRoot, 'pdfs')

export function ensureOrderStorage() {
  fs.mkdirSync(pdfDirectory, { recursive: true })
  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2))
  }
}

export function loadOrders() {
  ensureOrderStorage()
  return JSON.parse(fs.readFileSync(ordersFile, 'utf8')) as any[]
}

export function saveOrder(order: any) {
  const orders = loadOrders()
  const exists = orders.some((entry) => entry.id === order.id)
  if (!exists) {
    orders.push(order)
  } else {
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].id === order.id) {
        orders[i] = order
      }
    }
  }
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2))
  return order
}

export function getOrderById(orderId: string) {
  return loadOrders().find((entry) => entry.id === orderId) || null
}

export function getOrderBySessionId(sessionId: string) {
  return loadOrders().find((entry) => entry.stripeSessionId === sessionId || entry.sessionId === sessionId) || null
}

export function getStoragePathsForOrder(orderId: string) {
  return {
    pdfFilePath: path.join(pdfDirectory, `${orderId}.pdf`),
    jsonFilePath: ordersFile
  }
}

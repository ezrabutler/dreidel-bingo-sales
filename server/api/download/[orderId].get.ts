import { createError, defineEventHandler, getRouterParam, sendStream } from 'h3'
import fs from 'node:fs'
import { getOrderById } from '../utils/order-store'

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'orderId')
  const order = orderId ? getOrderById(orderId) : null

  if (!order) {
    throw createError({ status: 404, statusMessage: 'Download not found.' })
  }

  if (!fs.existsSync(order.pdfFilePath)) {
    throw createError({ status: 404, statusMessage: 'PDF not found on disk.' })
  }

  event.node.res.setHeader('Content-Type', 'application/pdf')
  event.node.res.setHeader('Content-Disposition', `attachment; filename="${order.fileName || 'dreidel-bingo.pdf'}"`)

  return sendStream(event, fs.createReadStream(order.pdfFilePath))
})

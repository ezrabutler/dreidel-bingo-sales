import fs from 'node:fs'
import { createError, defineEventHandler, getRouterParam, sendRedirect, sendStream } from 'h3'
import { getOrderById } from '../../utils/order-store'

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'orderId')
  const order = orderId ? await getOrderById(orderId) : null

  if (!order) {
    throw createError({ status: 404, statusMessage: 'Order not found.' })
  }

  if (order.downloadUrl && order.downloadUrl.startsWith('http')) {
    return sendRedirect(event, order.downloadUrl, 302)
  }

  if (!order.pdfFilePath || !fs.existsSync(order.pdfFilePath)) {
    throw createError({ status: 404, statusMessage: 'PDF not found on disk.' })
  }

  event.node.res.setHeader('Content-Type', 'application/pdf')
  event.node.res.setHeader('Content-Disposition', `attachment; filename="${order.fileName || 'dreidel-bingo.pdf'}"`)
  return sendStream(event, fs.createReadStream(order.pdfFilePath))
})

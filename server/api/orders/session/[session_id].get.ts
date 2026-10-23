import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getOrderBySessionId } from '../utils/order-store'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'session_id')
  const order = sessionId ? getOrderBySessionId(sessionId) : null

  if (!order) {
    throw createError({ status: 404, statusMessage: 'Order not found for this session.' })
  }

  return order
})

import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getOrderById } from '../../utils/order-store'

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  const order = orderId ? await getOrderById(orderId) : null

  if (!order) {
    throw createError({ status: 404, statusMessage: 'Order not found.' })
  }

  return order
})

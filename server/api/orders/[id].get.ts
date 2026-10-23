import { createError, defineEventHandler, getHeader, readBody, sendStream, getRouterParam } from 'h3'
import fs from 'node:fs'
import { getOrderById, getOrderBySessionId } from '../utils/order-store'

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')
  const order = orderId ? getOrderById(orderId) : null

  if (!order) {
    throw createError({ status: 404, statusMessage: 'Order not found.' })
  }

  return order
})

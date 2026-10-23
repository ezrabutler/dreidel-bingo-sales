import { createError, defineEventHandler, getHeader, readRawBody } from 'h3'
import { getStripe } from '../utils/stripe'
import { generateOrderPdf } from '../utils/pdf'
import { saveOrder } from '../utils/order-store'
import { sendOrderEmail } from '../utils/email'

export default defineEventHandler(async (event) => {
  const stripe = getStripe()
  const signature = getHeader(event, 'stripe-signature')

  if (!stripe || !signature) {
    return { received: true }
  }

  const body = await readRawBody(event)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || !body) {
    return { received: true }
  }

  const stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret)

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const meta = session.metadata || {}
    const orderId = meta.orderId || session.id
    const sheets = Number(meta.sheets || 1)
    const variant = meta.variant || '5-color'
    const name = meta.name || 'Dreidel Player'
    const email = meta.email || 'customer@example.com'

    const pdfFilePath = await generateOrderPdf({ orderId, sheets, variant, customerName: name })
    const order = {
      id: orderId,
      customerName: name,
      email,
      sheets,
      variant,
      status: 'fulfilled',
      createdAt: new Date().toISOString(),
      stripeSessionId: session.id,
      pdfFilePath,
      downloadUrl: `${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/download/${orderId}`,
      fileName: `dreidel-bingo-${sheets}-sheets-${variant}.pdf`
    }

    saveOrder(order)
    await sendOrderEmail(order)
  }

  return { received: true }
})

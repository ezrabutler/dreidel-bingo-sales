import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, getHeader, readBody, getRequestURL } from 'h3'
import { getStripe } from '../utils/stripe'
import { saveOrder, getOrderById, getOrderBySessionId } from '../utils/order-store'
import { generateOrderPdf } from '../utils/pdf'
import { sendOrderEmail } from '../utils/email'

const PRODUCT_PRICING = {
  '4-color': 2.5,
  '5-color': 3.5,
  '6-color': 4.5
} as const

function getBaseUrl(event: any) {
  return getRequestURL(event).origin
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const sheets = Number(body.sheets || 1)
  const variant = (body.variant || '5-color') as keyof typeof PRODUCT_PRICING
  const name = String(body.name || 'Dreidel Player')
  const email = String(body.email || 'customer@example.com')

  if (!Number.isInteger(sheets) || sheets < 1) {
    throw createError({ status: 400, statusMessage: 'Please provide a valid number of sheets.' })
  }

  if (!(variant in PRODUCT_PRICING)) {
    throw createError({ status: 400, statusMessage: 'Unsupported color variant.' })
  }

  const orderId = randomUUID()
  const baseUrl = getBaseUrl(event)
  const unitPrice = PRODUCT_PRICING[variant]
  const total = Number((unitPrice * sheets).toFixed(2))

  const stripe = getStripe()

  if (stripe) {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${sheets} Dreidel Bingo sheets · ${variant}`
            },
            unit_amount: Math.round(total * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        orderId,
        sheets: String(sheets),
        variant,
        name,
        email
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`
    })

    return {
      url: session.url,
      sessionId: session.id,
      orderId
    }
  }

  const filePath = await generateOrderPdf({
    orderId,
    sheets,
    variant,
    customerName: name
  })

  const order = {
    id: orderId,
    customerName: name,
    email,
    sheets,
    variant,
    status: 'fulfilled',
    createdAt: new Date().toISOString(),
    stripeSessionId: `mock-${randomUUID()}`,
    pdfFilePath: filePath,
    downloadUrl: `${baseUrl}/api/download/${orderId}`,
    fileName: `dreidel-bingo-${sheets}-sheets-${variant}.pdf`
  }

  saveOrder(order)
  await sendOrderEmail(order)

  return {
    orderId,
    url: `${baseUrl}/success?orderId=${orderId}`
  }
})

import Stripe from 'stripe'
import { useRuntimeConfig } from '#imports'

export function getStripe() {
  const config = useRuntimeConfig()

  if (!config.stripeSecretKey) {
    return null
  }

  return new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-06-20'
  })
}

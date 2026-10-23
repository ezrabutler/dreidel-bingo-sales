import { defineEventHandler } from 'h3'
import { getSeedInventorySummary } from '../../utils/seed-strings'

export default defineEventHandler(() => {
  return getSeedInventorySummary()
})

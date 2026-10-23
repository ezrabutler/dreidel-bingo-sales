import { defineEventHandler, readBody, createError } from 'h3'
import { uploadSeedStrings } from '../../utils/seed-strings'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const lines = Array.isArray(body?.lines) ? body.lines : []

  if (!lines.length) {
    throw createError({ status: 400, statusMessage: 'Please provide at least one 128-digit string.' })
  }

  return await uploadSeedStrings(lines)
})

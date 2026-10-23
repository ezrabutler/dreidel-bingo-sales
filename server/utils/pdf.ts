import fs from 'node:fs'
import path from 'node:path'
import { put } from '@vercel/blob'
import PDFDocument from 'pdfkit'

const COLOR_MAP: Record<string, string> = {
  '1': '#facc15',
  '2': '#1d4ed8',
  '3': '#ef4444',
  '4': '#22c55e',
  '5': '#a855f7',
  '6': '#f59e0b'
}

const LABELS = ['shin', 'hey', 'gimmel', 'nūn']

function normalizeDigits(value: string, fallback: string[] = []) {
  const digits = (value || '').replace(/\s+/g, '').split('').filter((entry) => /\d/.test(entry))
  if (digits.length >= 128) {
    return digits.slice(0, 128).join('')
  }

  if (fallback.length) {
    return fallback.slice(0, 128).join('')
  }

  return Array.from({ length: 128 }, (_, index) => String((index % 6) + 1)).join('')
}

function drawBoard(doc: PDFKit.PDFDocument, digits: string, x: number, y: number, boardWidth: number, boardHeight: number) {
  doc.save()
  doc.fillColor('#ffffff')
  doc.rect(x, y, boardWidth, boardHeight).fill()
  doc.lineWidth(1)
  doc.strokeColor('#d4d4d4')
  doc.rect(x, y, boardWidth, boardHeight).stroke()

  const labelArea = 30
  const labelGap = (boardWidth - 28) / LABELS.length
  LABELS.forEach((label, idx) => {
    const labelX = x + 14 + idx * labelGap
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text(label, labelX, y + 10, {
      width: 28,
      align: 'center'
    })
  })

  const firstCellX = x + 16
  const firstCellY = y + labelArea + 12
  const cellWidth = (boardWidth - 32) / 4
  const cellHeight = (boardHeight - labelArea - 28) / 4

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const digit = digits[col * 4 + row] || '1'
      const cx = firstCellX + row * cellWidth + cellWidth / 2
      const cy = firstCellY + col * cellHeight + cellHeight / 2
      const color = COLOR_MAP[digit] || '#facc15'
      doc.fillColor(color).circle(cx, cy, Math.min(cellWidth, cellHeight) * 0.28).fill()
    }
  }

  doc.restore()
}

async function uploadPdfToBlob(filePath: string, orderId: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return null
  }

  const buffer = fs.readFileSync(filePath)
  const file = new File([buffer], `${orderId}.pdf`, { type: 'application/pdf' })
  const result = await put(`${orderId}.pdf`, file, {
    access: 'public',
    addRandomSuffix: false
  })

  return result.url
}

export async function generateOrderPdf({
  orderId,
  sheets,
  variant,
  customerName,
  paperSize = 'letter',
  seedStrings = []
}: {
  orderId: string
  sheets: number
  variant: string
  customerName: string
  paperSize?: 'letter' | 'a4'
  seedStrings?: string[]
}) {
  const tempDir = path.join(process.cwd(), 'server', 'storage', 'tmp')
  fs.mkdirSync(tempDir, { recursive: true })

  const filePath = path.join(tempDir, `${orderId}.pdf`)
  const pageSize = paperSize === 'a4' ? 'A4' : 'LETTER'
  const doc = new PDFDocument({ size: pageSize, margin: 22, layout: 'landscape' })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const outerMargin = 26
  const gapX = 16
  const gapY = 18
  const cardsPerRow = 4
  const rowsPerPage = 2
  const usableWidth = pageWidth - outerMargin * 2
  const cardWidth = (usableWidth - gapX * (cardsPerRow - 1)) / cardsPerRow
  const cardHeight = 190

  const actualSeedStrings = seedStrings.length
    ? seedStrings
    : Array.from({ length: Math.max(sheets, 1) }, (_, index) => normalizeDigits(String(index + 1)))

  for (let sheetIndex = 0; sheetIndex < Number(sheets); sheetIndex++) {
    const seedString = normalizeDigits(
      actualSeedStrings[sheetIndex] || '',
      Array.from({ length: 128 }, (_, idx) => String((idx % 6) + 1))
    )

    if (sheetIndex > 0) {
      doc.addPage({ size: pageSize, margin: 22, layout: 'landscape' })
    }

    doc.fillColor('#ffffff').rect(0, 0, pageWidth, pageHeight).fill()
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(27).text('CJC HANUKKAH PARTY', 40, 18, {
      align: 'center',
      width: pageWidth - 80
    })

    for (let cardIndex = 0; cardIndex < 8; cardIndex++) {
      const row = Math.floor(cardIndex / cardsPerRow)
      const col = cardIndex % cardsPerRow
      const x = outerMargin + col * (cardWidth + gapX)
      const y = 68 + row * (cardHeight + gapY)
      const digits = seedString.slice(cardIndex * 16, cardIndex * 16 + 16)
      drawBoard(doc, digits, x, y, cardWidth, cardHeight)
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text(
      `${customerName || 'Dreidel Bingo'} | ${variant} | ${sheetIndex + 1}/${sheets}`,
      40,
      pageHeight - 26,
      {
        align: 'center',
        width: pageWidth - 80
      }
    )
  }

  doc.end()

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  const blobUrl = await uploadPdfToBlob(filePath, orderId)
  return {
    filePath,
    blobUrl,
    fileName: `${orderId}.pdf`
  }
}

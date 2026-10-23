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
const HEBREW_LABELS = ['ש', 'ה', 'ג', 'נ']

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

function drawBoard(
  doc: PDFKit.PDFDocument,
  digits: string,
  x: number,
  y: number,
  boardWidth: number,
  boardHeight: number,
  boardNumber: number
) {
  doc.save()
  doc.fillColor('#ffffff')
  doc.rect(x, y, boardWidth, boardHeight).fill()
  doc.lineWidth(1)
  doc.strokeColor('#d4d4d4')
  doc.rect(x, y, boardWidth, boardHeight).stroke()

  const labelRowHeight = 90
  const cellPadding = 18
  const cellWidth = (boardWidth - cellPadding * 2) / 4
  const cellHeight = (boardHeight - labelRowHeight - 44) / 4

  LABELS.forEach((label, idx) => {
    const labelX = x + 20 + idx * ((boardWidth - 48) / 4)
    doc.font('Helvetica').fontSize(18).fillColor('#000000').text(label, labelX, y + 16, {
      width: 100,
      align: 'center'
    })

    const hebrewX = x + 20 + idx * ((boardWidth - 48) / 4) + 25
    doc.font('Helvetica').fontSize(50).fillColor('#000000').text(HEBREW_LABELS[idx], hebrewX, y + 46, {
      width: 60,
      align: 'center'
    })
  })

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const index = col * 4 + row
      const digit = digits[index] || '1'
      const cx = x + 24 + row * cellWidth + cellWidth / 2
      const cy = y + 120 + col * cellHeight + cellHeight / 2
      const color = COLOR_MAP[digit] || '#facc15'
      doc.fillColor(color).circle(cx, cy, Math.min(cellWidth, cellHeight) * 0.28).fill()
    }
  }

  doc.fillColor('#000000').font('Helvetica').fontSize(24).text(`game #${boardNumber}`, x + 18, y + boardHeight + 18, {
    width: boardWidth - 36,
    align: 'left'
  })

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
  const pageWidth = 3300
  const pageHeight = 2550
  const doc = new PDFDocument({ size: [pageWidth, pageHeight], margin: 0, layout: 'landscape' })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  doc.fillColor('#ffffff').rect(0, 0, pageWidth, pageHeight).fill()

  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(200).text('DREIDEL BINGO', 263, 80, {
    width: pageWidth - 526,
    align: 'center'
  })

  doc.fillColor('#000000').font('Helvetica').fontSize(100).text('HANUKKAH 2026 / 5787', 263, 300, {
    width: pageWidth - 526,
    align: 'center'
  })

  const boardWidth = 560
  const boardHeight = 590
  const gapX = 80
  const gapY = 110
  const startX = 140
  const startY = 440

  const actualSeedStrings = seedStrings.length
    ? seedStrings
    : Array.from({ length: Math.max(sheets, 1) }, (_, index) => normalizeDigits(String(index + 1)))

  for (let sheetIndex = 0; sheetIndex < Math.max(Number(sheets), 1); sheetIndex++) {
    const seedString = normalizeDigits(
      actualSeedStrings[sheetIndex] || '',
      Array.from({ length: 128 }, (_, idx) => String((idx % 6) + 1))
    )

    for (let boardIndex = 0; boardIndex < 8; boardIndex++) {
      const row = Math.floor(boardIndex / 4)
      const col = boardIndex % 4
      const x = startX + col * (boardWidth + gapX)
      const y = startY + row * (boardHeight + gapY)
      const digits = seedString.slice(boardIndex * 16, boardIndex * 16 + 16)
      drawBoard(doc, digits, x, y, boardWidth, boardHeight, boardIndex + 1)
    }

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(28).text(
      `${customerName || 'CJC'} | ${variant || 'Dreidel Bingo'} | ${sheetIndex + 1}/${Math.max(Number(sheets), 1)}`,
      0,
      pageHeight - 65,
      {
        width: pageWidth,
        align: 'center'
      }
    )

    if (sheetIndex < Math.max(Number(sheets), 1) - 1) {
      doc.addPage({ size: [pageWidth, pageHeight], margin: 0, layout: 'landscape' })
      doc.fillColor('#ffffff').rect(0, 0, pageWidth, pageHeight).fill()
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(200).text('DREIDEL BINGO', 263, 80, {
        width: pageWidth - 526,
        align: 'center'
      })
      doc.fillColor('#000000').font('Helvetica').fontSize(100).text('HANUKKAH 2026 / 5787', 263, 300, {
        width: pageWidth - 526,
        align: 'center'
      })
    }
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

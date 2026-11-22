import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { randomFillSync } from 'node:crypto'
import { normalizeNigerianPhone, formatPhoneForExport } from '../lib/phone'
import { cleanText, isValidName } from '../lib/text'
import { generateCode, isWellFormedCode, CODE_ALPHABET } from '../lib/code'
import { csvCell } from '../lib/csv'
import { safeEqual } from '../lib/safe-equal'
import { processImage, sniffImage, ImageError } from '../lib/images'

test('phone: accepted Nigerian mobile forms normalise to E.164', () => {
  for (const raw of ['08031234567', '0803 123 4567', '8031234567', '2348031234567', '+234 803 123 4567', '0803-123-4567', '+2348031234567', '(0803) 123.4567']) assert.equal(normalizeNigerianPhone(raw), '+2348031234567', raw)
  for (const raw of ['07012345678', '09151234567', '08101234567']) assert.ok(normalizeNigerianPhone(raw), raw)
})
test('phone: invalid inputs are rejected', () => {
  for (const raw of ['0123456789', '080312345', '+14155552671', 'abcdefghij', '', '08031234567890', '0603 123 4567', '+2340803123456']) assert.equal(normalizeNigerianPhone(raw), null, raw)
})
test('phone: export format stays text', () => { assert.equal(formatPhoneForExport('+2348031234567'), '+234 803 123 4567'); assert.ok(Number.isNaN(Number(formatPhoneForExport('+2348031234567')))) })
test('name: valid and invalid forms', () => {
  for (const name of ["Amachree-Allison Anthonio", "Chukwuemeka O'Brien-Okafor", 'Ọlá Adébáyọ̀', 'Ngozi N.', 'Jo']) assert.ok(isValidName(cleanText(name)), name)
  for (const name of ['J', '<script>alert(1)</script>', 'John3', "=cmd|' /C calc'!A0", 'x'.repeat(81)]) assert.ok(!isValidName(cleanText(name)), name)
})
test('text: line breaks become spaces, not joined words', () => { assert.equal(cleanText('Ada\nObi'), 'Ada Obi'); assert.equal(cleanText('  Ada \t\t Obi\r\n'), 'Ada Obi') })
test('code: format and alphabet exclude ambiguous characters', () => {
  for (let i = 0; i < 5000; i += 1) { const code = generateCode('TLM'); assert.ok(isWellFormedCode(code, 'TLM'), code); assert.ok(!/[01OIL]/.test(code.slice(4)), code) }
  assert.equal(CODE_ALPHABET.length, 31)
})
test('csv: free text neutralised; phone stays intact', () => {
  assert.ok(csvCell("=cmd|' /C calc'!A0").startsWith(`"'=`) || csvCell('=cmd').startsWith("'="))
  assert.equal(csvCell('+1+1'), "'+1+1"); assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)"); assert.equal(csvCell('-2+3'), "'-2+3")
  assert.equal(csvCell('Warri, Delta'), '"Warri, Delta"'); assert.equal(csvCell('+234 803 123 4567', false), '+234 803 123 4567')
})
test('auth: constant-time comparison handles unequal lengths', () => { assert.ok(safeEqual('correct horse', 'correct horse')); assert.ok(!safeEqual('a', 'a-much-longer-value')) })
test('images: file type sniffing uses bytes', async () => {
  assert.equal(sniffImage(Buffer.from('hello, just text renamed .jpg')), null)
  const webp = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#fff' } }).webp().toBuffer()
  assert.equal(sniffImage(webp), 'webp')
})
test('images: EXIF metadata is stripped and rotation applied', async () => {
  const src = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#c33' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer()
  const withGps = await sharp(src).withExif({ IFD0: { Make: 'TECNO' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '5/1 31/1 0/1' } }).withMetadata({ orientation: 6 }).toBuffer()
  assert.ok(withGps.includes(Buffer.from('TECNO')))
  const out = await processImage(withGps, 1600); const meta = await sharp(out).metadata()
  assert.equal(meta.format, 'jpeg'); assert.equal(meta.exif, undefined); assert.ok(!out.includes(Buffer.from('TECNO'))); assert.equal(`${meta.width}x${meta.height}`, '300x400')
})
test('images: longest edge is capped and oversized input rejected', async () => {
  const noise = Buffer.alloc(3000 * 2000 * 3); randomFillSync(noise)
  const big = await sharp(noise, { raw: { width: 3000, height: 2000, channels: 3 } }).jpeg({ quality: 90 }).toBuffer()
  assert.ok(big.length > 2 * 1024 * 1024)
  await assert.rejects(() => processImage(big, 1600), (error) => error instanceof ImageError && error.status === 400)
  const phoneSized = await sharp(noise, { raw: { width: 3000, height: 2000, channels: 3 } }).resize(1200).jpeg({ quality: 40 }).toBuffer()
  const out = await processImage(phoneSized, 1600); const meta = await sharp(out).metadata()
  assert.ok(Math.max(meta.width ?? 0, meta.height ?? 0) <= 1600); assert.ok(out.length < 2 * 1024 * 1024)
})
test('images: malformed files and decompression bombs are rejected', async () => {
  const bad = [Buffer.from('hello this is just text renamed .jpg'), Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('<?php system($_GET[0]); ?>')])]
  for (const bytes of bad) await assert.rejects(() => processImage(bytes, 1600), (error) => error instanceof ImageError && error.status === 415)
  const bomb = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#000' } }).png({ compressionLevel: 9 }).toBuffer()
  assert.ok(bomb.length < 2 * 1024 * 1024)
  await assert.rejects(() => processImage(bomb, 1600), (error) => error instanceof ImageError && error.status === 415)
})
test('images: trailing script bytes are not preserved after re-encoding', async () => {
  const jpg = await sharp({ create: { width: 200, height: 200, channels: 3, background: '#369' } }).jpeg().toBuffer()
  const out = await processImage(Buffer.concat([jpg, Buffer.from('<script>alert(1)</script>')]), 1600)
  assert.ok(!out.includes(Buffer.from('<script>')))
})

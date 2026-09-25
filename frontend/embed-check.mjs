import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5173'
const rows = []
const errors = []
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
    if (m.type() === 'warning' && /wasm|onnx|wasmPath/i.test(m.text())) errors.push(`consoleWARN: ${m.text()}`)
  })
  page.on('requestfailed', (r) => errors.push(`reqfail: ${r.url()} :: ${r.failure()?.errorText}`))

  await page.goto(BASE)
  await page.waitForTimeout(4000)
  const overlay = await page.evaluate(() => !!document.querySelector('vite-error-overlay'))
  rows.push(`vite-error-overlay present: ${overlay}`)

  await page.locator('button', { hasText: 'yolo11s-ss' }).first().click()
  await page.getByRole('option', { name: /yolo11s-fls/ }).click()

  await page.locator('button', { hasText: 'Load all 6' }).click()
  await page.waitForSelector('[data-queue-item] >> nth=1', { timeout: 15000 })
  rows.push('samples loaded')

  const t0 = Date.now()
  await page.getByRole('button', { name: /Run detection on 6 scans/ }).click()
  await page.waitForSelector('text=/Scan complete —/', { timeout: 90000 })
  rows.push(`scan complete in ${((Date.now() - t0) / 1000).toFixed(1)}s (2 images)`)
  rows.push('errors seen so far: ' + errors.length)

  await page.getByRole('tab', { name: 'Review Detections' }).click()
  await page.waitForSelector('text=Detections', { timeout: 15000 })
  rows.push('review opened, errors: ' + errSlice(errors))

  const tr = await page.locator('table tbody tr').count()
  rows.push(`results table rows: ${tr}`)
  await page.screenshot({ path: '/tmp/embed-ok.png' })

  const embedded = await page.evaluate(() =>
    window.__ORT__ ? window.__ORT__ : 'n/a')
  rows.push(`runtime marker: ${embedded}`)

  console.log('RESULT\n' + rows.join('\n'))
  console.log('ERRORS\n' + (errors.length ? errors.join('\n') : '(none)'))
  await browser.close()
})().catch((e) => {
  console.error('FAILED:', e.message)
  console.log(rows.join('\n'))
  console.log('ERRORS\n' + (errors.length ? errors.join('\n') : '(none)'))
  process.exit(1)
})

function errSlice(list) {
  return list.slice(-4).join(' | ')
}
import { test, expect } from '@playwright/test'

test.describe('Debris dashboard smoke', () => {
  test('full pipeline: upload → detect → review → insights → map coord → export', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`)
    })

    await page.goto('/')
    await expect(page).toHaveTitle(/Marine Debris/)

    // Model chip (side-scan default) + dropdown lists both scan types
    await expect(page.getByRole('button', { name: /ACTIVE MODEL/ })).toBeVisible()
    await page.getByRole('button', { name: /ACTIVE MODEL/ }).click()
    await expect(page.getByRole('option', { name: /yolo11s-fls/ })).toBeVisible()
    await page.getByRole('option', { name: /yolo11s-fls/ }).click()
    await expect(page.getByRole('button', { name: /Forward-looking sonar/ })).toBeVisible()

    // 1) Load samples
    await page.getByRole('button', { name: 'Load all 6' }).click()
    await expect(page.locator('[data-queue-item]')).toHaveCount(6)
    await expect(page.getByText(/6 sample scans loaded/)).toBeVisible()

    // 2) Run detection
    await page.getByRole('button', { name: /Run detection on 6 scans/ }).click()
    await expect(page.getByText(/Scan complete —/)).toBeVisible({ timeout: 30000 })

    // 3) Review tab
    await page.getByRole('tab', { name: 'Review Detections' }).click()
    const boxes = page.getByRole('button', { name: /confidence$/ })
    await expect(boxes.first()).toBeVisible()
    const boxCount = await boxes.count()
    expect(boxCount).toBeGreaterThan(0)
    // table header + confidence slider
    await expect(page.getByRole('heading', { name: 'Detections' })).toBeVisible()
    await expect(page.getByLabel('Confidence ≥').or(page.locator('#conf-slider'))).toBeVisible()

    // 4) Insights
    await page.getByRole('tab', { name: 'Insights' }).click()
    await expect(page.getByText('Images scanned')).toBeVisible()
    await expect(page.getByText('Objects by class')).toBeVisible()
    await expect(page.getByText('Top confidence hits')).toBeVisible()

    // 5) Map — set one batch coordinate (links every scan)
    await page.getByRole('tab', { name: 'Map & Report' }).click()
    const fields = page.locator('input[type="text"]')
    await fields.nth(0).fill('8.3112')
    await fields.nth(1).fill('76.943')
    await fields.nth(2).fill('0.012')
    await page.getByRole('button', { name: 'Apply to batch' }).click()
    await expect(page.getByText(/Batch coordinate set/)).toBeVisible()
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Legend ·/)).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 15000 })

    // 7) Export JSON — expect a download
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download JSON' }).click(),
    ])
    expect(dl.suggestedFilename()).toMatch(/scan-.*\.json/)

    // report summary table present
    await expect(page.getByText(/Report ·/)).toBeVisible()

    expect(errors, `console/page errors:\n${errors.join('\n')}`).toEqual([])
  })
})
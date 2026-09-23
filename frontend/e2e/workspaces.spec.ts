import { test, expect } from '@playwright/test'
import type { CatalogRead } from '../src/types/domain'

test('command center map and localized simulator share saved district choices', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Начать сценарий' }).click()
  await expect(page.getByTestId('initiative-M7')).toBeEnabled()
  await page.getByRole('button', { name: 'Открыть карту', exact: true }).click()
  const map = page.getByRole('region', { name: 'Районы Астаны', exact: true })
  await expect(map.getByTestId('astana-map-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  const catalog = await page.request.get('/api/catalog').then(r => r.json()) as CatalogRead
  const m7 = catalog.initiatives.find(row => row.code === 'M7')!
  const nura = catalog.districts.find(row => row.code === 'nura')!
  await map.getByRole('combobox', { name: 'Район учебной модели', exact: true }).selectOption(nura.id)
  await map.getByRole('combobox', { name: 'Мероприятие', exact: true }).selectOption(m7.id)
  await map.getByRole('button', { name: 'Назначить район мероприятию' }).click()
  await expect(page.getByTestId('district-M7')).toHaveValue(nura.id)
  await page.getByTestId('initiative-M7').click()
  await expect(page.getByTestId('initiative-M7')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: 'Симулятор · RU / ҚҚ' }).click()
  await expect(page).toHaveURL(/\/simulator$/)
  await expect(page.getByTestId('initiative-M7')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('district-M7')).toHaveValue(nura.id)
  await page.getByTestId('district-M7').selectOption({ label: 'Сарыарка' })
  await expect(page.getByTestId('initiative-M7')).toBeEnabled()
  await page.getByRole('link', { name: 'Command center ↗' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('initiative-M7')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('district-M7')).toHaveValue(catalog.districts.find(row => row.code === 'saryarka')!.id)
})

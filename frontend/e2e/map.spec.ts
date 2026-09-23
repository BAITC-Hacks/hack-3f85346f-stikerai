import { test, expect } from '@playwright/test'
import { districtValue, mapFeatures } from '../src/mapData'
import type { CatalogRead, MapDistrictCollection } from '../src/types/domain'

test('map: geometry loads without external tiles; unmatched districts remain neutral', async ({ page }, testInfo) => {
  await page.route('https://**/*', route => route.abort())
  await page.goto('/legacy-simulator')
  await page.getByRole('button', { name: 'Открыть карту', exact: true }).click()
  const map = page.getByRole('region', { name: 'Районы Астаны', exact: true })
  await expect(map.getByTestId('astana-map-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  await expect(map.getByRole('button', { name: 'После', exact: true })).toBeDisabled()
  await map.getByRole('combobox', { name: 'Район на карте', exact: true }).selectOption({ label: 'Сарайшык' })
  await expect(map.getByTestId('map-mapping-status')).toHaveText('Нет сопоставленных данных')
  await expect(map.getByRole('combobox', { name: 'Район учебной модели', exact: true })).toHaveValue('')
  const catalog = await page.request.get('/api/catalog').then(r => r.json()) as CatalogRead
  const collection = await page.request.get(`/api/map/districts?dataset_id=${catalog.dataset.id}`).then(r => r.json()) as MapDistrictCollection
  const rendered = mapFeatures(collection, catalog, null, 'score', 'before')
  expect(rendered.features.every(row => row.properties.value === null)).toBeTruthy()
  // Exercise the reviewed-link path without presenting a fabricated mapping in the shipped snapshot.
  const nura = collection.features.find(row => row.properties.code === 'nura')!
  nura.properties.mapping_status = 'verified'
  nura.properties.district_id = nura.properties.candidate_district_id
  expect(mapFeatures(collection, catalog, null, 's1', 'before').features.find(row => row.id === nura.id)?.properties.value).toBe(38)
  expect(districtValue(catalog, null, nura.properties.district_id!, 's1', 'after')).toBeNull()
  await map.getByLabel('Улицы · OpenFreeMap').check()
  await expect(map.getByText('Улицы не загрузились.', { exact: false })).toBeVisible()
  await expect(map.getByTestId('astana-map-canvas')).toHaveAttribute('data-ready', 'true')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(map.getByRole('combobox', { name: 'Район на карте', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await map.screenshot({ path: testInfo.outputPath('map-mobile.png') })
})

test('map: assign a district, preserve saved choices, and compare server results', async ({ page }) => {
  await page.goto('/legacy-simulator')
  await page.getByRole('button', { name: 'Начать сценарий', exact: true }).click()
  await page.getByRole('button', { name: 'Открыть карту', exact: true }).click()
  const map = page.getByRole('region', { name: 'Районы Астаны', exact: true })
  await map.getByRole('combobox', { name: 'Район на карте', exact: true }).selectOption({ label: 'Нура' })
  await map.getByRole('button', { name: 'Открыть «Нура» в учебной модели' }).click()
  const catalog = await page.request.get('/api/catalog').then(r => r.json()) as CatalogRead
  const m7 = catalog.initiatives.find(row => row.code === 'M7')!
  const nura = catalog.districts.find(row => row.code === 'nura')!
  await map.getByRole('combobox', { name: 'Мероприятие', exact: true }).selectOption(m7.id)
  await map.getByRole('button', { name: 'Назначить район мероприятию' }).click()
  await expect(page.getByTestId('district-M7')).toHaveValue(nura.id)
  await page.getByTestId('initiative-M7').click()
  await expect(page.getByTestId('initiative-M7')).toHaveAttribute('aria-pressed', 'true')
  await map.getByRole('combobox', { name: 'Район учебной модели', exact: true }).selectOption({ label: 'Сарыарка' })
  await map.getByRole('button', { name: 'Назначить район мероприятию' }).click()
  await expect(page.getByTestId('district-M7')).toHaveValue(catalog.districts.find(row => row.code === 'saryarka')!.id)
  await page.reload()
  await expect(page.getByTestId('district-M7')).toHaveValue(catalog.districts.find(row => row.code === 'saryarka')!.id)
  await page.getByRole('button', { name: 'Открыть карту', exact: true }).click()
  await map.getByRole('combobox', { name: 'Район учебной модели', exact: true }).selectOption({ label: 'Нура' })
  await map.getByRole('combobox', { name: 'Мероприятие', exact: true }).selectOption(m7.id)
  await map.getByRole('button', { name: 'Назначить район мероприятию' }).click()
  await expect(page.getByTestId('district-M7')).toHaveValue(nura.id)
  for (const [code, name] of [['M8', 'Нура'], ['M10', 'Нура'], ['M12', ''], ['M5', 'Сарыарка']]) {
    if (name) await page.getByTestId(`district-${code}`).selectOption({ label: name })
    await page.getByTestId(`initiative-${code}`).click()
    await expect(page.getByTestId(`initiative-${code}`)).toBeEnabled()
  }
  await expect(page.getByTestId('score')).toHaveText('56,54')
  await map.getByRole('combobox', { name: 'Показатель', exact: true }).selectOption('s1')
  await expect(map.getByTestId('map-model-value')).toHaveText('38')
  await map.getByRole('button', { name: 'После', exact: true }).click()
  await expect(map.getByTestId('map-model-value')).toHaveText('48')
  await map.getByRole('button', { name: 'Изменение', exact: true }).click()
  await expect(map.getByTestId('map-model-value')).toHaveText('+10')
  await page.getByTestId('initiative-M8').click()
  await expect(map.getByRole('button', { name: 'После', exact: true })).toBeDisabled()
  await expect(map.getByTestId('map-model-value')).toHaveText('38')
})

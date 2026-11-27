import test from 'node:test';
import assert from 'node:assert/strict';

import { isBarcode, mapOffProduct, mapOffSearch } from '../src/services/open-food-facts.ts';

test('maps an OFF product (Polish name first, per 100 g)', () => {
  const item = mapOffProduct({
    code: '5900820000011',
    product_name: 'Oat flakes',
    product_name_pl: 'Płatki owsiane górskie',
    brands: 'Melvit, Something',
    nutriments: { 'energy-kcal_100g': 372, proteins_100g: 13.5, carbohydrates_100g: '58,7', fat_100g: 7 },
  });
  assert.deepEqual(item, {
    source: 'off', id: '5900820000011', barcode: '5900820000011', name: 'Płatki owsiane górskie',
    brand: 'Melvit', imageUrl: null, kcal: 372, protein: 13.5, carbs: 58.7, fat: 7,
  });
});

test('falls back to kJ, skips products without energy or name', () => {
  assert.equal(mapOffProduct({ code: '12345678', product_name: 'Sok', nutriments: { 'energy-kj_100g': 184 } }).kcal, 44);
  assert.equal(mapOffProduct({ code: '12345678', product_name: 'Bez kalorii', nutriments: {} }), null);
  assert.equal(mapOffProduct({ code: '12345678', nutriments: { 'energy-kcal_100g': 10 } }), null);
});

test('search: no duplicates, name matches first', () => {
  const p = (code, name) => ({ code, product_name: name, nutriments: { 'energy-kcal_100g': 100 } });
  const items = mapOffSearch([p('11111111', 'Mleko UHT'), p('22222222', 'Skyr naturalny'), p('22222222', 'Skyr naturalny')], 'skyr');
  assert.deepEqual(items.map((i) => i.id), ['22222222', '11111111']);
  assert.equal(isBarcode('5900820000011'), true);
  assert.equal(isBarcode('skyr'), false);
});

test('new search format: brands as tagged array, null nutriments', () => {
  const item = mapOffProduct({ code: '5901545025495', product_name: 'Kurczak Pieczony', brands: ['xx:morliny'], nutriments: { 'energy-kcal_100g': 114, proteins_100g: 20 } });
  assert.equal(item.brand, 'morliny');
  assert.equal(item.kcal, 114);
  assert.equal(mapOffProduct({ code: '5901545025495', product_name: 'Kurczak', nutriments: null }), null);
});

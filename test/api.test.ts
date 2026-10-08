// @ts-nocheck
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { createApi } from '@/api'
import { createMockAdapter } from '@/api/mock'
import { createGasAdapter } from '@/api/gas'
import { memoryStorage } from './helpers'

const NOW = Date.parse('2026-09-26T18:00:00+08:00');
function setup(who = 'Brian') {
  const storage = memoryStorage();
  const mock = createMockAdapter({ storage, now: () => NOW });
  const api = createApi({ adapter: mock, storage, who, now: () => NOW });
  return { storage, mock, api };
}

test('本機試用的起始資料＝正式初始資料，沒有編造的紀錄', async () => {
  const { api } = setup();
  const d = await api.load();
  assert.deepEqual(d.tables.Foods.map((f) => f.name), ['Hello Fresh 鯖魚', 'Hello Fresh 鮪魚雞肉', '雞肉絲']);
  assert.deepEqual(d.tables.Weight.map((w) => w.kg), [3.5]);
  assert.equal(d.tables.Feed.length + d.tables.Litter.length + d.tables.Med.length + d.tables.Issue.length, 0);
  assert.equal(d.config.litter_clumping, true);
  assert.equal(d.config.users, 'Brian,Mia');
});

test('寫入後不用重新讀取：peek 立刻看到待送，送出後留在快照裡', async () => {
  const { api, mock } = setup();
  await api.load();
  mock.setOffline(true);
  const p = api.log('Feed', { food_id: 'hf-mackerel', food_name: 'Hello Fresh 鯖魚', reaction: '喜歡' }, { id: 'feed-1' });
  assert.equal(api.peek().tables.Feed.find((r) => r.id === 'feed-1').__pending, true);
  await p;
  mock.setOffline(false);
  await api.flush();
  const row = api.peek().tables.Feed.find((r) => r.id === 'feed-1');
  assert.ok(row && !row.__pending);
  await api.setConfig('clinic_phone', '02-1234');
  await api.upsertFood({ food_id: 'new-food', name: '凍乾雞', kind: '凍乾', unit: '顆' });
  assert.equal(api.peek().config.clinic_phone, '02-1234');
  assert.ok(api.peek().tables.Foods.some((f) => f.food_id === 'new-food'));
});

test('log 自動帶 id、台北時間、記錄人', async () => {
  const { api } = setup('Mia');
  const { record, queued } = await api.log('Litter', { all_normal: true, urine_count: 2, stool_count: 1 });
  assert.equal(queued, false);
  assert.equal(record.who, 'Mia');
  assert.equal(record.ts, '2026-09-26T18:00:00+08:00');
  assert.match(record.id, /^[0-9a-f-]{36}$/);
  const d = await api.load();
  assert.ok(d.tables.Litter.some((r) => r.id === record.id));
});

test('離線時寫入進佇列、畫面看得到，上線後補送且不重複', async () => {
  const { api, mock } = setup();
  mock.setOffline(true);
  const { record, queued } = await api.log('Feed', { food_id: 'f2', food_name: 'x', eaten_pct: '' });
  assert.equal(queued, true);
  assert.equal(api.status().pending, 1);
  assert.equal(api.status().online, false);
  const offlineView = await api.load();
  assert.ok(offlineView.tables.Feed.find((r) => r.id === record.id).__pending, '離線時也看得到待送紀錄');

  mock.setOffline(false);
  assert.equal(await api.flush(), 1);
  assert.equal(api.status().pending, 0);
  await api.flush();
  const d = await api.load();
  assert.equal(d.tables.Feed.filter((r) => r.id === record.id).length, 1);
});

test('重送同一個 id 不會寫兩列（冪等）', async () => {
  const { mock } = setup();
  const rec = { id: 'dup-1', ts: '2026-09-26T17:00:00+08:00', who: 'Brian', kg: 3.5 };
  await mock.call({ action: 'append', table: 'Weight', record: rec });
  const again = await mock.call({ action: 'append', table: 'Weight', record: rec });
  assert.equal(again.duplicate, true);
  const d = await mock.call({ action: 'read' });
  assert.equal(d.tables.Weight.filter((r) => r.id === 'dup-1').length, 1);
});

test('撤銷是軟刪除，可以復原', async () => {
  const { api } = setup();
  const { record } = await api.log('Weight', { kg: 3.5, method: '寵物秤' });
  await api.remove('Weight', record.id);
  const gone = (await api.load()).tables.Weight.find((r) => r.id === record.id);
  assert.equal(gone.deleted, true, '撤銷的紀錄仍會讀回來（時間軸用刪除線顯示）');
  await api.restore('Weight', record.id);
  assert.equal((await api.load()).tables.Weight.find((r) => r.id === record.id).deleted, false);
});

test('補填吃了多少、改時間可以；不能改 who/id', async () => {
  const { api } = setup();
  const { record } = await api.log('Feed', { food_id: 'f1', food_name: 'x', eaten_pct: '' });
  await api.edit('Feed', record.id, { eaten_pct: 75, who: '別人', ts: '2026-09-26T07:00:00+08:00' });
  const row = (await api.load()).tables.Feed.find((r) => r.id === record.id);
  assert.deepEqual([row.eaten_pct, row.who, row.ts], [75, 'Brian', '2026-09-26T07:00:00+08:00']);
});

test('永久錯誤移到 failed 並提示，不會卡住後面的佇列', async () => {
  const { api } = setup();
  await api.edit('Feed', 'no-such-id', { eaten_pct: 50 });
  const { record } = await api.log('Weight', { kg: 3.6 });
  const s = api.status();
  assert.equal(s.pending, 0);
  assert.equal(s.failed.length, 1);
  assert.equal(s.failed[0].error, 'not_found');
  assert.ok((await api.load()).tables.Weight.some((r) => r.id === record.id));
});

test('busy（有人正在寫）留在佇列稍後重試', async () => {
  const storage = memoryStorage();
  let busy = true;
  const inner = createMockAdapter({ storage, now: () => NOW });
  const adapter = { kind: 'test', call: (op) => (busy && op.action !== 'read' ? Promise.resolve({ ok: false, error: 'busy' }) : inner.call(op)) };
  const api = createApi({ adapter, storage, who: 'Brian', now: () => NOW });
  await api.log('Weight', { kg: 3.6 });
  assert.equal(api.status().pending, 1);
  busy = false;
  await api.flush();
  assert.equal(api.status().pending, 0);
});

test('Apps Script 介面卡：text/plain、跟隨轉址、密鑰只在 body', async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ ok: true }) }; };
  const a = createGasAdapter({ url: 'https://script.google.com/macros/s/ABC/exec', secret: 's3cret-value-123456', fetchImpl });
  await a.call({ action: 'read', days: 7 });
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.equal(seen.init.redirect, 'follow');
  assert.ok(!seen.url.includes('s3cret'));
  assert.equal(JSON.parse(seen.init.body).secret, 's3cret-value-123456');
});

test('Apps Script 介面卡：斷線丟 NetworkError，HTML 回應給清楚訊息', async () => {
  const down = createGasAdapter({ url: 'https://x/exec', secret: 'k', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(down.call({ action: 'read' }), { name: 'NetworkError' });
  const html = createGasAdapter({ url: 'https://x/exec', secret: 'k', fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError(); } }) });
  assert.equal((await html.call({ action: 'read' })).error, 'bad_response');
});

test('第一次開啟就離線：仍可記錄，看到空資料＋待送紀錄', async () => {
  const storage = memoryStorage()
  const mock = createMockAdapter({ storage, now: () => NOW })
  mock.setOffline(true)
  const api = createApi({ adapter: mock, storage, who: 'Mia', now: () => NOW })
  const { record } = await api.log('Weight', { kg: 3.5 })
  const d = await api.load()
  assert.equal(d.config.users, 'Brian,Mia')
  assert.deepEqual(d.tables.Weight.map((r) => r.id), [record.id])
})

test('送出失敗可以重試', async () => {
  const { api, mock } = setup()
  await api.edit('Feed', 'later', { eaten_pct: 50 })
  assert.equal(api.status().failed.length, 1)
  await mock.call({ action: 'append', table: 'Feed', record: { id: 'later', ts: '2026-09-26T17:00:00+08:00', who: 'Mia' } })
  assert.equal(await api.retryFailed(), 1)
  assert.equal(api.status().failed.length, 0)
})

test('寫入逾時但後端其實已寫入：補送時新增食物和記一筆都不會重複', async () => {
  const storage = memoryStorage();
  const mock = createMockAdapter({ storage, now: () => NOW });
  let dropReplies = true;
  // 模擬：請求送到、後端寫好了，但回應在瀏覽器逾時後才到（被當成 NetworkError）
  const flaky = { kind: 'gas', async call(op) { const res = await mock.call(op); if (dropReplies && op.action !== 'read') { const { NetworkError } = await import('@/api/errors'); throw new NetworkError(undefined, 'timeout'); } return res; } };
  const api = createApi({ adapter: flaky, storage, who: 'Brian', now: () => NOW });
  await api.upsertFood({ food_id: 'snack-1', name: '新零食', kind: 'treat', unit: '顆', default_qty: 1, fav: false, active: true });
  const { record, queued } = await api.log('Feed', { food_id: 'snack-1', food_name: '新零食', qty: 1, unit: '顆' });
  assert.equal(queued, true);
  assert.equal(api.status().online, false);
  assert.equal(api.status().pending, 2);

  dropReplies = false;
  assert.equal(await api.flush(), 2);
  assert.equal(api.status().pending, 0);
  const d = await api.load();
  assert.equal(d.tables.Foods.filter((f) => f.food_id === 'snack-1').length, 1);
  assert.equal(d.tables.Feed.filter((r) => r.id === record.id).length, 1);
});

test('Apps Script 介面卡：預設等 55 秒；逾時丟 NetworkError(kind=timeout)', async () => {
  const { GAS_TIMEOUT_MS } = await import('@/api/gas');
  assert.ok(GAS_TIMEOUT_MS >= 50_000, '冷啟動 12–26 秒＋寫入，不能只等 20 秒');
  let signal;
  const hang = (url, init) => { signal = init.signal; return new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))); };
  const a = createGasAdapter({ url: 'https://x/exec', secret: 'k', fetchImpl: hang, timeoutMs: 30 });
  await assert.rejects(a.call({ action: 'append' }), (e) => e.name === 'NetworkError' && e.kind === 'timeout');
  assert.equal(signal.aborted, true);
  const def = createGasAdapter({ url: 'https://x/exec', secret: 'k', fetchImpl: async (u, init) => { signal = init.signal; return { ok: true, json: async () => ({ ok: true }) }; } });
  await def.call({ action: 'read' });
});

test('history 半開視窗；getPhoto 讀得到上傳的檔；兩者都不進佇列', async () => {
  const { api, mock } = setup();
  await api.load();
  const before = '2026-10-09T00:00:00+08:00';
  const from = '2026-09-09T00:00:00+08:00';
  await mock.call({ action: 'append', table: 'Care', record: { id: 'in', ts: from, who: 'Brian', kind: 'litter_wash', note: '', deleted: false } });
  await mock.call({ action: 'append', table: 'Care', record: { id: 'edge', ts: before, who: 'Brian', kind: 'feeder_clean', note: '', deleted: false } });
  const pendingBefore = api.status().pending;
  const page = await api.history({ before, days: 30 });
  assert.equal(api.status().pending, pendingBefore);
  assert.equal(page.from, from);
  assert.ok(page.tables.Care?.some((r) => r.id === 'in'));
  assert.ok(!page.tables.Care?.some((r) => r.id === 'edge'));

  const up = await mock.call({ action: 'uploadPhoto', data: 'YWJj', mime: 'image/jpeg', filename: 'a.jpg' });
  const photo = await api.getPhoto(up.fileId);
  assert.equal(api.status().pending, pendingBefore);
  assert.equal(photo.mime, 'image/jpeg');
  assert.equal(photo.data, 'YWJj');
  const forbidden = await mock.call({ action: 'getPhoto', fileId: 'nope' });
  assert.equal(forbidden.error, 'forbidden');
});

test('upsertFood 只送 food_id 與 active:false 時不會把名稱洗掉', async () => {
  const { api } = setup();
  await api.load();
  const name = api.peek().tables.Foods.find((f) => f.food_id === 'hf-mackerel').name;
  await api.upsertFood({ food_id: 'hf-mackerel', active: false });
  const row = api.peek().tables.Foods.find((f) => f.food_id === 'hf-mackerel');
  assert.equal(row.name, name);
  assert.equal(row.active, false);
});

test('舊的 mock db 沒有 Care 陣列時 read 仍成功', async () => {
  const storage = memoryStorage();
  storage.setItem('sicily.mockdb', JSON.stringify({
    Foods: [], Config: { users: 'Brian,Mia' }, Feed: [], Litter: [], Weight: [], Med: [], Issue: [],
  }));
  const mock = createMockAdapter({ storage, now: () => NOW });
  const api = createApi({ adapter: mock, storage, who: 'Brian', now: () => NOW });
  const d = await api.load();
  assert.ok(Array.isArray(d.tables.Care));
  assert.equal(d.tables.Care.length, 0);
});

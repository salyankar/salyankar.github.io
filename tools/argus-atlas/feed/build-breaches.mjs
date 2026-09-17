// Argus Atlas — breach feed builder
// Runs in GitHub Actions (Node 20+). Pulls public sources, normalises them into the
// dashboard's breach shape, and writes tools/argus-atlas/data/breaches.json.
//
// Sources
//   sec : SEC EDGAR full-text search — Form 8-K filings with Item 1.05 (material cybersecurity incidents)
//   rl  : ransomware.live — victims posted on ransomware leak sites (claims, not confirmed disclosures)
//
// Usage: node tools/argus-atlas/feed/build-breaches.mjs [--days 60] [--out path]

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const WINDOW_DAYS = Number(arg('--days', 60));
const OUT = resolve(arg('--out', resolve(dirname(fileURLToPath(import.meta.url)), '../data/breaches.json')));
const UA = 'Satya Salyankar satyajitsalyankar@gmail.com';

const now = new Date();
const since = new Date(now.getTime() - WINDOW_DAYS * 864e5);
const iso = d => d.toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJSON(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160)}`);
      return await r.json();
    } catch (e) {
      if (i === tries) throw new Error(`${url} → ${e.message}`);
      await sleep(1500 * i);
    }
  }
}

// ---- sector mapping -------------------------------------------------------
const SEC_TORS = {
  FIN: 'Financial Services', HLT: 'Healthcare & Life Sciences', ENE: 'Energy & Utilities', MFG: 'Manufacturing & Industrial',
  TEC: 'Technology & Telecom', RET: 'Retail & Consumer', GOV: 'Government & Public Sector', TRN: 'Transportation & Logistics',
  DEF: 'Defense & Aerospace', EDU: 'Education & Research', OTH: 'Other',
};
function sectorFromSIC(sic) {
  const n = Number(sic); if (!n) return SEC_TORS.OTH;
  if ((n >= 1311 && n <= 1389) || (n >= 4900 && n <= 4999) || n === 2911) return SEC_TORS.ENE;
  if ((n >= 2833 && n <= 2836) || (n >= 3841 && n <= 3851) || (n >= 8000 && n <= 8099) || n === 5047 || n === 5122) return SEC_TORS.HLT;
  if ((n >= 3720 && n <= 3729) || n === 3760 || n === 3812 || n === 3795) return SEC_TORS.DEF;
  if ((n >= 3570 && n <= 3579) || (n >= 3661 && n <= 3679) || (n >= 3690 && n <= 3699) || (n >= 4800 && n <= 4899) || (n >= 7370 && n <= 7379)) return SEC_TORS.TEC;
  if (n >= 4000 && n <= 4799) return SEC_TORS.TRN;
  if (n >= 5000 && n <= 5999 || (n >= 7000 && n <= 7099) || (n >= 7800 && n <= 7999)) return SEC_TORS.RET;
  if (n >= 6000 && n <= 6799) return SEC_TORS.FIN;
  if (n >= 8200 && n <= 8299) return SEC_TORS.EDU;
  if (n >= 9000) return SEC_TORS.GOV;
  if (n >= 100 && n <= 3999) return SEC_TORS.MFG;
  return SEC_TORS.OTH;
}
function sectorFromActivity(a) {
  const s = String(a || '').toLowerCase();
  if (!s || s === 'not found' || s === 'other') return SEC_TORS.OTH;
  if (/health|pharma|medic|hospital|dental|clinic/.test(s)) return SEC_TORS.HLT;
  if (/financ|bank|insur|invest|accounting/.test(s)) return SEC_TORS.FIN;
  if (/energy|utilit|oil|gas|mining|water/.test(s)) return SEC_TORS.ENE;
  if (/technolog|telecom|software|it service|internet|media/.test(s)) return SEC_TORS.TEC;
  if (/retail|e-commerce|ecommerce|hospitality|tourism|consumer|restaurant|hotel/.test(s)) return SEC_TORS.RET;
  if (/transport|logistic|shipping|aviation|airline|automotive/.test(s)) return SEC_TORS.TRN;
  if (/government|public|municipal|defen[cs]e|military/.test(s)) return SEC_TORS.GOV;
  if (/education|school|universit|research/.test(s)) return SEC_TORS.EDU;
  if (/manufactur|industrial|construction|agricultur|food|chemical|engineering/.test(s)) return SEC_TORS.MFG;
  return SEC_TORS.OTH;
}

// ---- helpers --------------------------------------------------------------
const titleCase = s => s.replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => a + b.toLowerCase()).replace(/\b(Inc|Corp|Ltd|Llc|Plc|Co)\b\.?/g, m => m.replace(/^(\w)/, c => c.toUpperCase()));
const clean = s => String(s || '').replace(/\[AI generated\]/gi, '').replace(/\r?\n/g, '').replace(/\s+/g, ' ').trim();
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };
const inWindow = d => d instanceof Date && !isNaN(d) && d >= since && d <= new Date(now.getTime() + 864e5);

// ---- SEC EDGAR: 8-K Item 1.05 -------------------------------------------
async function fetchSEC() {
  const base = `https://efts.sec.gov/LATEST/search-index?q=%22Item%201.05%22&forms=8-K&dateRange=custom&startdt=${iso(since)}&enddt=${iso(now)}`;
  const hits = [];
  for (let from = 0; from < 1000; from += 100) {
    const j = await getJSON(`${base}&from=${from}`);
    const h = j?.hits?.hits || [];
    hits.push(...h);
    if (h.length < 100 || from + 100 >= (j?.hits?.total?.value || 0)) break;
    await sleep(300); // SEC fair-access: stay well under 10 req/s
  }
  const byCik = new Map();
  for (const h of hits) {
    const s = h._source || {};
    if (!(s.items || []).includes('1.05')) continue;
    const cik = (s.ciks || [])[0]; if (!cik) continue;
    const date = new Date(s.file_date + 'T00:00:00Z'); if (!inWindow(date)) continue;
    const name = titleCase(String((s.display_names || [])[0] || '').replace(/\s*\(.*$/, '').trim()) || `CIK ${cik}`;
    const adsh = s.adsh;
    const rec = {
      date: iso(date), form: s.form, name, cik, sic: (s.sics || [])[0] || '', loc: (s.biz_locations || [])[0] || '',
      url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${String(adsh).replace(/-/g, '')}/${adsh}-index.htm`,
    };
    const prev = byCik.get(cik);
    if (!prev) byCik.set(cik, { first: rec, latest: rec, n: 1 });
    else { prev.n++; if (rec.date < prev.first.date) prev.first = rec; if (rec.date > prev.latest.date) prev.latest = rec; }
  }
  return [...byCik.values()].map(({ first, latest, n }) => ({
    id: `sec-${first.cik}-${first.date}`,
    source: 'sec', kind: 'disclosure',
    date: first.date, country: 'US', sector: sectorFromSIC(first.sic),
    org: first.name,
    type: 'Material cybersecurity incident (Form 8-K, Item 1.05)',
    status: n > 1 ? `Disclosed to SEC; ${n - 1} amendment${n > 2 ? 's' : ''} filed (latest ${latest.date})` : 'Disclosed to SEC (Form 8-K)',
    detail: [first.sic ? `SIC ${first.sic}` : '', first.loc].filter(Boolean).join(' · '),
    url: latest.url,
  }));
}

// ---- ransomware.live: leak-site victims ----------------------------------
async function fetchRansomwareLive() {
  const months = new Set();
  for (let d = new Date(since); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.add(`${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  months.add(`${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`);
  const seen = new Map();
  for (const m of months) {
    let list = [];
    try { list = await getJSON(`https://api.ransomware.live/v2/victims/${m}`); } catch (e) { console.warn('ransomware.live', m, e.message); continue; }
    if (!Array.isArray(list)) continue;
    for (const v of list) {
      const date = new Date(v.discovered || v.attackdate || ''); if (!inWindow(date)) continue;
      const victim = clean(v.victim || v.domain || ''); if (!victim) continue;
      const group = clean(v.group || 'unknown group');
      const key = `${victim.toLowerCase()}|${group.toLowerCase()}`;
      if (seen.has(key)) continue;
      const desc = cut(clean(v.description).replace(/^N\/A$/i, ''), 160);
      seen.set(key, {
        id: `rl-${hash(key)}`,
        source: 'rl', kind: 'claim',
        date: iso(date), country: String(v.country || '').toUpperCase() || '', sector: sectorFromActivity(v.activity),
        org: victim, group,
        type: `Ransomware leak-site claim (${group})`,
        status: 'Listed on a leak site; not a confirmed disclosure',
        records: v.data_size ? String(v.data_size) : '',
        detail: [v.activity && v.activity !== 'Not Found' ? v.activity : '', desc].filter(Boolean).join(' · '),
        url: v.url || '',
      });
    }
    await sleep(500);
  }
  return [...seen.values()];
}

// ---- main -------------------------------------------------------------------
const sources = [];
let breaches = [];
for (const [id, name, fn] of [['sec', 'SEC EDGAR 8-K Item 1.05', fetchSEC], ['rl', 'ransomware.live leak-site claims', fetchRansomwareLive]]) {
  try {
    const rows = await fn();
    breaches.push(...rows);
    sources.push({ id, name, ok: true, count: rows.length });
    console.log(`${id}: ${rows.length} records`);
  } catch (e) {
    sources.push({ id, name, ok: false, count: 0, error: String(e.message || e) });
    console.error(`${id}: FAILED — ${e.message || e}`);
  }
}
breaches.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.org.localeCompare(b.org)));
// Drop empty fields to keep the file small.
breaches = breaches.map(b => Object.fromEntries(Object.entries(b).filter(([, v]) => v !== '' && v != null)));

if (!sources.some(s => s.ok)) { console.error('No source succeeded; leaving existing file untouched.'); process.exit(1); }

const out = { generated: now.toISOString(), window_days: WINDOW_DAYS, sources, breaches };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${OUT}: ${breaches.length} breaches (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);

import { supabaseJson } from './client';
import { MASTER_LIGHT_COLS } from './schema.generated';
// db/master.js — repo master biodata/CV (master_database_candidate).

// Kolom RINGAN master_database_candidate — hanya kolom yang benar-benar
// dibaca attachBerkasBio (BERKAS_COLUMNS *_url + BIO_COLUMNS + pencocok WA).
// MASTER_LIGHT_COLS imported from schema.generated.ts

// Tarik master_database_candidate hanya untuk WA di daftar.
// Only no_wa column exists in this table — wa/whatsapp don't exist.
async function fetchMasterByWa(waList) {
  const inList = waList.join(',');
  try {
    const rows = await supabaseJson('GET', 'master_database_candidate', {
      query: { select: '*', limit: '500', no_wa: 'in.(' + inList + ')' },
    });
    if (Array.isArray(rows)) return rows;
  } catch {
    /* fallback scan penuh */
  }
  return null;
}

// Master RINGAN (proyeksi MASTER_LIGHT_COLS) untuk attachBerkasBio
async function fetchMasterLightByWa(waList) {
  const inList = waList.join(',');
  try {
    const light = await supabaseJson('GET', 'master_database_candidate', {
      query: { select: MASTER_LIGHT_COLS, limit: '500', no_wa: 'in.(' + inList + ')' },
    });
    if (Array.isArray(light)) return light;
  } catch {
    /* proyeksi tidak cocok — coba select * */
  }
  try {
    const full = await supabaseJson('GET', 'master_database_candidate', {
      query: { limit: '500', no_wa: 'in.(' + inList + ')' },
    });
    if (Array.isArray(full)) return full;
  } catch {
    /* fallback scan penuh */
  }
  return null;
}

export { fetchMasterByWa, fetchMasterLightByWa };

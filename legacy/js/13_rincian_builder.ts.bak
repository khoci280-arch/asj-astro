import { registerSeamAliases } from './core/bridge.ts';
// ESM (Fase 3 langkah 12): modul ES — alias window.* sudah ada di bawah
// (openRincianBuilder/rbSimpan/dll utk HTML onclick & api/jobs.js
// rbSummaryFromData). Referensi bare callAPI/tr/showToast/parseRincianBiaya
// di-window-kan eksplisit (modul scope terisolasi). State RB_* PRIVAT modul.

// 13. RINCIAN BIAYA BUILDER (Admin) — modal klik-klik untuk isi biaya loker
// ==========================================
// Hasilnya disimpan ke kolom total_biaya (input) + rincian_biaya (textarea
// tersembunyi) dengan format teks WA yang sama persis yang dipahami
// parseRincianBiaya() di 01_public.js untuk popup Detail loker.

export var RB_TARGET = ''; // 'tambah' | 'edit'

// Preset DEFAULT (fallback) — dipakai hanya kalau koleksi DB kosong/gagal
// dimuat. Begitu admin menyimpan/hapus item, koleksi DB jadi sumber utama.
export var RB_PRESETS = {
  include: [
    'TIKET PESAWAT',
    'VISA (SUBSIDI 1JT)',
    'ASURANSI KESEHATAN',
    'TRAINING BAHASA JEPANG 3 BULAN',
    'SURAT-SURAT ADMINISTRASI',
  ],
  exclude: [
    'PASPOR',
    'MCU (MEDICAL CHECK UP)',
    'EKTLN',
    'AKOMODASI SEHARI-HARI',
    'MAKAN SEHARI-HARI',
  ],
  benefit: [
    'PENEMPATAN KAISHA/KLINIK',
    'GAJI POKOK 180.000 YEN UP',
    'BANTUAN GAJI: LEMBUR & KENIKMATAN LAINNYA',
    'SUBSIDI GAJI / KUOTA BIAYA KOKO',
    'KAIGO PASAL 2 JOMPO',
  ],
  persyaratan: [
    'MENGIRIM CV SESUAI FORMAT JOB TERKAIT',
    'MENGIRIM SERTIFIKAT JLPT/JFT & SSW ATAU SENMONKYU (1 FILE PDF)',
    'USIA 18-28 TAHUN',
    'PUNYA PENGALAMAN KERJA DI INDONESIA',
    'MENGIKUTI TRAINING BAHASA JEPANG (BELUM LULUS JFT/JLPT)',
  ],
};

// Koleksi dari DB (rincian_presets): { include: [{id, item}], ... }
export var RB_DB_PRESETS = { include: [], exclude: [], benefit: [], persyaratan: [] };
export var RB_DB_LOADED = false; // true = koleksi DB sudah pernah dimuat & dipakai

// Tahapan & catatan DEFAULT (permanent) — otomatis terisi setiap buka builder
// supaya admin cukup isi harga saja (tidak perlu copas tiap kali). Bisa
// dihapus/ditambah per loker (kasus khusus) lewat tombol + dan ikon X.
export var RB_DEFAULT_TAHAPAN = [
  { nama: 'TTD KONTRAK', nominal: '' },
  { nama: 'COE (CERTIFICATE OF ELIGIBILITY) TERBIT', nominal: '' },
];
export var RB_DEFAULT_CATATAN =
  'APABILA PERUSAHAAN (KAISHA) MEMBATALKAN PROSES KEBERANGKATAN, BIAYA YANG TELAH DIBAYARKAN AKAN DIKEMBALIKAN SESUAI KETENTUAN YANG BERLAKU.';

// Kembalikan daftar tahapan ke default permanent (2 baris, nominal kosong).
export function rbResetTahapan() {
  var list = rbEl('rb-tahapan-list');
  if (list) list.innerHTML = '';
  RB_DEFAULT_TAHAPAN.forEach(function (t) {
    rbAddTahapan(t.nama, t.nominal);
  });
  rbRenderPreview();
}

export function rbEl(id) {
  return document.getElementById(id);
}
export function rbQsa(sel) {
  return Array.prototype.slice.call(document.querySelectorAll(sel));
}

export function rbToggleChip(btn) {
  btn.classList.toggle('rb-on');
  rbRenderPreview();
}

export function rbChipEl(sec, val, dbId) {
  var chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'rb-chip rb-on';
  chip.setAttribute('data-rb-sec', sec);
  chip.onclick = function () {
    rbToggleChip(chip);
  };
  chip.textContent = val;
  // Simpan ke koleksi (★) kalau item belum ada di DB; hapus dari koleksi
  // kalau sudah ada. Klik chip tetap toggle pilihan, klik bintang beda fungsi.
  var star = document.createElement('span');
  star.className = 'rb-star' + (dbId ? ' rb-star-saved' : '');
  star.title = dbId ? 'Hapus dari koleksi favorit' : 'Simpan ke koleksi favorit';
  star.innerHTML = dbId ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
  star.onclick = function (e) {
    e.stopPropagation();
    if (dbId) rbUnsavePreset(sec, dbId, chip, star);
    else rbSavePreset(sec, val, chip, star);
  };
  chip.appendChild(star);
  return chip;
}

export function rbAddChip(sec, inputId) {
  var input = rbEl(inputId);
  if (!input) return;
  var val = (input.value || '').trim().toUpperCase();
  if (!val) return;
  // Item custom dari input belum tentu ada di koleksi DB - render tanpa
  // dbId (bintang ☆) supaya admin bisa menyimpannya sekali klik.
  rbEl('rb-' + sec).appendChild(rbChipEl(sec, val, null));
  input.value = '';
  rbRenderPreview();
}

// ===== Koleksi preset berbasis DB (rincian_presets) =====

export async function rbLoadPresetsFromDb(cb) {
  if (typeof window.callAPI !== 'function') {
    if (cb) cb(false);
    return;
  }
  try {
    const res = await window.callAPI('getRincianPresets', []);
    if (res && res.success && res.presets) {
      ['include', 'exclude', 'benefit', 'persyaratan'].forEach(function (sec) {
        RB_DB_PRESETS[sec] = (res.presets[sec] || []).slice();
      });
      RB_DB_LOADED = true;
      if (cb) cb(true);
    } else if (cb) cb(false);
  } catch (err) {
    if (cb) cb(false);
  }
}

// Tandai chip custom yang ternyata sudah ada di koleksi DB (mis. setelah
// reload koleksi, item yang sama sudah tersimpan) - supaya tidak ada bintang
// ☆ ganda untuk item yang sama.
export function rbSyncChipStars(sec) {
  var box = rbEl('rb-' + sec);
  if (!box) return;
  rbQsa('#rb-' + sec + ' .rb-chip').forEach(function (chip) {
    var val = chip.textContent.replace(/[★☆]$/, '').trim().toUpperCase();
    var found = RB_DB_PRESETS[sec].some(function (p) {
      return String(p.item).trim().toUpperCase() === val;
    });
    var star = chip.querySelector('.rb-star');
    if (!star) return;
    if (found && !chip.getAttribute('data-rb-db-id')) {
      chip.setAttribute(
        'data-rb-db-id',
        String(
          RB_DB_PRESETS[sec].filter(function (p) {
            return String(p.item).trim().toUpperCase() === val;
          })[0].id,
        ),
      );
    }
    if (found) {
      star.classList.add('rb-star-saved');
      star.innerHTML = '<i class="fas fa-star"></i>';
      star.title = window.tr('ui.remove_fav');
    } else {
      star.classList.remove('rb-star-saved');
      star.innerHTML = '<i class="far fa-star"></i>';
      star.title = window.tr('ui.add_fav');
    }
  });
}

export async function rbSavePreset(sec, val, chip, star) {
  if (typeof window.callAPI !== 'function') return;
  try {
    const res = await window.callAPI('saveRincianPreset', [{ kategori: sec, item: val }]);
    if (res && res.success) {
      chip.setAttribute('data-rb-db-id', String(res.id || ''));
      RB_DB_PRESETS[sec].push({ id: res.id, item: val });
      star.classList.add('rb-star-saved');
      star.innerHTML = '<i class="fas fa-star"></i>';
      star.title = window.tr('ui.remove_fav');
      if (typeof window.showToast === 'function')
        window.showToast(window.tr('ui.toast_fav_added'), 'success');
    } else if (typeof window.showToast === 'function') {
      window.showToast((res && res.error) || window.tr('ui.toast_fav_save_failed'), 'error');
    }
  } catch (err) {
    if (typeof window.showToast === 'function')
      window.showToast(window.tr('ui.toast_fav_save_failed'), 'error');
  }
}

export async function rbUnsavePreset(sec, dbId, chip, star) {
  if (typeof window.callAPI !== 'function') return;
  try {
    const res = await window.callAPI('deleteRincianPreset', [{ id: dbId }]);
    if (res && res.success) {
      RB_DB_PRESETS[sec] = RB_DB_PRESETS[sec].filter(function (p) {
        return String(p.id) !== String(dbId);
      });
      chip.removeAttribute('data-rb-db-id');
      star.classList.remove('rb-star-saved');
      star.innerHTML = '<i class="far fa-star"></i>';
      star.title = window.tr('ui.add_fav');
      if (typeof window.showToast === 'function')
        window.showToast(window.tr('ui.toast_fav_removed'), 'success');
    } else if (typeof window.showToast === 'function') {
      window.showToast((res && res.error) || window.tr('ui.toast_fav_remove_failed'), 'error');
    }
  } catch (err) {
    if (typeof window.showToast === 'function')
      window.showToast(window.tr('ui.toast_fav_remove_failed'), 'error');
  }
}

export function rbAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function rbAddTahapan(nama, nominal) {
  var list = rbEl('rb-tahapan-list');
  if (!list) return;
  var row = document.createElement('div');
  row.className = 'rb-tahapan-row flex gap-2 mb-1.5 items-center';
  row.innerHTML =
    '<input type="text" class="rb-tahapan-nama flex-1 p-2 rounded-lg bg-black/60 border border-slate-700 text-white text-xs outline-none focus:border-amber-500 transition" placeholder="' +
    window.tr('ui.stage_name_ph') +
    '" value="' +
    rbAttr(nama) +
    '">' +
    '<input type="text" class="rb-tahapan-nominal w-20 p-2 rounded-lg bg-black/60 border border-slate-700 text-emerald-300 text-xs font-bold outline-none focus:border-amber-500 transition" placeholder="' +
    window.tr('ui.stage_nominal_ph') +
    '" value="' +
    rbAttr(nominal) +
    '">' +
    '<button type="button" onclick="window.rbRemoveTahapan(this)" aria-label="' +
    window.tr('ui.delete_stage') +
    '" class="w-8 h-8 flex items-center justify-center bg-red-900/40 hover:bg-red-600 text-red-300 hover:text-white rounded-lg text-xs font-bold transition flex-shrink-0" title="' +
    window.tr('ui.delete_stage') +
    '"><i class="fas fa-times"></i></button>';
  list.appendChild(row);
  rbRenderPreview();
}

export function rbRemoveTahapan(btn) {
  var row = btn.closest ? btn.closest('.rb-tahapan-row') : btn.parentNode;
  if (row) {
    row.remove();
    rbRenderPreview();
  }
}

export function rbSerialize() {
  var out = [];
  var total = (rbEl('rb-total').value || '').trim();
  if (total) out.push('TOTAL BIAYA: ' + total);
  out.push('');
  var steps = [];
  var filledRows = rbQsa('#rb-tahapan-list .rb-tahapan-row').filter(function (r) {
    return (r.querySelector('.rb-tahapan-nama').value || '').trim();
  });
  filledRows.forEach(function (r, i) {
    var n = (r.querySelector('.rb-tahapan-nama').value || '').trim();
    var nom = (r.querySelector('.rb-tahapan-nominal').value || '').trim();
    steps.push(i + 1 + '. ' + n + (nom ? ' : ' + nom : ''));
  });
  if (steps.length) {
    out.push('TAHAPAN PEMBAYARAN');
    steps.forEach(function (s) {
      out.push(s);
    });
    out.push('');
  }
  ['include', 'exclude', 'benefit', 'persyaratan'].forEach(function (sec) {
    var items = [];
    // textContent chip menyertakan ikon bintang (★/☆) - buang sebelum
    // diserialkan supaya teks rincian tidak tercemar karakter bintang.
    rbQsa('#rb-' + sec + ' .rb-chip.rb-on').forEach(function (c) {
      items.push(c.textContent.replace(/[★☆]/g, '').trim());
    });
    if (items.length) {
      out.push(sec.toUpperCase());
      items.forEach(function (x) {
        out.push('• ' + x);
      });
      out.push('');
    }
  });
  var catatan = (rbEl('rb-catatan').value || '').trim();
  if (catatan) {
    out.push('CATATAN');
    catatan.split('\n').forEach(function (l) {
      out.push(l);
    });
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function rbRenderPreview() {
  var pre = rbEl('rb-preview');
  if (!pre) return;
  var txt = rbSerialize();
  pre.textContent = txt || 'Belum ada rincian.';
}

export function rbSectionItems(sections, type) {
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].type === type) return sections[i].items || [];
  }
  return [];
}

export function rbRenderPresets() {
  ['include', 'exclude', 'benefit', 'persyaratan'].forEach(function (sec) {
    var box = rbEl('rb-' + sec);
    if (!box) return;
    box.innerHTML = '';
    var list = RB_DB_LOADED ? RB_DB_PRESETS[sec] : null;
    var items =
      list && list.length
        ? list.map(function (p) {
            return { item: p.item, id: p.id };
          })
        : (RB_PRESETS[sec] || []).map(function (v) {
            return { item: v, id: null };
          });
    items.forEach(function (it) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'rb-chip';
      chip.setAttribute('data-rb-sec', sec);
      if (it.id) chip.setAttribute('data-rb-db-id', String(it.id));
      chip.onclick = function () {
        rbToggleChip(chip);
      };
      chip.textContent = it.item;
      var star = document.createElement('span');
      star.className = 'rb-star' + (it.id ? ' rb-star-saved' : '');
      star.title = it.id ? 'Hapus dari koleksi favorit' : 'Simpan ke koleksi favorit';
      star.innerHTML = it.id ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
      star.onclick = function (e) {
        e.stopPropagation();
        if (it.id) rbUnsavePreset(sec, it.id, chip, star);
        else rbSavePreset(sec, it.item, chip, star);
      };
      chip.appendChild(star);
      box.appendChild(chip);
    });
  });
}

export function rbSeedFromText(text) {
  var parsed =
    typeof window.parseRincianBiaya === 'function'
      ? window.parseRincianBiaya(text || '')
      : { total: '', sections: [] };
  var p = parsed || { total: '', sections: [] };
  rbEl('rb-total').value = p.total || '';

  var tahapItems = rbSectionItems(p.sections, 'TAHAPAN');
  if (tahapItems.length) {
    tahapItems.forEach(function (it) {
      if (typeof it === 'object' && it) rbAddTahapan(it.nama || '', it.nominal || '');
      else rbAddTahapan(String(it || ''), '');
    });
  } else {
    // Loker baru / rincian kosong: isi otomatis tahapan default permanent
    // (TTD KONTRAK + COE TERBIT) — admin tinggal isi harga. Khusus yang
    // beda, bisa dihapus lewat X atau ditambah lewat tombol +.
    RB_DEFAULT_TAHAPAN.forEach(function (t) {
      rbAddTahapan(t.nama, t.nominal);
    });
  }

  ['include', 'exclude', 'benefit', 'persyaratan'].forEach(function (sec) {
    var items = rbSectionItems(p.sections, sec.toUpperCase());
    var existing = [];
    rbQsa('#rb-' + sec + ' .rb-chip').forEach(function (c) {
      // textContent menyertakan ikon bintang - buang supaya cocok dgn item.
      var v = c.textContent.replace(/[★☆]/g, '').trim().toUpperCase();
      existing.push(v);
      if (
        items.some(function (x) {
          return String(x).trim().toUpperCase() === v;
        })
      )
        c.classList.add('rb-on');
    });
    items.forEach(function (x) {
      var v = String(x).trim();
      if (!v) return;
      if (existing.indexOf(v.toUpperCase()) < 0) {
        // @ts-expect-error JS→TS migration
        rbEl('rb-' + sec).appendChild(rbChipEl(sec, v));
      }
    });
  });

  // INFO = baris bebas yang tidak cocok section mana pun (mis. baris
  // "BAGI MINNA-SAN..."). Jangan dibuang — gabungkan ke CATATAN supaya
  // round-trip seed->save tidak kehilangan konten.
  var catatan = rbSectionItems(p.sections, 'CATATAN').join('\n');
  var infoText = rbSectionItems(p.sections, 'INFO').join('\n');
  if (infoText) catatan = catatan ? catatan + '\n\n' + infoText : infoText;
  // Catatan default permanent: otomatis terisi kalau kosong, tapi bisa
  // diedit kapan saja (kasus khusus tinggal ganti teksnya).
  rbEl('rb-catatan').value = catatan || RB_DEFAULT_CATATAN;
  rbRenderPreview();
}

export function rbSummaryFromData(total, rincian) {
  var parsed =
    typeof window.parseRincianBiaya === 'function'
      ? window.parseRincianBiaya(rincian || '')
      : { total: '', sections: [] };
  var p = parsed || { total: '', sections: [] };
  var t = total || p.total || '';
  var n = function (type) {
    return rbSectionItems(p.sections, type).length;
  };
  var parts = [];
  if (t) parts.push('💵 Total ' + t);
  if (n('TAHAPAN')) parts.push(n('TAHAPAN') + ' tahapan');
  if (n('INCLUDE')) parts.push('Include ' + n('INCLUDE'));
  if (n('EXCLUDE')) parts.push('Exclude ' + n('EXCLUDE'));
  if (n('BENEFIT')) parts.push('Benefit ' + n('BENEFIT'));
  if (n('PERSYARATAN')) parts.push('Syarat ' + n('PERSYARATAN'));
  if (n('CATATAN') || n('INFO')) parts.push('📝 Catatan');
  return parts.length ? '✅ ' + parts.join(' • ') : '';
}

export function openRincianBuilder(target) {
  RB_TARGET = target;
  var prefix = target === 'edit' ? 'ef' : 'input';
  rbEl('rb-total').value = '';
  rbEl('rb-tahapan-list').innerHTML = '';
  rbEl('rb-catatan').value = '';

  var total = rbEl(prefix + '-total-biaya').value || '';
  var rincian = rbEl(prefix + '-rincian-biaya').value || '';
  if (total && !rincian) rincian = 'TOTAL BIAYA: ' + total;

  var opened = false;
  function finalize() {
    if (opened) return; // sudah dirender (dari jalur mana pun) - jangan render ulang
    opened = true;
    rbRenderPresets();
    rbSeedFromText(rincian);
    if (!rbEl('rb-total').value && total) rbEl('rb-total').value = total;
    // Chip custom hasil seed yang ternyata sudah ada di koleksi DB harus
    // tampil ★ (bukan ☆) supaya bintang konsisten dengan koleksi.
    ['include', 'exclude', 'benefit', 'persyaratan'].forEach(function (s) {
      rbSyncChipStars(s);
    });
    rbRenderPreview();
    rbEl('modal-rincian-builder').classList.remove('hidden');
  }

  // Muat koleksi DB dulu (fallback ke preset default kalau gagal/lambat).
  rbLoadPresetsFromDb(finalize);
  setTimeout(finalize, 2500);
}

export function rbSummaryHtml() {
  var t = (rbEl('rb-total').value || '').trim();
  var steps = rbQsa('#rb-tahapan-list .rb-tahapan-row').filter(function (r) {
    return (r.querySelector('.rb-tahapan-nama').value || '').trim();
  }).length;
  var cnt = function (sec) {
    return rbQsa('#rb-' + sec + ' .rb-chip.rb-on').length;
  };
  var parts = [];
  if (t) parts.push('💵 Total ' + t);
  if (steps) parts.push(steps + ' tahapan');
  if (cnt('include')) parts.push('Include ' + cnt('include'));
  if (cnt('exclude')) parts.push('Exclude ' + cnt('exclude'));
  if (cnt('benefit')) parts.push('Benefit ' + cnt('benefit'));
  if (cnt('persyaratan')) parts.push('Syarat ' + cnt('persyaratan'));
  if ((rbEl('rb-catatan').value || '').trim()) parts.push('📝 Catatan');
  return parts.length ? '✅ ' + parts.join(' • ') : 'Klik untuk isi rincian biaya';
}

export function rbSimpan() {
  var prefix = RB_TARGET === 'edit' ? 'ef' : 'input';
  rbEl(prefix + '-total-biaya').value = (rbEl('rb-total').value || '').trim();
  rbEl(prefix + '-rincian-biaya').value = rbSerialize();
  var summary = rbEl('rincian-summary-' + RB_TARGET);
  if (summary) summary.innerHTML = rbSummaryHtml();
  rbEl('modal-rincian-builder').classList.add('hidden');
}

export function rbBatal() {
  var m = rbEl('modal-rincian-builder');
  if (m) m.classList.add('hidden');
}

registerSeamAliases({
  openRincianBuilder,
  rbSimpan,
  rbBatal,
  rbSummaryFromData,
  rbAddChip,
  rbAddTahapan,
  rbRemoveTahapan,
  rbRenderPreview,
});

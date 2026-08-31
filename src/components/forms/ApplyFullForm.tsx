/**
 * ApplyFullForm.tsx - Form Lamaran Kerja 3-step wizard
 * Source: legacy/apply-full.html (1:1 match)
 */
import { useState, useRef, useEffect } from 'preact/hooks';
import { showToast } from '../Toast';
import { authStore } from '../../store/authReactive';
import { apiClient } from '../../lib/apiClient';
import { validate, registerSchema, emailSchema } from '../../lib/schemas';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { validateFile } from '../../lib/uploadGuard';
import { t } from '../../store/i18n';

interface FormData {
  job: string; bidang: string; wa: string; nama: string; email: string;
  gender: string; usia: string; tb: string; bb: string;
}

interface UploadFile {
  file: File | null; preview: string | null; name: string; warn: boolean;
}

const INIT_FORM: FormData = {
  job: '', bidang: '', wa: '', nama: '', email: '',
  gender: '', usia: '', tb: '', bb: ''
};

const JOB_PARAMS: Record<string, { bidang: string; required: string[] }> = {
  TG658ASJ: { bidang: 'Tukang Gypsum', required: ['cv', 'jft', 'ssw'] },
  TK658ASJ: { bidang: 'Tukang Kayu', required: ['cv', 'jft', 'ssw'] },
  default: { bidang: '', required: [] }
};

export default function ApplyFullForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INIT_FORM);
  const [uploads, setUploads] = useState<Record<string, UploadFile>>({});
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waMsg, setWaMsg] = useState('');
  const [waWarn, setWaWarn] = useState('');
  const [extraDocs, setExtraDocs] = useState<string[]>([]);

  // Read job code from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobCode = params.get('job') || '';
    const bidang = params.get('bidang') || '';
    if (jobCode) {
      setForm(prev => ({ ...prev, job: jobCode, bidang }));
      const config = JOB_PARAMS[jobCode] || JOB_PARAMS.default;
      if (config.bidang && !bidang) {
        setForm(prev => ({ ...prev, bidang: config.bidang }));
      }
      // Show required upload cards
      config.required.forEach(doc => {
        setUploads(prev => ({
          ...prev,
          [doc]: prev[doc] || { file: null, preview: null, name: t('apply.file_none'), warn: false }
        }));
      });
    }
  }, []);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const formatWA = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62') && !clean.startsWith('81')) clean = '62' + clean;
    return clean;
  };

  const cekRiwayat = async () => {
    const wa = formatWA(form.wa);
    if (wa.length < 10) return;
    setWaLoading(true);
    setWaMsg('');
    setWaWarn('');
    try {
      const res = await fetch('/.netlify/functions/bridge-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cekDataPelamar', payload: [{ wa }] }) });
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          setForm(prev => ({ ...prev, nama: data.nama || prev.nama, email: data.email || prev.email }));
          setWaMsg(t('apply.wa_found'));
          // Show dynamic docs based on requirements
          if (data.requiredDocs) {
            data.requiredDocs.forEach((doc: string) => {
              setUploads(prev => ({
                ...prev,
                [doc]: prev[doc] || { file: null, preview: null, name: t('apply.file_none'), warn: false }
              }));
            });
          }
        } else {
          setWaWarn(t('apply.wa_not_found'));
        }
      }
    } catch {
      setWaWarn(t('apply.wa_error'));
    } finally {
      setWaLoading(false);
    }
  };

  const handleUpload = (docType: string, file: File | null) => {
    if (!file) return;
    // Validate file (format + size) — ported from legacy upload-guard
    const acceptMap: Record<string, string> = {
      photo: '.jpg,.jpeg,.png',
      cv: '.pdf,.xls,.xlsx,.doc,.docx',
      jft: '.pdf',
      ssw: '.pdf',
    };
    const v = validateFile(file, { accept: acceptMap[docType] || '', maxMb: 2 });
    if (!v.valid) { showToast(v.error!, 'error'); return; }
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : null;
    setUploads(prev => ({
      ...prev,
      [docType]: {
        file,
        preview,
        name: file.name + " (" + (file.size / 1024 / 1024).toFixed(2) + " MB)",
        warn: false
      }
    }));
  };

  const changeStep = (delta: number) => {
    const next = step + delta;
    if (next < 1 || next > 3) return;
    setStep(next);
  };

  const submitApply = async () => {
    if (!agree) { showToast(t('apply.error_agree'), 'error'); return; }
    var vr = validate(registerSchema, { nama: form.nama, wa: form.wa }); if (!vr.success) { showToast(vr.errors[0], 'error'); return; }
    if (form.email) { var ve = validate(emailSchema, form.email); if (!ve.success) { showToast(ve.errors[0], 'error'); return; } }
    setLoading(true);
    try {
      // 1) Upload all files to Cloudinary first (pipeline: validate -> Cloudinary -> send URL)
      const fileUrls: Record<string, string> = {};
      for (const [key, u] of Object.entries(uploads)) {
        if (u.file) {
          showToast('Mengunggah ' + key.toUpperCase() + '...', 'info');
          fileUrls[key] = await uploadToCloudinary(u.file);
        }
      }
      // 2) Send URLs to backend
      const token = authStore.get().token;
      const payload = { ...form, fileUrls };
      const res = await fetch('/.netlify/functions/bridge-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'submitFormPelamar', payload: [payload] }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        showToast(t('apply.error_submit'), 'error');
      }
    } catch (e) {
      showToast(t('apply.error_submit') + ' ' + (e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const progressPct = step === 1 ? '0%' : step === 2 ? '50%' : '100%';

  return (
    <div class="min-h-screen bg-[#020617] text-white pb-16 pt-[42px]">
      {/* Hero */}
      <div class="relative h-[260px] overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover brightness-[.35]"
          src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80" alt="" />
        <div class="absolute inset-0 bg-gradient-to-b from-black/25 to-[#020617]"></div>
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-5 z-10">
          <img class="w-[100px] h-[100px] rounded-full mx-auto shadow-[0_15px_35px_rgba(0,0,0,.5)] object-cover relative z-[15]"
            src="https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_apply.png" alt="Logo ASJ" />
          <div class="mt-[15px] tracking-[7px] text-[11px] font-bold text-[#ff6db2]">日本への挑戦</div>
          <div class="text-[28px] font-black mt-[5px]">PT AMANAH SAKURA JAPAN</div>
        </div>
      </div>

      {/* Container */}
      <main class="max-w-[480px] mx-auto px-[15px] mt-[-40px] relative z-20">
        <div class="bg-slate-900/88 backdrop-blur-xl border border-white/[.08] rounded-[28px] p-[25px] shadow-[0_25px_60px_rgba(0,0,0,.45)]">

          {/* Stepper */}
          <div class="flex justify-between items-center mb-[30px] relative">
            <div class="absolute top-[18px] left-[15%] right-[15%] h-[3px] bg-slate-700 z-1"></div>
            <div class="absolute top-[18px] left-[15%] h-[3px] bg-pink-500 z-2 transition-all duration-400" style={{ width: progressPct }}></div>
            {[t('apply.step_data'), t('apply.step_docs'), t('apply.step_kirim')].map((label, i) => (
              <div key={i} class={`relative z-[3] flex flex-col items-center gap-2 w-1/3 ${i + 1 === step ? 'active' : i + 1 < step ? 'completed' : ''}`}>
                <div class={`w-[38px] h-[38px] rounded-full flex items-center justify-center font-extrabold transition-all
                  ${i + 1 === step ? 'bg-pink-500 border-2 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,.4)]'
                    : i + 1 < step ? 'bg-pink-700 border-2 border-pink-700 text-white'
                    : 'bg-slate-800 border-2 border-slate-700 text-slate-400'}`}>
                  <i class={`fa-solid ${i === 0 ? 'fa-user' : i === 1 ? 'fa-file-arrow-up' : 'fa-check-double'}`}></i>
                </div>
                <div class={`text-[11px] font-bold ${i + 1 === step ? 'text-pink-500' : i + 1 < step ? 'text-slate-300' : 'text-slate-500'}`}>{label}</div>
              </div>
            ))}
          </div>

          {/* STEP 1: DATA DIRI */}
          <div class={`${step === 1 ? 'block' : 'hidden'} animate-[fadeIn_0.4s_ease-in-out]`}>
            <InputField icon="fa-briefcase" label={t("apply.job_label")} value={form.job} readonly />
            <InputField icon="fa-layer-group" label={t("apply.bidang_label")} value={form.bidang} readonly />

            {/* WA with radar */}
            <div class="mb-5">
              <label class="block text-[13px] font-bold mb-2 text-slate-300">Nomor WhatsApp</label>
              <div class="relative">
                <i class="fa-brands fa-whatsapp absolute left-[18px] top-1/2 -translate-y-1/2 text-pink-500 text-lg"></i>
                <input type="tel" value={form.wa}
                  onInput={(e) => updateForm('wa', (e.target as HTMLInputElement).value)}
                  onBlur={cekRiwayat}
                  placeholder={t("apply.wa_ph")}
                  class="w-full h-[55px] px-[18px] pl-[54px] bg-slate-900 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-pink-500 focus:shadow-[0_0_0_4px_rgba(236,72,153,.15)] transition-all placeholder:text-slate-500" />
                {waLoading && <span class="absolute right-4 top-1/2 -translate-y-1/2"><i class="fas fa-spinner fa-spin text-emerald-500 text-lg"></i></span>}
              </div>
              {waMsg && <div class="text-xs text-emerald-400 font-bold mt-3 bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-500/30"><i class="fas fa-check-circle mr-1"></i>{waMsg}</div>}
              {waWarn && <div class="text-xs text-amber-300 font-bold mt-3 bg-amber-900/40 p-2.5 rounded-lg border border-amber-500/40">{waWarn}</div>}
            </div>

            <InputField icon="fa-user" label={t("apply.nama_label")} value={form.nama} placeholder={t("apply.nama_ph")}
              onInput={(v) => updateForm('nama', v.toUpperCase())} tip={t("apply.nama_tip")} />
            <InputField icon="fa-envelope" label={t("apply.email_label")} value={form.email} type="email" placeholder={t("apply.email_ph")}
              onInput={(v) => updateForm('email', v)} />

            <div class="grid grid-cols-2 gap-4">
              <SelectField icon="fa-venus-mars" label={t("apply.gender_label")} value={form.gender}
                options={[{ v: '', l: 'Pilih' }, { v: 'LAKI-LAKI', l: 'LAKI-LAKI' }, { v: 'PEREMPUAN', l: 'PEREMPUAN' }]}
                onChange={(v) => updateForm('gender', v)} />
              <InputField icon="fa-cake-candles" label={t("apply.usia_label")} value={form.usia} type="number" placeholder={t("apply.usia_ph")}
                onInput={(v) => updateForm('usia', v)} />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <InputField icon="fa-ruler-vertical" label={t("apply.tb_label")} value={form.tb} type="number" placeholder="cm"
                onInput={(v) => updateForm('tb', v)} />
              <InputField icon="fa-weight-scale" label={t("apply.bb_label")} value={form.bb} type="number" placeholder="kg"
                onInput={(v) => updateForm('bb', v)} />
            </div>
          </div>

          {/* STEP 2: DOKUMEN */}
          <div class={`${step === 2 ? 'block' : 'hidden'} animate-[fadeIn_0.4s_ease-in-out]`}>
            <UploadCard type="photo" label={t("apply.photo_label")} sub={t("apply.photo_sub")} icon="fa-image"
              bgClass="bg-gradient-to-br from-pink-500 to-pink-700" btnClass="bg-pink-500"
              accept=".jpg,.jpeg,.png" onChange={(f) => handleUpload('photo', f)} state={uploads.photo} />
            {(uploads.cv || form.job) && (
              <UploadCard type="cv" label={t("apply.cv_label")} sub={t("apply.cv_sub")} icon="fa-file-excel"
                bgClass="bg-gradient-to-br from-amber-500 to-amber-700" btnClass="bg-amber-600"
                accept=".pdf,.xls,.xlsx,.doc,.docx" onChange={(f) => handleUpload('cv', f)} state={uploads.cv} />
            )}
            {(uploads.jft || form.job) && (
              <UploadCard type="jft" label={t("apply.jft_label")} sub={t("apply.jft_sub")} icon="fa-file-pdf"
                bgClass="bg-gradient-to-br from-sky-500 to-blue-600" btnClass="bg-sky-600"
                accept=".pdf" onChange={(f) => handleUpload('jft', f)} state={uploads.jft} />
            )}
            {(uploads.ssw || form.job) && (
              <UploadCard type="ssw" label={t("apply.ssw_label")} sub={t("apply.ssw_sub")} icon="fa-file-pdf"
                bgClass="bg-gradient-to-br from-emerald-500 to-emerald-700" btnClass="bg-emerald-600"
                accept=".pdf" onChange={(f) => handleUpload('ssw', f)} state={uploads.ssw} />
            )}
          </div>

          {/* STEP 3: KONFIRMASI */}
          <div class={`${step === 3 ? 'block' : 'hidden'} animate-[fadeIn_0.4s_ease-in-out]`}>
            <div class="bg-slate-900 border border-slate-700 rounded-[20px] p-5 flex gap-4 items-start mb-5">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree((e.target as HTMLInputElement).checked)}
                class="mt-1 w-[22px] h-[22px] accent-pink-500" />
              <p class="text-[13px] leading-6 text-slate-300">
                {t('apply.agree_text')}
              </p>
            </div>
            <div class="grid grid-cols-3 gap-3">
              {[
                { icon: 'fa-bolt', label: t('apply.fast') },
                { icon: 'fa-shield-halved', label: t('apply.safe') },
                { icon: 'fa-torii-gate', label: t('apply.asj') }
              ].map((c, i) => (
                <div key={i} class="bg-slate-900 border border-slate-700 rounded-2xl p-[15px_10px] text-center">
                  <i class={`fa-solid ${c.icon} text-[20px] text-pink-500 mb-2 block`}></i>
                  <div class="text-[10px] text-slate-300 font-bold">{c.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Sticky Nav */}
      <div class="fixed bottom-0 left-0 w-full bg-[rgba(2,6,23,.95)] backdrop-blur-xl border-t border-slate-800 p-[15px_20px] z-50 flex justify-between gap-4">
        {step > 1 && (
          <button onClick={() => changeStep(-1)} class="flex-1 h-[55px] rounded-2xl text-[15px] font-extrabold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border-none cursor-pointer">
            <i class="fa-solid fa-chevron-left"></i> Kembali
          </button>
        )}
        {step < 3 && (
          <button onClick={() => changeStep(1)} class="flex-1 h-[55px] rounded-2xl text-[15px] font-extrabold bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-[0_10px_25px_rgba(236,72,153,.25)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 border-none cursor-pointer">
            Lanjut <i class="fa-solid fa-chevron-right"></i>
          </button>
        )}
        {step === 3 && (
          <button onClick={submitApply} class="flex-1 h-[55px] rounded-2xl text-[15px] font-extrabold bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-[0_10px_25px_rgba(236,72,153,.25)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="fa-solid fa-paper-plane"></i> KIRIM LAMARAN
          </button>
        )}
      </div>

      {/* Loading Modal */}
      {loading && (
        <div class="fixed inset-0 flex items-center justify-center bg-[rgba(2,6,23,.92)] backdrop-blur-sm z-[9999]">
          <div class="text-center">
            <div class="w-[70px] h-[70px] rounded-full border-4 border-slate-700 border-t-pink-500 mx-auto animate-spin"></div>
            <h2 class="mt-5 text-white text-xl font-extrabold">{t('apply.loading')}</h2>
            <p class="mt-2 text-xs text-slate-400">{t('apply.loading_hint')}</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {success && (
        <div class="fixed inset-0 flex items-center justify-center bg-[rgba(2,6,23,.92)] backdrop-blur-sm z-[9999]">
          <div class="w-[90%] max-w-[340px] bg-slate-900 border border-emerald-500 rounded-[24px] p-[30px] text-center">
            <div class="text-[60px] mb-2">✅</div>
            <h2 class="mt-4 text-2xl font-black">{t('apply.success_title')}</h2>
            <p class="mt-2.5 text-sm text-slate-400 leading-[22px]">{t('apply.success_desc')}</p>
            <button onClick={() => window.location.href = '/'} class="mt-5 w-full h-[50px] rounded-[14px] bg-emerald-500 font-extrabold text-white border-none cursor-pointer">{t('apply.btn_portal')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Sub-components */
function InputField({ icon, label, value, readonly, type = 'text', placeholder, onInput, tip }: {
  icon: string; label: string; value: string; readonly?: boolean; type?: string;
  placeholder?: string; onInput?: (v: string) => void; tip?: string;
}) {
  return (
    <div class="mb-5">
      <label class="block text-[13px] font-bold mb-2 text-slate-300">{label}</label>
      <div class="relative">
        <i class={`fa-solid ${icon} absolute left-[18px] top-1/2 -translate-y-1/2 text-pink-500 text-lg`}></i>
        <input type={type} value={value} readonly={readonly} placeholder={placeholder}
          onInput={onInput ? (e) => onInput((e.target as HTMLInputElement).value) : undefined}
          class="w-full h-[55px] px-[18px] pl-[54px] bg-slate-900 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-pink-500 focus:shadow-[0_0_0_4px_rgba(236,72,153,.15)] transition-all placeholder:text-slate-500" />
      </div>
      {tip && <div class="mt-1.5 text-[11px] text-slate-500">{tip}</div>}
    </div>
  );
}

function SelectField({ icon, label, value, options, onChange }: {
  icon: string; label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div class="mb-5">
      <label class="block text-[13px] font-bold mb-2 text-slate-300">{label}</label>
      <div class="relative">
        <i class={`fa-solid ${icon} absolute left-[18px] top-1/2 -translate-y-1/2 text-pink-500 text-lg`}></i>
        <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
          class="w-full h-[55px] px-[18px] pl-[54px] bg-slate-900 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-pink-500 transition-all appearance-none cursor-pointer">
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
    </div>
  );
}

function UploadCard({ type, label, sub, icon, bgClass, btnClass, accept, onChange, state }: {
  type: string; label: string; sub: string; icon: string; bgClass: string; btnClass: string;
  accept: string; onChange: (f: File | null) => void; state?: UploadFile;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div class="bg-slate-900 border border-slate-700 rounded-[20px] p-5 mb-[18px]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3.5">
          <div class={`w-[52px] h-[52px] rounded-2xl ${bgClass} flex items-center justify-center text-xl text-white`}>
            <i class={`fa-solid ${icon}`}></i>
          </div>
          <div>
            <div class="text-base font-extrabold">{label}</div>
            <div class="mt-1 text-[11px] text-slate-400">{sub}</div>
          </div>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}
          class={`px-[18px] py-2.5 ${btnClass} text-white text-xs font-extrabold rounded-xl cursor-pointer hover:brightness-110 transition-all border-none`}>{t('apply.btn_pilih')}</button>
      </div>
      <input ref={inputRef} type="file" accept={accept} class="hidden"
        onChange={(e) => onChange((e.target as HTMLInputElement).files?.[0] || null)} />
      {state?.preview && <img src={state.preview} class="w-full h-[160px] object-contain bg-[#020617] rounded-xl mt-[15px] border border-slate-700" alt="" />}
      <div class="mt-[15px] p-3 bg-[#020617] rounded-xl text-xs text-slate-400 break-all">{state?.name || t('apply.file_none')}</div>
      {state?.warn && <div class="text-rose-500 text-[11px] mt-2 font-bold"><i class="fa-solid fa-circle-exclamation mr-1"></i>Gagal! Ukuran file melebihi 2 MB.</div>}
    </div>
  );
}
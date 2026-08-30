/**
 * LoginModal.tsx — Auth forms (login/register/admin)
 *
 * - Kandidat login/register: Supabase auth via userStore
 * - Admin 2-step login: Netlify functions (master pin + personal pin)
 */
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { authStore, loginAsAdmin } from '../store/authReactive';
import { loginKandidatSupabase, registerKandidatSupabase } from '../store/userStore';
import { showToast } from './Toast';
import { validate, registerSchema, kandidatLoginSchema, adminMasterPinSchema, adminPersonalPinSchema } from '../lib/schemas';
import { t } from '../store/i18n';

type ModalMode = "closed" | "login" | "daftar";
type AdminStep = 0 | 1 | 2;

interface Props {
  mode: ModalMode;
  onClose: () => void;
  onSwitchMode: (m: ModalMode) => void;
}

export default function LoginModal({ mode, onClose, onSwitchMode }: Props) {
  const $user = useStore(authStore);
  const [adminStep, setAdminStep] = useState<AdminStep>(0);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [loading, setLoading] = useState(false);
  const [regNama, setRegNama] = useState("");
  const [regWa, setRegWa] = useState("");
  const [logWa, setLogWa] = useState("");
  const [logPass, setLogPass] = useState("");
  const [masterPin, setMasterPin] = useState("");
  const [personalPin, setPersonalPin] = useState("");

  // Listen for admin login trigger from App.tsx
  useEffect(() => {
    const h = () => { setAdminStep(1); setSelectedAdmin(""); setMasterPin(""); setPersonalPin(""); };
    window.addEventListener("asj-admin-login", h);
    const k = () => { setAdminStep(0); };
    window.addEventListener("asj-kandidat-login", k);
    return () => { window.removeEventListener("asj-admin-login", h); window.removeEventListener("asj-kandidat-login", k); };
    // cleanup handled below
  }, []);

  if ($user.isLoggedIn) { onClose(); return null; }
  if (mode === "closed") return null;

  // ─── Admin API ───
  const API = "/.netlify/functions";
  async function api(action: string, args: unknown[] = []) {
    const r = await fetch(API + "/bridge-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, args }),
    });
    if (!r.ok) throw new Error("API " + r.status);
    return r.json();
  }

  // ─── Register ───
  async function handleReg() {
    const vr = validate(registerSchema, { nama: regNama, wa: regWa });
    if (!vr.success) { showToast(vr.errors[0], "error"); return; }
    setLoading(true);
    try {
      const password = regWa.slice(-4);
      const ok = await registerKandidatSupabase(regNama, regWa, password);
      if (ok) onSwitchMode("login");
    } catch (e: unknown) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }

  // ─── Login ───
  async function handleLogin() {
    const vl = validate(kandidatLoginSchema, { wa: logWa, password: logPass });
    if (!vl.success) { showToast(vl.errors[0], "error"); return; }
    setLoading(true);
    try {
      const ok = await loginKandidatSupabase(logWa, logPass);
      if (ok) { onClose(); window.location.reload(); }
    } catch (e: unknown) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }

  // ─── Admin Master PIN ───
  async function handleMaster() {
    const vm = validate(adminMasterPinSchema, { pin: masterPin });
    if (!vm.success) { showToast(vm.errors[0], "error"); return; }
    setLoading(true);
    try {
      const tk = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const r = await api("checkAdminMaster", [masterPin, tk]);
      if (r.success) setAdminStep(2);
      else showToast(r.error || t('login.pin_salah'), "error");
    } catch (e: unknown) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }

  function selectAdmin(n: string) { setSelectedAdmin(n); }

  // ─── Admin Personal PIN ───
  async function handlePersonal() {
    const vp = validate(adminPersonalPinSchema, { name: selectedAdmin, pin: personalPin });
    if (!vp.success) { showToast(vp.errors[0], "error"); return; }
    setLoading(true);
    try {
      const tk = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const r = await api("checkAdminPersonal", [selectedAdmin, personalPin, tk]);
      if (r.success) {
        loginAsAdmin(selectedAdmin, r.sessionToken || tk, r.refreshToken || "");
        showToast(t('login.selamat_datang') + selectedAdmin + "!", "success");
        onClose();
        window.location.reload();
      } else {
        showToast(r.error || t('login.pin_salah'), "error");
      }
    } catch (e: unknown) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }

  // ─── Render ───
  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-700 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} class="absolute top-5 right-6 text-slate-400 hover:text-white z-[100]">
          <i class="fas fa-times text-2xl"></i>
        </button>

        {/* ── Register ── */}
        {mode === "daftar" && (
          <div>
            <h3 class="text-xl font-bold text-emerald-400 mb-6 border-b border-emerald-900/50 pb-4 text-center">
              <i class="fas fa-user-plus mr-2"></i> Daftar
            </h3>
            <input type="text" value={regNama} onInput={(e) => setRegNama((e.target as HTMLInputElement).value)}
              placeholder={t("login.nama_ph")}
              class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-4 outline-none focus:border-emerald-500" />
            <input type="tel" value={regWa} onInput={(e) => setRegWa((e.target as HTMLInputElement).value)}
              placeholder={t("login.wa_ph")}
              class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-4 outline-none focus:border-emerald-500" />
            <div class="px-4 py-3 rounded-2xl bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-6 text-center">
              Password = 4 digit terakhir WA
            </div>
            <button onClick={handleReg} disabled={loading}
              class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold shadow-lg disabled:opacity-50">
              {loading ? t("login.btn_daftar_loading") : t("login.btn_daftar")}
            </button>
            <p class="text-sm text-center mt-5 text-slate-400">
              Sudah punya akun?{" "}
              <button onClick={() => onSwitchMode("login")} class="text-emerald-400 underline font-bold">Login</button>
            </p>
          </div>
        )}

        {/* ── Kandidat Login ── */}
        {mode === "login" && adminStep !== 1 && adminStep !== 2 && (
          <div>
            <h3 class="text-xl font-bold text-sky-400 mb-6 border-b border-sky-900/50 pb-4 text-center">
              <i class="fas fa-sign-in-alt mr-2"></i> Login Pelamar
            </h3>
            <label class="block text-sm font-bold text-slate-400 mb-1.5">{t('login.wa_label')}</label>
            <input type="tel" value={logWa} onInput={(e) => setLogWa((e.target as HTMLInputElement).value)}
              placeholder={t("login.wa_ph")}
              class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-4 outline-none focus:border-sky-500" />
            <label class="block text-sm font-bold text-slate-400 mb-1.5">{t('login.pass_label')}</label>
            <input type="password" value={logPass} onInput={(e) => setLogPass((e.target as HTMLInputElement).value)}
              placeholder={t("login.pass_ph")}
              class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-6 outline-none focus:border-sky-500" />
            <button onClick={handleLogin} disabled={loading}
              class="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-full font-bold shadow-lg disabled:opacity-50">
              {loading ? t("login.btn_masuk_loading") : t("login.btn_masuk")}
            </button>
            <p class="text-sm text-center mt-5 text-slate-400">
              Belum punya akun?{" "}
              <button onClick={() => onSwitchMode("daftar")} class="text-sky-400 underline font-bold">Daftar</button>
            </p>
          </div>
        )}

        {/* ── Admin Step 1: Master PIN + Account Select ── */}
        {mode === "login" && adminStep === 1 && (
          <div>
            <h3 class="text-xl font-bold text-red-400 mb-6 border-b border-red-900/50 pb-4 text-center">
              <i class="fas fa-shield-alt mr-2"></i> Otorisasi Sistem
            </h3>
            <label class="block text-sm font-bold text-slate-400 mb-1.5">Pilih Akun Admin</label>
            <select value={selectedAdmin} onChange={(e) => selectAdmin((e.target as HTMLSelectElement).value)}
              class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-4 outline-none focus:border-red-500">
              <option value="">Pilih Akun Admin...</option>
              <option value="SACHOU">SACHOU (Boss)</option>
              <option value="AYOK">AYOK</option>
              <option value="KHOLIS">KHOLIS</option>
              <option value="KHOCI">KHOCI</option>
            </select>
            <label class="block text-sm font-bold text-slate-400 mb-1.5">Masukkan PIN</label>
            <input type="password" value={masterPin} onInput={(e) => setMasterPin((e.target as HTMLInputElement).value)}
              placeholder="PIN Master"
              class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-6 outline-none focus:border-red-500"
              onKeyPress={(e: KeyboardEvent) => { if (e.key === "Enter") handleMaster(); }} />
            <button onClick={handleMaster} disabled={loading || !selectedAdmin}
              class="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-lg disabled:opacity-50">
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
            <p class="text-sm text-center mt-5 text-slate-400">
              <button onClick={() => { onSwitchMode("login"); setAdminStep(1); setMasterPin(""); }} class="text-sky-400 underline font-bold">
                Login Pelamar
              </button>
            </p>
          </div>
        )}

        {/* ── Admin Step 2: Personal PIN ── */}
        {mode === "login" && adminStep === 2 && (
          <div>
            <h3 class="text-xl font-bold text-red-400 mb-6 border-b border-red-900/50 pb-4 text-center">
              <i class="fas fa-key mr-2"></i> PIN Pribadi
            </h3>
            <div class="text-center mb-4">
              <span class="px-4 py-2 bg-red-900/40 border border-red-500/50 rounded-full text-red-300 font-bold text-sm">{selectedAdmin}</span>
            </div>
            <label class="block text-sm font-bold text-slate-400 mb-1.5">PIN Pribadi</label>
            <input type="password" value={personalPin} onInput={(e) => setPersonalPin((e.target as HTMLInputElement).value)}
              placeholder="Masukkan PIN Pribadi"
              class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-6 outline-none focus:border-red-500"
              onKeyPress={(e: KeyboardEvent) => { if (e.key === "Enter") handlePersonal(); }} />
            <button onClick={handlePersonal} disabled={loading}
              class="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-lg disabled:opacity-50">
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
            <p class="text-sm text-center mt-5 text-slate-400">
              <button onClick={() => { setAdminStep(1); setPersonalPin(""); }} class="text-amber-400 underline font-bold">
                Kembali
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

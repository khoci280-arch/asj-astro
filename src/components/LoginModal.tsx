import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { authStore, loginAsAdmin, loginAsKandidat } from '../store/authReactive';
import { showToast } from './Toast';
import { validate, registerSchema, kandidatLoginSchema, adminMasterPinSchema, adminPersonalPinSchema } from '../lib/schemas';

type ModalMode = "closed" | "login" | "daftar";
type AdminStep = 1 | 2 | 3;

interface Props {
  mode: ModalMode;
  onClose: () => void;
  onSwitchMode: (m: ModalMode) => void;
}

export default function LoginModal({ mode, onClose, onSwitchMode }: Props) {
  const $user = useStore(authStore);
  if ($user.isLoggedIn) { onClose(); return null; }
  const [adminStep, setAdminStep] = useState<AdminStep>(1);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [loading, setLoading] = useState(false);
  const [regNama, setRegNama] = useState("");
  const [regWa, setRegWa] = useState("");
  const [logWa, setLogWa] = useState("");
  const [logPass, setLogPass] = useState("");
  const [masterPin, setMasterPin] = useState("");
  const [personalPin, setPersonalPin] = useState("");
  if (mode === "closed") return null;
  const API = "/.netlify/functions";
  async function api(action: string, args: any[] = []) {
    const r = await fetch(API + "/bridge-links", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({action, args}) });
    if (!r.ok) throw new Error("API " + r.status);
    return r.json();
  }
  async function handleReg() {
    var vr = validate(registerSchema, { nama: regNama, wa: regWa }); if (!vr.success) { showToast(vr.errors[0], "error"); return; }
    setLoading(true);
    try { const r = await api("daftarKandidat", [regNama, regWa]); if (r.success) { showToast("Berhasil!", "success"); onSwitchMode("login"); } else showToast(r.error || "Gagal", "error"); }
    catch (e: any) { showToast(e.message, "error"); } finally { setLoading(false); }
  }
  async function handleLogin() {
    var vl = validate(kandidatLoginSchema, { wa: logWa, password: logPass }); if (!vl.success) { showToast(vl.errors[0], "error"); return; }
    setLoading(true);
    try { const r = await api("loginKandidat", [logWa, logPass]);
      if (r.success && r.nama) { loginAsKandidat(r.nama, r.wa, r.sessionToken||"", r.refreshToken||""); showToast("Selamat datang, "+r.nama+"!", "success"); onClose(); window.location.reload(); }
      else showToast(r.error || "Gagal", "error");
    } catch (e: any) { showToast(e.message, "error"); } finally { setLoading(false); }
  }
  async function handleMaster() {
    var vm = validate(adminMasterPinSchema, { pin: masterPin }); if (!vm.success) { showToast(vm.errors[0], "error"); return; }
    setLoading(true);
    try { const t = Date.now().toString(36)+Math.random().toString(36).substr(2); const r = await api("checkAdminMaster", [masterPin, t]); if (r.success) setAdminStep(2); else showToast(r.error || "PIN salah", "error"); }
    catch (e: any) { showToast(e.message, "error"); } finally { setLoading(false); }
  }
  function selectAdmin(n: string) { setSelectedAdmin(n); setAdminStep(3); }
  async function handlePersonal() {
    var vp = validate(adminPersonalPinSchema, { name: selectedAdmin, pin: personalPin }); if (!vp.success) { showToast(vp.errors[0], "error"); return; }
    setLoading(true);
    try { const t = Date.now().toString(36)+Math.random().toString(36).substr(2); const r = await api("checkAdminPersonal", [selectedAdmin, personalPin, t]);
      if (r.success) { loginAsAdmin(selectedAdmin, r.sessionToken||t, r.refreshToken||""); showToast("Selamat datang, "+selectedAdmin+"!", "success"); onClose(); window.location.reload(); }
      else showToast(r.error || "PIN salah", "error");
    } catch (e: any) { showToast(e.message, "error"); } finally { setLoading(false); }
  }
  if (mode === "login" || mode === "daftar") {
    return (<div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"><div class="bg-slate-900 border border-slate-700 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative"><button onClick={onClose} class="absolute top-5 right-6 text-slate-400 hover:text-white z-[100]"><i class="fas fa-times text-2xl"></i></button>{mode==="daftar"&&<div><h3 class="text-xl font-bold text-emerald-400 mb-6 border-b border-emerald-900/50 pb-4 text-center"><i class="fas fa-user-plus mr-2"></i> Daftar</h3><input type="text" value={regNama} onInput={e=>setRegNama((e.target as HTMLInputElement).value)} placeholder="Nama Lengkap" class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-4 outline-none focus:border-emerald-500" /><input type="tel" value={regWa} onInput={e=>setRegWa((e.target as HTMLInputElement).value)} placeholder="No WA" class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-4 outline-none focus:border-emerald-500" /><div class="px-4 py-3 rounded-2xl bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-6 text-center">Password = 4 digit terakhir WA</div><button onClick={handleReg} disabled={loading} class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold shadow-lg disabled:opacity-50">{loading?"Mendaftar...":"Daftar Akun"}</button><p class="text-sm text-center mt-5 text-slate-400">Sudah punya akun? <button onClick={()=>onSwitchMode("login")} class="text-emerald-400 underline font-bold">Login</button></p></div>}{mode==="login"&&<div><h3 class="text-xl font-bold text-sky-400 mb-6 border-b border-sky-900/50 pb-4 text-center"><i class="fas fa-sign-in-alt mr-2"></i> Login Pelamar</h3><label class="block text-sm font-bold text-slate-400 mb-1.5">No WhatsApp</label><input type="tel" value={logWa} onInput={e=>setLogWa((e.target as HTMLInputElement).value)} placeholder="No WA" class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-4 outline-none focus:border-sky-500" /><label class="block text-sm font-bold text-slate-400 mb-1.5">Password</label><input type="password" value={logPass} onInput={e=>setLogPass((e.target as HTMLInputElement).value)} placeholder="Password" class="w-full p-3.5 rounded-2xl bg-black/60 border border-slate-600 text-sm text-white mb-6 outline-none focus:border-sky-500" /><button onClick={handleLogin} disabled={loading} class="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-full font-bold shadow-lg disabled:opacity-50">{loading?"Masuk...":"Masuk Dashboard"}</button><p class="text-sm text-center mt-5 text-slate-400">Belum punya akun? <button onClick={()=>onSwitchMode("daftar")} class="text-sky-400 underline font-bold">Daftar</button></p></div>}</div></div>); }
  return null;
}

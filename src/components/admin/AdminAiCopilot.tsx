/**
 * AdminAiCopilot.tsx - Unified AI HR Copilot (Qween Jeklin)
 * Migrated from legacy/js/ai_copilot/ (admin + interview + parse + results)
 */
import { useState, useRef, useEffect } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { authStore } from "../../store/authReactive";
import { showToast } from "../Toast";
import { t } from "../../store/i18n";
import Icon from '../ui/Icon';
import { getEndpoint } from '../../lib/apiEndpoint';

const JEKLIN_IMG = "https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png";

interface ChatMsg { role: "assistant" | "user"; text: string; time: string; }
interface Props { candidateId?: string; candidateName?: string; candidateWa?: string; onClose: () => void; }

export default function AdminAiCopilot({ candidateId, candidateWa, onClose }: Props) {
  const user = useStore(authStore);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mode, setMode] = useState<"chat" | "parse" | "results">("chat");
  const [parseFile, setParseFile] = useState<File | null>(null);
  const [parseStatus, setParseStatus] = useState("");
  const [parseWa, setParseWa] = useState(candidateWa || "");
  const [parseBidang, setParseBidang] = useState("");
  const [lastHasil, setLastHasil] = useState<Record<string,unknown> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    setMessages([{ role: "assistant", text: t("ai.welcome_admin"), time: now() }]);
    setSuggestions([t("ai.sug_analyze"), t("ai.sug_translate"), t("ai.sug_check_stage")]);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, sending]);

  const addMsg = (text: string, role: "assistant" | "user") => {
    setMessages(prev => [...prev, { role, text, time: now() }]);
  };

  const apiCall = async (action: string, payload: Record<string,unknown>[]) => {
    const res = await fetch(getEndpoint(action), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    return res.ok ? res.json() : null;
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    addMsg(msg, "user");
    setInput("");
    setSending(true);
    setSuggestions([]);
    try {
      const data = await apiCall("processAdminAIChat", [{
        adminName: user.name || "Admin",
        message: msg,
        history: messages.slice(-20).map(m => ({ role: m.role, content: m.text })),
        candidateId: candidateId || undefined,
      }]);
      addMsg(data?.reply || "Jeklin bingung nih!", "assistant");
      if (data?.suggestedActions?.length) setSuggestions(data.suggestedActions);
    } catch { addMsg("Error koneksi.", "assistant"); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleParse = async () => {
    if (!parseFile) { showToast(t("ai.pick_file_first"), "error"); return; }
    setParseStatus("Parsing " + parseFile.name + "...");
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((r) => { reader.onload = () => r(String(reader.result || "").split(",")[1] || ""); reader.readAsDataURL(parseFile); });
      const data = await apiCall("parseDokumenBiodata", [{ candidateId: candidateId || undefined, wa: parseWa || undefined, file: { name: parseFile.name, mimeType: parseFile.type, data: b64 } }]);
      if (data) { addMsg("Parse berhasil: " + parseFile.name + " - " + (data.fieldCount || 0) + " field", "assistant"); showToast(t("ai.parse_success"), "success"); }
      else addMsg("Gagal parse.", "assistant");
      setParseStatus("");
    } catch (e) { addMsg("Error: " + (e as Error).message, "assistant"); setParseStatus(""); }
  };

  const handleGenModel = async () => {
    if (!parseWa && !candidateId) { showToast(t("ai.fill_wa_first"), "error"); return; }
    setParseStatus("Generating...");
    try {
      const data = await apiCall("generateWawancaraModel", [{ candidateId: candidateId || undefined, wa: parseWa || undefined, bidang: parseBidang || undefined }]);
      if (data) { addMsg(t("admin.model_wawancara") + (data.bidang || "SSW") + "\n" + (data.model || ""), "assistant"); showToast(t("ai.model_ready"), "success"); }
      setParseStatus("");
    } catch (e) { addMsg("Gagal: " + (e as Error).message, "assistant"); setParseStatus(""); }
  };

  const handleResults = async () => {
    if (!parseWa && !candidateId) { showToast(t("ai.fill_wa_first"), "error"); return; }
    setParseStatus("Fetching...");
    try {
      const data = await apiCall("getHasilWawancara", [{ candidateId: candidateId || undefined, wa: parseWa || undefined }]);
      if (data?.hasil) {
        setLastHasil({ wa: data.wa, hasil: data.hasil, nama: data.nama });
        const h = data.hasil;
        addMsg("Skor: " + (h.score ?? "-") + "/10\nRekomendasi: " + (h.rekomendasi || "-"), "assistant");
      } else addMsg(t("ai.no_results"), "assistant");
      setParseStatus("");
    } catch (e) { addMsg("Gagal: " + (e as Error).message, "assistant"); setParseStatus(""); }
  };

  const handleUpdateBio = async () => {
    const bio = (lastHasil as any)?.hasil?.biodata;
    if (!bio || !Object.keys(bio).length) { showToast(t("ai.no_biodata"), "error"); return; }
    const wa = (lastHasil as any)?.wa || parseWa;
    if (!wa) { showToast(t("ai.fill_wa_first"), "error"); return; }
    setParseStatus("Updating...");
    try {
      const data = await apiCall("submitMasterForm", [{ wa, ...bio }]);
      if (data) { addMsg("Biodata updated.", "assistant"); showToast(t("ai.biodata_updated"), "success"); }
      setParseStatus("");
    } catch (e) { addMsg("Gagal: " + (e as Error).message, "assistant"); setParseStatus(""); }
  };

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div class="flex items-center gap-3">
            <img src={JEKLIN_IMG} alt="Jeklin" class="w-8 h-8 rounded-full border border-amber-400" />
            <div><h3 class="text-sm font-bold text-amber-400">AI HR Copilot</h3><p class="text-[10px] text-slate-400">Qween Jeklin</p></div>
          </div>
          <div class="flex gap-1">
            {(["chat","parse","results"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} class={"px-2 py-1 text-[10px] font-bold rounded " + (mode === m ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400")}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
            ))}
          </div>
          <button onClick={onClose} class="text-slate-400 hover:text-white"><Icon name="times" class="text-lg" /></button>
        </div>
        {mode === "chat" && (<>
          <div ref={chatRef} class="flex-1 overflow-y-auto p-4 space-y-4">
            {sending && <div class="flex items-start gap-3"><img src={JEKLIN_IMG} alt="J" class="w-8 h-8 rounded-full border border-amber-400 flex-shrink-0" /><div class="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-amber-500/20 flex gap-1.5 items-center h-10" style={{width:"fit-content"}}><div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce"></div><div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style={{animationDelay:"0.15s"}}></div><div class="w-2 h-2 bg-amber-500/80 rounded-full animate-bounce" style={{animationDelay:"0.3s"}}></div></div></div>}
          </div>
          {suggestions.length > 0 && !sending && <div class="px-3 pb-2 flex gap-2 overflow-x-auto">{suggestions.map((s, i) => <button key={i} onClick={() => handleSend(s)} class="whitespace-nowrap px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] rounded-full border border-slate-700 flex-shrink-0">{s}</button>)}</div>}
          <div class="p-3 border-t border-slate-700 flex gap-2"><input ref={inputRef} type="text" value={input} onInput={e => setInput((e.target as HTMLInputElement).value)} onKeyDown={handleKeyDown} class="flex-1 bg-slate-800 text-xs text-white px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500" placeholder={t("ai.placeholder_admin")} /><button onClick={() => handleSend()} disabled={sending} class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl disabled:opacity-50"><Icon name="paper-plane" /></button></div>
        </>)}
        {mode === "parse" && <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-3"><label class="block text-[10px] font-bold text-slate-400 mb-1">Upload CV/Excel/PDF</label><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*" onChange={e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) setParseFile(f); }} class="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-amber-600 file:text-white file:text-[10px] file:font-bold" />{parseFile && <p class="text-[10px] text-emerald-400 mt-1"><Icon name="check" class="mr-0.5" />{parseFile.name}</p>}</div>
          <div class="grid grid-cols-2 gap-2"><input type="tel" value={parseWa} onInput={e => setParseWa((e.target as HTMLInputElement).value)} placeholder={t("ai.placeholder_wa")} class="bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700" /><input type="text" value={parseBidang} onInput={e => setParseBidang((e.target as HTMLInputElement).value)} placeholder={t("ai.placeholder_bidang")} class="bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700" /></div>
          <div class="flex gap-2"><button onClick={handleParse} class="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"><Icon name="bolt" class="mr-1" />Parse</button><button onClick={handleGenModel} class="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg"><Icon name="clipboard-list" class="mr-1" />Model</button></div>
          <div class="flex gap-2"><button onClick={handleResults} class="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold rounded-lg"><Icon name="file-alt" class="mr-1 text-sky-400" />Hasil</button><button onClick={handleUpdateBio} class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg"><Icon name="database" class="mr-1" />Update Bio</button></div>
          {parseStatus && <div class="text-[11px] text-sky-300 bg-sky-900/30 border border-sky-700/50 rounded-lg px-3 py-2">{parseStatus}</div>}
        </div>}
        {mode === "results" && <div class="flex-1 overflow-y-auto p-4">
          {lastHasil ? <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2"><h4 class="text-sm font-bold text-amber-400">Hasil Wawancara</h4><p class="text-xs text-slate-300">Kandidat: <span class="text-white font-bold">{(lastHasil as any).nama || (lastHasil as any).wa}</span></p><p class="text-xs text-slate-300">Skor: <span class="text-emerald-400 font-bold">{(lastHasil as any).hasil?.score ?? "-"}/10</span></p>{(lastHasil as any).hasil?.rekomendasi && <p class="text-xs text-slate-300">Rekomendasi: {(lastHasil as any).hasil.rekomendasi}</p>}<button onClick={handleUpdateBio} class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg mt-2"><Icon name="database" class="mr-1" />Update Biodata</button></div> : <p class="text-xs text-slate-500 text-center py-8">Belum ada hasil.</p>}
        </div>}
      </div>
    </div>
  );
}
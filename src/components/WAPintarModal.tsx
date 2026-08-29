/**
 * WAPintarModal.tsx - WhatsApp smart sender with template picker
 * Migrated from legacy/js/08_wa_pintar.ts injectModalWaPintar()
 */
import { useState } from 'preact/hooks';
import { showToast } from './Toast';
import { t } from '../store/i18n';

interface WaTemplate {
  id: string;
  nama: string;
  isi: string;
}

interface Props {
  candidateName: string;
  candidateJob: string;
  phone: string;
  templates: WaTemplate[];
  onClose: () => void;
}

export default function WAPintarModal({ candidateName, candidateJob, phone, templates, onClose }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) { setMessage(''); return; }
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    let msg = tpl.isi;
    msg = msg.replace(/<<NAMA>>/gi, candidateName);
    msg = msg.replace(/<<JOB>>/gi, candidateJob || 'Umum');
    setMessage(msg);
  };

  const handleSend = () => {
    if (!phone) return showToast('Nomor WA tidak valid', 'error');
    if (!message.trim()) return showToast('Pesan tidak boleh kosong', 'error');
    const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message.trim());
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div class="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
         onClick={onClose}>
      <div class="bg-slate-900 border border-emerald-500/50 p-6 rounded-[2rem] w-full max-w-md shadow-2xl"
           onClick={e => e.stopPropagation()}>
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-xl font-bold text-emerald-400">
            <i class="fab fa-whatsapp mr-2"></i>WA Pintar
          </h3>
          <button onClick={onClose} class="text-slate-400 hover:text-white transition">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div class="space-y-4">
          {/* Candidate info */}
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">KANDIDAT TUJUAN</label>
            <input type="text" readonly
                   value={candidateName + ' (' + (candidateJob || 'Umum') + ')'}
                   class="w-full p-2.5 rounded-lg bg-black/40 border border-slate-700 text-emerald-300 text-sm font-bold outline-none cursor-not-allowed" />
          </div>

          {/* Template picker */}
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">PILIH TEMPLATE PESAN</label>
            <select value={selectedTemplate}
                    onChange={e => handleTemplateSelect((e.target as HTMLSelectElement).value)}
                    class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500 transition">
              <option value="">-- Ketik Manual / Pilih Template --</option>
              {templates.map(tpl => (
                <option value={tpl.id}>{tpl.nama}</option>
              ))}
            </select>
          </div>

          {/* Message textarea */}
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">ISI PESAN (Bisa Diedit / Custom)</label>
            <textarea rows={6} value={message}
                      onInput={e => setMessage((e.target as HTMLTextAreaElement).value)}
                      class="w-full p-2.5 rounded-lg bg-black/60 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500 transition leading-relaxed resize-none"
                      placeholder="Ketik pesan atau pilih template di atas..."></textarea>
          </div>

          {/* Send button */}
          <button onClick={handleSend}
                  class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition text-base mt-2">
            <i class="fab fa-whatsapp mr-2"></i>Buka WhatsApp & Kirim
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * LaporanBulananModal.tsx — Monthly report modal
 * Source: legacy → showMonthlyReport
 */
import { useStore } from '@nanostores/preact';
import { reportModalOpen, closeReportModal, kandidatList } from '../../store/adminStore';
import Icon from '../ui/Icon';



export default function LaporanBulananModal() {
  const open = useStore(reportModalOpen);
  const onClose = closeReportModal;
  const kandidat = useStore(kandidatList);
  if (!open) return null;

  // Group by job
  const byJob: Record<string, number> = {};
  kandidat.forEach(k => {
    const job = k.idLoker || 'UMUM';
    byJob[job] = (byJob[job] || 0) + 1;
  });

  // Group by tahapan
  const byStage: Record<string, number> = {};
  kandidat.forEach(k => {
    const stage = k.tahapan || 'BARU';
    byStage[stage] = (byStage[stage] || 0) + 1;
  });

  // Group by status
  const byStatus: Record<string, number> = {};
  kandidat.forEach(k => {
    const status = k.status || '-';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  return (
    <div class="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div class="bg-slate-900 border border-blue-900/50 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div class="p-6">
          <h3 class="text-xl font-bold text-blue-400 mb-4 border-b border-blue-900/50 pb-3">
            <Icon name="chart-bar" class="mr-2" /> Laporan Kandidat per Loker
          </h3>

          <div class="mb-6">
            <p class="text-sm text-slate-300 mb-2">Total: <span class="font-bold text-white">{kandidat.length} kandidat</span></p>
          </div>

          {/* Per Job */}
          <div class="mb-6">
            <h4 class="text-sm font-bold text-sky-400 mb-3 uppercase tracking-wider"><Icon name="briefcase" class="mr-1" /> Per Loker</h4>
            <div class="space-y-2">
              {Object.entries(byJob).sort((a, b) => b[1] - a[1]).map(([job, count]) => (
                <div key={job} class="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                  <span class="text-sm text-white font-mono">{job}</span>
                  <span class="text-sm font-bold text-sky-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per Tahapan */}
          <div class="mb-6">
            <h4 class="text-sm font-bold text-amber-400 mb-3 uppercase tracking-wider"><Icon name="layer-group" class="mr-1" /> Per Tahapan</h4>
            <div class="space-y-2">
              {Object.entries(byStage).sort((a, b) => b[1] - a[1]).map(([stage, count]) => (
                <div key={stage} class="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                  <span class="text-sm text-white">{stage}</span>
                  <span class="text-sm font-bold text-amber-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per Status */}
          <div class="mb-6">
            <h4 class="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-wider"><Icon name="check-circle" class="mr-1" /> Per Status</h4>
            <div class="space-y-2">
              {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div key={status} class="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                  <span class="text-sm text-white">{status}</span>
                  <span class="text-sm font-bold text-emerald-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onClose} class="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold shadow-lg transition text-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

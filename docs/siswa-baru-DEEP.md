# siswa-baru.astro - Deep Analysis

> Pendaftaran siswa baru via chat AI + form + upload.

## Component: SiswaBaruForm.tsx (split: chat 40% + form 60%)
## Actions: processSiswaAIChat (bridge-links), submitDaftarSiswa (ai-form-submit)
## DB: INSERT respon_siswa_baru (12 fields + 3 file URLs)
## State: messages, biodata (9 flat fields), docs (3 uploads), input, sending, activeTab

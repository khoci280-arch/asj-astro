# AI Submit + TTD Naitei - Deep Analysis

## Submit: saveToDatabase() -> upload Cloudinary -> bridge-links/submitDataAsj
  -> UPSERT ai_form_submissions + MERGE master_database_candidate + SYNC database_candidate

## TTD: simpanDataTtdNaitei() -> bridge-links/simpanDataTtdNaitei
  -> UPSERT esignatures + fallback ai_form_submissions

## AI_MANAGED_KEYS: identitas, fisik, medis, pendidikan, pekerjaan, sertifikasi, keluarga, wawancara

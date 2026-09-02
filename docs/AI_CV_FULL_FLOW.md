> **Last updated:** 2026-09-03 — AI feature documentation.

# AI CV Full Flow - End-to-End

## Flow:
Kandidat (AiCvForm) -> chat AI -> upload Cloudinary -> submitDataAsj
  -> Backend: upsert ai_form_submissions + master_database_candidate + sync database_candidate
  -> Mail sync -> FCM push -> Admin review (TabMail)

## Storage: Pas Photo, JFT, SSW, KTP, KK, Ijazah SD/SMP/SMA, Univ (all Cloudinary)
## submitted_via: ai_form, interview, esign, ttd

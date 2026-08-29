# AI Parse Dokumen - Deep Analysis

## Flow: Admin upload -> base64 -> bridge-links/parseDokumenBiodata (admin-ai-context)
  -> Gemini parse (MIME validate + 8MB limit + admin guard)
  -> Return { wa, data, fieldCount }
  -> bridge-links/submitMasterForm -> save to master_database_candidate

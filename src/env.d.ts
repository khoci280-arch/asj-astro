/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly FONNTE_TOKEN: string;
  readonly ADMIN_PASSWORD: string;
  readonly ADMIN_MASTER_PIN: string;
  readonly PIN_KHOCI: string;
  readonly SESSION_SECRET: string;
  readonly NETLIFY_SITE_URL: string;
  readonly SUPABASE_STORAGE_BUCKET: string;
  readonly FIREBASE_SERVICE_ACCOUNT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

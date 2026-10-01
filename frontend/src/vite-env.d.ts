/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEBUG_PANEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

import type { StentorApi } from '@stentordeck/shared';

declare global {
  interface Window {
    stentor: StentorApi;
  }
}

export {};

/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

import type { StentorApi } from '@stentordeck/shared';

declare global {
  interface Window {
    stentor: StentorApi;
  }
}

export {};

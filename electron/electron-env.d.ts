/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  windowManager: {
    openConnectionWindow: (connectionId: string, connectionName: string) => Promise<{ success: boolean; windowId?: string; message?: string }>
    setMainWindowFullscreen: () => Promise<{ success: boolean; message?: string }>
  }
}

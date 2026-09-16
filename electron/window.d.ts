interface ElectronAPI {
  minimize(): void
  maximize(): void
  close(): void
  isMaximized(): Promise<boolean>
  setSecret(key: string, value: string): Promise<boolean>
  getSecret(key: string): Promise<string | null>
  deleteSecret(key: string): Promise<boolean>
  onMenuNew(callback: () => void): void
  onMenuOpen(callback: () => void): void
  onMenuExport(callback: () => void): void
  offMenuNew(callback: () => void): void
  offMenuOpen(callback: () => void): void
  offMenuExport(callback: () => void): void
  platform: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}

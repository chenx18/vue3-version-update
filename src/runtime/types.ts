export interface VersionManifest {
  version: string
  buildTime: string
  buildId: string
}

export type VersionRefreshStrategy = 'auto' | 'self' | 'top' | 'custom'

export interface VersionRuntimeEnv {
  version?: string
  buildId?: string
  buildTime?: string
  baseUrl?: string
}

export interface VersionUpdateContext {
  version: string
  buildId: string
  buildTime?: string
  isEmbedded: boolean
}

export interface VersionDialogOptions {
  title: string
  message: string
  confirmText: string
  cancelText: string
}

export interface VersionUpdateTexts {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  indicatorText?: string
  indicatorTitle?: string
}

export type VersionUpdateTextsResolver = () => VersionUpdateTexts

export interface VersionUpdateOptions {
  pollInterval?: number
  remindDelay?: number
  enableDialog?: boolean
  enableIndicator?: boolean
  enableFocusCheck?: boolean
  enableVisibilityCheck?: boolean
  versionUrl?: string | (() => string)
  storagePrefix?: string
  refreshStrategy?: VersionRefreshStrategy
  debug?: boolean
  runtimeEnv?: VersionRuntimeEnv
  texts?: VersionUpdateTexts | VersionUpdateTextsResolver
  dialogRenderer?: (options: VersionDialogOptions, context: VersionUpdateContext) => Promise<boolean> | boolean
  onUpdateDetected?: (context: VersionUpdateContext) => void | Promise<void>
  onUpdateDeferred?: (context: VersionUpdateContext) => void | Promise<void>
  onUpdateConfirmed?: (context: VersionUpdateContext) => void | Promise<void>
  onRefresh?: (context: VersionUpdateContext) => void | Promise<void>
}

export interface VersionUpdateState {
  initialized: boolean
  checking: boolean
  dialogVisible: boolean
  hasPendingUpdate: boolean
  indicatorVisible: boolean
  latestBuildId: string
  latestVersion: string
  latestBuildTime: string
  pollInterval: number
  remindDelay: number
  enableDialog: boolean
  enableIndicator: boolean
  enableFocusCheck: boolean
  enableVisibilityCheck: boolean
  refreshStrategy: VersionRefreshStrategy
  debug: boolean
  indicatorText: string
  indicatorTitle: string
}

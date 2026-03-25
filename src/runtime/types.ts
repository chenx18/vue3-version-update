export interface VersionManifest {
  version?: string
  buildTime?: string
  buildId: string
}

export type VersionRefreshStrategy = 'auto' | 'self' | 'top' | 'custom'
export type VersionUpdateIndicatorMode = 'icon' | 'tag'
export type VersionUpdateAnchor = 'header' | 'right-edge'

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

export interface VersionUpdateTexts {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  indicatorText?: string
  indicatorTitle?: string
  cardTitle?: string
  cardMessage?: string
  deferOptionText?: string
}

export interface VersionUpdateIndicatorSlotProps {
  requestVersionUpdate: () => void
  confirmVersionUpdate: () => void
  deferVersionUpdate: (duration?: number) => void
  openPanel: () => void
  closePanel: () => void
  panelVisible: boolean
  indicatorTitle: string
  indicatorText: string
  hasPendingUpdate: boolean
  indicatorVisible: boolean
  latestVersion: string
  latestBuildId: string
  latestBuildTime: string
  remindAt: number
}

export type VersionUpdateTextsResolver = () => VersionUpdateTexts

export interface VersionUpdateOptions {
  pollInterval?: number
  remindDelay?: number
  enableIndicator?: boolean
  enableFocusCheck?: boolean
  enableVisibilityCheck?: boolean
  anchor?: VersionUpdateAnchor
  versionUrl?: string | (() => string)
  storagePrefix?: string
  refreshStrategy?: VersionRefreshStrategy
  debug?: boolean
  runtimeEnv?: VersionRuntimeEnv
  devMock?: boolean
  texts?: VersionUpdateTexts | VersionUpdateTextsResolver
  onUpdateDetected?: (context: VersionUpdateContext) => void | Promise<void>
  onUpdateDeferred?: (context: VersionUpdateContext) => void | Promise<void>
  onUpdateConfirmed?: (context: VersionUpdateContext) => void | Promise<void>
  onRefresh?: (context: VersionUpdateContext) => void | Promise<void>
}

export interface VersionUpdateState {
  initialized: boolean
  checking: boolean
  hasPendingUpdate: boolean
  indicatorVisible: boolean
  latestBuildId: string
  latestVersion: string
  latestBuildTime: string
  remindAt: number
  pollInterval: number
  remindDelay: number
  enableIndicator: boolean
  enableFocusCheck: boolean
  enableVisibilityCheck: boolean
  anchor: VersionUpdateAnchor
  refreshStrategy: VersionRefreshStrategy
  debug: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  indicatorText: string
  indicatorTitle: string
  cardTitle: string
  cardMessage: string
  deferOptionText: string
}

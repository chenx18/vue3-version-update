export {
  confirmVersionUpdate,
  deferVersionUpdate,
  destroyVersionUpdate,
  initVersionUpdate,
  refreshVersionUpdateTexts,
  requestVersionUpdate,
  setVersionUpdateRuntimeEnv,
  useVersionUpdate
} from './service.js'
export type {
  VersionManifest,
  VersionRefreshStrategy,
  VersionRuntimeEnv,
  VersionUpdateContext,
  VersionUpdateAnchor,
  VersionUpdateIndicatorMode,
  VersionUpdateIndicatorSlotProps,
  VersionUpdateOptions,
  VersionUpdateState,
  VersionUpdateTexts,
  VersionUpdateTextsResolver
} from './types'
export { default as VersionUpdateIndicator } from './VersionUpdateIndicator.vue'

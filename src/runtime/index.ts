export { destroyVersionUpdate, initVersionUpdate, refreshVersionUpdateTexts, requestVersionUpdate, setVersionUpdateRuntimeEnv, useVersionUpdate } from './service.js'
export type {
  VersionDialogOptions,
  VersionManifest,
  VersionRefreshStrategy,
  VersionRuntimeEnv,
  VersionUpdateContext,
  VersionUpdateOptions,
  VersionUpdateState,
  VersionUpdateTexts,
  VersionUpdateTextsResolver
} from './types'
export { default as VersionUpdateIndicator } from './VersionUpdateIndicator.vue'

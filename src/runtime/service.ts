import { reactive, readonly, toRefs } from 'vue'
import type {
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

const DEFAULT_STORAGE_PREFIX = 'APP_VERSION_UPDATE_'
const APP_VERSION_QUERY_KEY = '__app_v'
const DEFAULT_POLL_INTERVAL = 5 * 60 * 1000
const DEFAULT_REMIND_DELAY = 10 * 60 * 1000
const DEFAULT_VERSION_URL = 'version.json'
const DEFAULT_BASE_URL = '/'
const DEFAULT_DIALOG_NAMESPACE = 'version-update-dialog'

const DEFAULT_TEXTS: Required<VersionUpdateTexts> = {
  title: '版本更新提示',
  message: '检测到系统已有新版本发布。立即更新会刷新当前页面，稍后更新可在合适的时候再刷新。',
  confirmText: '立即更新',
  cancelText: '稍后更新',
  indicatorText: '待更新',
  indicatorTitle: '检测到新版本，点击查看更新'
}

const state = reactive<VersionUpdateState>({
  initialized: false,
  checking: false,
  dialogVisible: false,
  hasPendingUpdate: false,
  indicatorVisible: false,
  latestBuildId: '',
  latestVersion: '',
  latestBuildTime: '',
  pollInterval: DEFAULT_POLL_INTERVAL,
  remindDelay: DEFAULT_REMIND_DELAY,
  enableDialog: true,
  enableIndicator: true,
  enableFocusCheck: true,
  enableVisibilityCheck: true,
  refreshStrategy: 'auto',
  debug: false,
  indicatorText: DEFAULT_TEXTS.indicatorText,
  indicatorTitle: DEFAULT_TEXTS.indicatorTitle
})

const runtimeOptions: Required<
  Pick<
    VersionUpdateOptions,
    | 'enableDialog'
    | 'enableIndicator'
    | 'enableFocusCheck'
    | 'enableVisibilityCheck'
    | 'pollInterval'
    | 'remindDelay'
    | 'refreshStrategy'
    | 'debug'
  >
> &
  Pick<
    VersionUpdateOptions,
    | 'versionUrl'
    | 'storagePrefix'
    | 'dialogRenderer'
    | 'onUpdateDetected'
    | 'onUpdateDeferred'
    | 'onUpdateConfirmed'
    | 'onRefresh'
  > & {
    runtimeEnv: VersionRuntimeEnv
    texts: VersionUpdateTexts | VersionUpdateTextsResolver
  } = {
  enableDialog: true,
  enableIndicator: true,
  enableFocusCheck: true,
  enableVisibilityCheck: true,
  pollInterval: DEFAULT_POLL_INTERVAL,
  remindDelay: DEFAULT_REMIND_DELAY,
  refreshStrategy: 'auto',
  debug: false,
  versionUrl: DEFAULT_VERSION_URL,
  storagePrefix: DEFAULT_STORAGE_PREFIX,
  runtimeEnv: {},
  texts: DEFAULT_TEXTS,
  dialogRenderer: undefined,
  onUpdateDetected: undefined,
  onUpdateDeferred: undefined,
  onUpdateConfirmed: undefined,
  onRefresh: undefined
}

let timerId: number | null = null
let focusHandler: (() => void) | null = null
let visibilityHandler: (() => void) | null = null

function readGlobalString(name: '__APP_VERSION__' | '__APP_BUILD_ID__' | '__APP_BUILD_TIME__') {
  const value = (globalThis as Record<string, unknown>)[name]
  return typeof value === 'string' ? value : ''
}

function getRuntimeEnv() {
  return {
    version: runtimeOptions.runtimeEnv.version || readGlobalString('__APP_VERSION__'),
    buildId: runtimeOptions.runtimeEnv.buildId || readGlobalString('__APP_BUILD_ID__'),
    buildTime: runtimeOptions.runtimeEnv.buildTime || readGlobalString('__APP_BUILD_TIME__'),
    baseUrl: runtimeOptions.runtimeEnv.baseUrl || DEFAULT_BASE_URL
  }
}

function getStorageKey(name: string) {
  return `${runtimeOptions.storagePrefix ?? DEFAULT_STORAGE_PREFIX}${name}`
}

function logDebug(message: string, payload?: unknown) {
  if (!state.debug) {
    return
  }

  if (payload === undefined) {
    console.info(`[version-update] ${message}`)
    return
  }

  console.info(`[version-update] ${message}`, payload)
}

function getUpdateContext(manifest?: Partial<VersionManifest>): VersionUpdateContext {
  const env = getRuntimeEnv()
  return {
    version: manifest?.version || state.latestVersion || env.version,
    buildId: manifest?.buildId || state.latestBuildId || env.buildId,
    buildTime: manifest?.buildTime || state.latestBuildTime || env.buildTime,
    isEmbedded: Boolean((window as any).$wujie)
  }
}

function resolveTexts(): Required<VersionUpdateTexts> {
  const inputTexts = typeof runtimeOptions.texts === 'function' ? runtimeOptions.texts() : runtimeOptions.texts
  return {
    ...DEFAULT_TEXTS,
    ...(inputTexts || {})
  }
}

function syncIndicatorTexts() {
  const texts = resolveTexts()
  state.indicatorText = texts.indicatorText
  state.indicatorTitle = texts.indicatorTitle
}

function getDialogOptions(): VersionDialogOptions {
  const texts = resolveTexts()
  return {
    title: texts.title,
    message: texts.message,
    confirmText: texts.confirmText,
    cancelText: texts.cancelText
  }
}

function createDefaultDialogRenderer() {
  return (dialogOptions: VersionDialogOptions) =>
    new Promise<boolean>((resolve) => {
      const previousDialog = document.getElementById(DEFAULT_DIALOG_NAMESPACE)
      if (previousDialog) {
        previousDialog.remove()
      }

      const overlay = document.createElement('div')
      overlay.id = DEFAULT_DIALOG_NAMESPACE
      overlay.style.position = 'fixed'
      overlay.style.inset = '0'
      overlay.style.zIndex = '9999'
      overlay.style.display = 'flex'
      overlay.style.alignItems = 'center'
      overlay.style.justifyContent = 'center'
      overlay.style.background = 'rgba(15, 23, 42, 0.45)'

      const panel = document.createElement('div')
      panel.style.width = 'min(420px, calc(100vw - 32px))'
      panel.style.background = '#ffffff'
      panel.style.borderRadius = '16px'
      panel.style.boxShadow = '0 24px 64px rgba(15, 23, 42, 0.18)'
      panel.style.padding = '20px'
      panel.style.boxSizing = 'border-box'
      panel.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

      const title = document.createElement('div')
      title.textContent = dialogOptions.title
      title.style.fontSize = '18px'
      title.style.fontWeight = '700'
      title.style.color = '#111827'
      title.style.marginBottom = '10px'

      const message = document.createElement('div')
      message.textContent = dialogOptions.message
      message.style.fontSize = '14px'
      message.style.lineHeight = '1.7'
      message.style.color = '#4b5563'
      message.style.marginBottom = '18px'

      const actions = document.createElement('div')
      actions.style.display = 'flex'
      actions.style.justifyContent = 'flex-end'
      actions.style.gap = '10px'

      const cancelButton = document.createElement('button')
      cancelButton.type = 'button'
      cancelButton.textContent = dialogOptions.cancelText
      cancelButton.style.height = '36px'
      cancelButton.style.padding = '0 14px'
      cancelButton.style.border = '1px solid #d1d5db'
      cancelButton.style.borderRadius = '10px'
      cancelButton.style.background = '#ffffff'
      cancelButton.style.color = '#374151'
      cancelButton.style.cursor = 'pointer'

      const confirmButton = document.createElement('button')
      confirmButton.type = 'button'
      confirmButton.textContent = dialogOptions.confirmText
      confirmButton.style.height = '36px'
      confirmButton.style.padding = '0 14px'
      confirmButton.style.border = 'none'
      confirmButton.style.borderRadius = '10px'
      confirmButton.style.background = '#2563eb'
      confirmButton.style.color = '#ffffff'
      confirmButton.style.cursor = 'pointer'

      const cleanup = (result: boolean) => {
        window.removeEventListener('keydown', onKeydown)
        overlay.remove()
        resolve(result)
      }

      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          cleanup(false)
        }
      }

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          cleanup(false)
        }
      })
      cancelButton.addEventListener('click', () => cleanup(false))
      confirmButton.addEventListener('click', () => cleanup(true))
      window.addEventListener('keydown', onKeydown)

      actions.appendChild(cancelButton)
      actions.appendChild(confirmButton)
      panel.appendChild(title)
      panel.appendChild(message)
      panel.appendChild(actions)
      overlay.appendChild(panel)
      document.body.appendChild(overlay)
      confirmButton.focus()
    })
}

async function openConfirmDialog(context: VersionUpdateContext): Promise<boolean> {
  const dialogOptions = getDialogOptions()

  if (runtimeOptions.dialogRenderer) {
    return runtimeOptions.dialogRenderer(dialogOptions, context)
  }

  return createDefaultDialogRenderer()(dialogOptions)
}

function clearAppStorage() {
  const prefix = runtimeOptions.storagePrefix ?? DEFAULT_STORAGE_PREFIX

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      localStorage.removeItem(key)
    }
  }

  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith(prefix)) {
      sessionStorage.removeItem(key)
    }
  }
}

function persistCurrentVersion() {
  const env = getRuntimeEnv()
  if (!env.buildId) {
    return
  }

  localStorage.setItem(getStorageKey('version'), env.buildId)
  document.cookie = `app_version=${env.buildId}; path=/; max-age=31536000`
}

function clearPendingVersionState() {
  sessionStorage.removeItem(getStorageKey('reload_guard'))
  localStorage.removeItem(getStorageKey('pending_version'))
  localStorage.removeItem(getStorageKey('version_remind_at'))
  state.hasPendingUpdate = false
  state.indicatorVisible = false
  state.latestBuildId = ''
  state.latestVersion = ''
  state.latestBuildTime = ''
  syncIndicatorTexts()
}

function syncLocalVersion() {
  const env = getRuntimeEnv()
  if (!env.buildId) {
    logDebug('未提供当前构建标识，跳过本地版本同步')
    return
  }

  const oldVersion = localStorage.getItem(getStorageKey('version'))
  if (oldVersion === env.buildId) {
    return
  }

  clearAppStorage()
  persistCurrentVersion()
  logDebug('检测到当前运行版本已切换，已清理旧缓存', {
    oldVersion,
    currentBuildId: env.buildId
  })
}

function buildVersionManifestUrl() {
  const customVersionUrl =
    typeof runtimeOptions.versionUrl === 'function' ? runtimeOptions.versionUrl() : runtimeOptions.versionUrl
  const manifestUrl = customVersionUrl || DEFAULT_VERSION_URL
  const baseUrl = getRuntimeEnv().baseUrl || DEFAULT_BASE_URL
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const versionUrl = new URL(manifestUrl, window.location.origin + normalizedBaseUrl)
  versionUrl.searchParams.set('t', Date.now().toString())
  return versionUrl.toString()
}

async function fetchVersionManifest(): Promise<VersionManifest> {
  const requestUrl = buildVersionManifestUrl()
  logDebug('开始请求版本清单', { requestUrl })

  const response = await fetch(requestUrl, {
    cache: 'no-store',
    headers: {
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })

  if (!response.ok) {
    throw new Error(`version manifest request failed: ${response.status}`)
  }

  const manifest = (await response.json()) as VersionManifest
  logDebug('版本清单请求成功', manifest)
  return manifest
}

function reloadSelf(buildId: string) {
  const currentUrl = new URL(window.location.href)
  const currentVersion = currentUrl.searchParams.get(APP_VERSION_QUERY_KEY)

  if (currentVersion !== buildId) {
    currentUrl.searchParams.set(APP_VERSION_QUERY_KEY, buildId)
    window.location.replace(currentUrl.toString())
    return
  }

  window.location.reload()
}

function reloadTopWindow() {
  try {
    if (window.top && window.top !== window) {
      window.top.location.reload()
      return
    }
  } catch (error) {
    console.warn('[version-update] 顶层页面刷新失败，回退为当前页面刷新', error)
  }

  window.location.reload()
}

function resolveRefreshStrategy(context: VersionUpdateContext): Exclude<VersionRefreshStrategy, 'auto'> {
  if (runtimeOptions.refreshStrategy === 'auto') {
    return context.isEmbedded ? 'top' : 'self'
  }

  if (runtimeOptions.refreshStrategy === 'custom') {
    return 'custom'
  }

  return runtimeOptions.refreshStrategy
}

async function applyUpdate(buildId: string) {
  const context = getUpdateContext({ buildId })
  const refreshStrategy = resolveRefreshStrategy(context)
  logDebug('开始执行刷新策略', { refreshStrategy, context })

  clearPendingVersionState()

  if (runtimeOptions.onRefresh) {
    await runtimeOptions.onRefresh(context)
    return
  }

  if (refreshStrategy === 'custom') {
    console.warn('[version-update] refreshStrategy 已设置为 custom，但未提供 onRefresh，已回退为自动策略')
    if (context.isEmbedded) {
      reloadTopWindow()
      return
    }
    reloadSelf(buildId)
    return
  }

  if (refreshStrategy === 'top') {
    reloadTopWindow()
    return
  }

  reloadSelf(buildId)
}

function updatePendingState(manifest: VersionManifest) {
  syncIndicatorTexts()
  state.hasPendingUpdate = true
  state.indicatorVisible = state.enableIndicator
  state.latestBuildId = manifest.buildId
  state.latestVersion = manifest.version
  state.latestBuildTime = manifest.buildTime
}

async function emitDetected(manifest: VersionManifest) {
  if (!runtimeOptions.onUpdateDetected) {
    return
  }

  await runtimeOptions.onUpdateDetected(getUpdateContext(manifest))
}

async function showUpdatePrompt(manifest: VersionManifest) {
  if (state.dialogVisible) {
    return
  }

  const remindAt = Number(localStorage.getItem(getStorageKey('version_remind_at')) || '0')
  if (Date.now() < remindAt) {
    updatePendingState(manifest)
    logDebug('仍处于稍后更新冷却期，不弹窗', { remindAt, manifest })
    return
  }

  state.dialogVisible = true
  updatePendingState(manifest)
  localStorage.setItem(getStorageKey('pending_version'), manifest.buildId)

  if (!state.enableDialog) {
    logDebug('已关闭弹窗能力，仅保留待更新状态', manifest)
    state.dialogVisible = false
    return
  }

  try {
    const confirmed = await openConfirmDialog(getUpdateContext(manifest))
    if (!confirmed) {
      throw new Error('deferred')
    }

    if (runtimeOptions.onUpdateConfirmed) {
      await runtimeOptions.onUpdateConfirmed(getUpdateContext(manifest))
    }
    await applyUpdate(manifest.buildId)
  } catch (error) {
    localStorage.setItem(getStorageKey('version_remind_at'), String(Date.now() + state.remindDelay))
    logDebug('用户选择稍后更新', manifest)
    if (runtimeOptions.onUpdateDeferred) {
      await runtimeOptions.onUpdateDeferred(getUpdateContext(manifest))
    }
  } finally {
    state.dialogVisible = false
  }
}

async function checkVersion() {
  if (state.checking) {
    return
  }

  const env = getRuntimeEnv()
  if (!env.buildId) {
    logDebug('未提供当前构建标识，跳过版本检查')
    return
  }

  state.checking = true

  try {
    const latestManifest = await fetchVersionManifest()
    if (!latestManifest.buildId || latestManifest.buildId === env.buildId) {
      clearPendingVersionState()
      logDebug('线上版本与当前版本一致，无需更新', latestManifest)
      return
    }

    const reloadGuard = sessionStorage.getItem(getStorageKey('reload_guard'))
    updatePendingState(latestManifest)

    if (reloadGuard === latestManifest.buildId) {
      const pendingVersion = localStorage.getItem(getStorageKey('pending_version'))
      if (pendingVersion === latestManifest.buildId) {
        await showUpdatePrompt(latestManifest)
      }
      return
    }

    sessionStorage.setItem(getStorageKey('reload_guard'), latestManifest.buildId)
    await emitDetected(latestManifest)
    await showUpdatePrompt(latestManifest)
  } catch (error) {
    console.error('[version-update] 版本探测失败', error)
  } finally {
    state.checking = false
  }
}

function bindLifecycle() {
  if (state.enableFocusCheck) {
    focusHandler = () => {
      syncIndicatorTexts()
      void checkVersion()
    }
    window.addEventListener('focus', focusHandler)
  }

  if (state.enableVisibilityCheck) {
    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        syncIndicatorTexts()
        void checkVersion()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  if (state.pollInterval > 0) {
    timerId = window.setInterval(() => {
      syncIndicatorTexts()
      void checkVersion()
    }, state.pollInterval)
  }
}

function clearLifecycle() {
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler)
    focusHandler = null
  }

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }

  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }

  const previousDialog = document.getElementById(DEFAULT_DIALOG_NAMESPACE)
  if (previousDialog) {
    previousDialog.remove()
  }
}

export function setVersionUpdateRuntimeEnv(runtimeEnv: VersionRuntimeEnv) {
  runtimeOptions.runtimeEnv = {
    ...runtimeOptions.runtimeEnv,
    ...runtimeEnv
  }
  refreshVersionUpdateTexts()
}

export function refreshVersionUpdateTexts() {
  syncIndicatorTexts()
}

export function initVersionUpdate(options: VersionUpdateOptions = {}) {
  if (state.initialized) {
    logDebug('版本更新服务已经初始化，忽略重复调用')
    return
  }

  runtimeOptions.pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL
  runtimeOptions.remindDelay = options.remindDelay ?? DEFAULT_REMIND_DELAY
  runtimeOptions.enableDialog = options.enableDialog ?? true
  runtimeOptions.enableIndicator = options.enableIndicator ?? true
  runtimeOptions.enableFocusCheck = options.enableFocusCheck ?? true
  runtimeOptions.enableVisibilityCheck = options.enableVisibilityCheck ?? true
  runtimeOptions.versionUrl = options.versionUrl ?? DEFAULT_VERSION_URL
  runtimeOptions.storagePrefix = options.storagePrefix ?? DEFAULT_STORAGE_PREFIX
  runtimeOptions.refreshStrategy = options.refreshStrategy ?? 'auto'
  runtimeOptions.debug = options.debug ?? false
  runtimeOptions.runtimeEnv = {
    ...runtimeOptions.runtimeEnv,
    ...(options.runtimeEnv || {})
  }
  runtimeOptions.dialogRenderer = options.dialogRenderer
  runtimeOptions.onUpdateDetected = options.onUpdateDetected
  runtimeOptions.onUpdateDeferred = options.onUpdateDeferred
  runtimeOptions.onUpdateConfirmed = options.onUpdateConfirmed
  runtimeOptions.onRefresh = options.onRefresh
  runtimeOptions.texts = options.texts ?? DEFAULT_TEXTS

  state.initialized = true
  state.pollInterval = runtimeOptions.pollInterval
  state.remindDelay = runtimeOptions.remindDelay
  state.enableDialog = runtimeOptions.enableDialog
  state.enableIndicator = runtimeOptions.enableIndicator
  state.enableFocusCheck = runtimeOptions.enableFocusCheck
  state.enableVisibilityCheck = runtimeOptions.enableVisibilityCheck
  state.refreshStrategy = runtimeOptions.refreshStrategy
  state.debug = runtimeOptions.debug
  syncIndicatorTexts()

  logDebug('版本更新服务初始化完成', {
    pollInterval: state.pollInterval,
    remindDelay: state.remindDelay,
    enableDialog: state.enableDialog,
    enableIndicator: state.enableIndicator,
    enableFocusCheck: state.enableFocusCheck,
    enableVisibilityCheck: state.enableVisibilityCheck,
    refreshStrategy: state.refreshStrategy,
    versionUrl: runtimeOptions.versionUrl,
    storagePrefix: runtimeOptions.storagePrefix,
    runtimeEnv: getRuntimeEnv(),
    hasCustomDialogRenderer: Boolean(runtimeOptions.dialogRenderer),
    hasDynamicTexts: typeof runtimeOptions.texts === 'function'
  })

  syncLocalVersion()
  void checkVersion()
  bindLifecycle()
}

export function destroyVersionUpdate() {
  clearLifecycle()
  state.initialized = false
  state.checking = false
  state.dialogVisible = false
  logDebug('版本更新服务已销毁')
}

export function requestVersionUpdate() {
  if (!state.hasPendingUpdate || !state.latestBuildId) {
    return
  }

  syncIndicatorTexts()

  const context = getUpdateContext({
    buildId: state.latestBuildId,
    version: state.latestVersion,
    buildTime: state.latestBuildTime
  })

  if (!state.enableDialog) {
    Promise.resolve(runtimeOptions.onUpdateConfirmed?.(context))
      .then(() => applyUpdate(context.buildId))
      .catch((error) => {
        console.error('[version-update] 标识触发更新失败', error)
      })
    return
  }

  void showUpdatePrompt({
    buildId: context.buildId,
    version: context.version,
    buildTime: context.buildTime || ''
  })
}

export function useVersionUpdate() {
  return {
    ...toRefs(readonly(state)),
    requestVersionUpdate,
    refreshVersionUpdateTexts
  }
}


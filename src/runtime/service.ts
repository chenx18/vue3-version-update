import { reactive, readonly, toRefs } from 'vue'
import type {
  VersionManifest,
  VersionUpdateAnchor,
  VersionRefreshStrategy,
  VersionRuntimeEnv,
  VersionUpdateContext,
  VersionUpdateOptions,
  VersionUpdateState,
  VersionUpdateTimeFormatter,
  VersionUpdateTexts,
  VersionUpdateTextsResolver
} from './types'

const DEFAULT_STORAGE_PREFIX = 'APP_VERSION_UPDATE_'
const APP_VERSION_QUERY_KEY = '__app_v'
const DEFAULT_POLL_INTERVAL = 5 * 60 * 1000
const DEFAULT_REMIND_DELAY = 10 * 60 * 1000
const DEFAULT_VERSION_URL = 'version.json'
const DEFAULT_BASE_URL = '/'
const DEFAULT_ANCHOR: VersionUpdateAnchor = 'header'
const DEV_MOCK_QUERY_KEY = '__mock_version_update'
const DEV_MOCK_BUILD_ID = 'mock-current-build'

const DEFAULT_TEXTS: Required<VersionUpdateTexts> = {
  title: '版本更新提示',
  message: '检测到系统已有新版本发布。立即更新会刷新当前页面，稍后更新可在合适的时候再刷新。',
  confirmText: '立即更新',
  cancelText: '稍后更新',
  indicatorText: '立即更新',
  indicatorTitle: '检测到新版本，点击查看详情',
  cardTitle: '系统更新',
  cardMessage: '检测到系统已有新版本发布，建议在方便时刷新以获取最新功能与修复。',
  buildTimeLabel: '发布时间',
  deferOptionText: '2小时内不再提醒'
}

const state = reactive<VersionUpdateState>({
  initialized: false,
  checking: false,
  hasPendingUpdate: false,
  indicatorVisible: false,
  latestBuildId: '',
  latestVersion: '',
  latestBuildTime: '',
  remindAt: 0,
  pollInterval: DEFAULT_POLL_INTERVAL,
  remindDelay: DEFAULT_REMIND_DELAY,
  enableIndicator: true,
  enableFocusCheck: true,
  enableVisibilityCheck: true,
  anchor: DEFAULT_ANCHOR,
  refreshStrategy: 'auto',
  debug: false,
  title: DEFAULT_TEXTS.title,
  message: DEFAULT_TEXTS.message,
  confirmText: DEFAULT_TEXTS.confirmText,
  cancelText: DEFAULT_TEXTS.cancelText,
  indicatorText: DEFAULT_TEXTS.indicatorText,
  indicatorTitle: DEFAULT_TEXTS.indicatorTitle,
  cardTitle: DEFAULT_TEXTS.cardTitle,
  cardMessage: DEFAULT_TEXTS.cardMessage,
  buildTimeLabel: DEFAULT_TEXTS.buildTimeLabel,
  deferOptionText: DEFAULT_TEXTS.deferOptionText
})

const runtimeOptions: Required<
  Pick<
    VersionUpdateOptions,
        | 'enableIndicator'
    | 'enableFocusCheck'
    | 'enableVisibilityCheck'
    | 'anchor'
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
    | 'devMock'
    | 'timeFormatter'
    | 'onUpdateDetected'
    | 'onUpdateDeferred'
    | 'onUpdateConfirmed'
    | 'onRefresh'
  > & {
    runtimeEnv: VersionRuntimeEnv
    texts: VersionUpdateTexts | VersionUpdateTextsResolver
  } = {
  enableIndicator: true,
  enableFocusCheck: true,
  enableVisibilityCheck: true,
  anchor: DEFAULT_ANCHOR,
  pollInterval: DEFAULT_POLL_INTERVAL,
  remindDelay: DEFAULT_REMIND_DELAY,
  refreshStrategy: 'auto',
  debug: false,
  versionUrl: DEFAULT_VERSION_URL,
  storagePrefix: DEFAULT_STORAGE_PREFIX,
  runtimeEnv: {},
  devMock: false,
  timeFormatter: undefined,
  texts: DEFAULT_TEXTS,
  onUpdateDetected: undefined,
  onUpdateDeferred: undefined,
  onUpdateConfirmed: undefined,
  onRefresh: undefined
}

let timerId: number | null = null
let focusHandler: (() => void) | null = null
let visibilityHandler: (() => void) | null = null

function isDevMockEnabled() {
  return new URLSearchParams(window.location.search).get(DEV_MOCK_QUERY_KEY) === '1'
}

function readGlobalString(name: '__APP_VERSION__' | '__APP_BUILD_ID__' | '__APP_BUILD_TIME__') {
  const value = (globalThis as Record<string, unknown>)[name]
  return typeof value === 'string' ? value : ''
}

function getRuntimeEnv() {
  const devMockEnabled = runtimeOptions.devMock && isDevMockEnabled()
  return {
    version: runtimeOptions.runtimeEnv.version || readGlobalString('__APP_VERSION__'),
    buildId: devMockEnabled
      ? DEV_MOCK_BUILD_ID
      : runtimeOptions.runtimeEnv.buildId || readGlobalString('__APP_BUILD_ID__'),
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
    version: manifest?.version || state.latestVersion || env.version || '',
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

function formatBuildTime(buildTime?: string) {
  if (!buildTime) {
    return ''
  }

  if (runtimeOptions.timeFormatter) {
    return runtimeOptions.timeFormatter(buildTime)
  }

  return buildTime
}

function syncTextState() {
  const texts = resolveTexts()
  state.title = texts.title
  state.message = texts.message
  state.confirmText = texts.confirmText
  state.cancelText = texts.cancelText
  state.indicatorText = texts.indicatorText
  state.indicatorTitle = texts.indicatorTitle
  state.cardTitle = texts.cardTitle
  state.cardMessage = texts.cardMessage
  state.buildTimeLabel = texts.buildTimeLabel
  state.deferOptionText = texts.deferOptionText
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
  state.remindAt = 0
  syncTextState()
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

  if (runtimeOptions.devMock && isDevMockEnabled()) {
    logDebug('开发 mock 模式下拦截真实刷新', { buildId })
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
  syncTextState()
  state.hasPendingUpdate = true
  state.indicatorVisible = state.enableIndicator
  state.latestBuildId = manifest.buildId
  state.latestVersion = manifest.version || ''
  state.latestBuildTime = formatBuildTime(manifest.buildTime)
}

async function emitDetected(manifest: VersionManifest) {
  if (!runtimeOptions.onUpdateDetected) {
    return
  }

  await runtimeOptions.onUpdateDetected(getUpdateContext(manifest))
}

async function showUpdatePrompt(manifest: VersionManifest, force = false) {
  const remindAt = Number(localStorage.getItem(getStorageKey('version_remind_at')) || '0')
  state.remindAt = remindAt
  // 命中稍后提醒冷却期时，只保留入口，不自动重新展开面板。
  if (!force && Date.now() < remindAt) {
    updatePendingState(manifest)
    logDebug('命中提醒冷却期，保留待更新入口', { remindAt, manifest })
    return
  }

  updatePendingState(manifest)
  localStorage.setItem(getStorageKey('pending_version'), manifest.buildId)
  logDebug(force ? '用户主动触发更新面板' : '已记录待更新状态', manifest)
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
      syncTextState()
      void checkVersion()
    }
    window.addEventListener('focus', focusHandler)
  }

  if (state.enableVisibilityCheck) {
    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        syncTextState()
        void checkVersion()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  if (state.pollInterval > 0) {
    timerId = window.setInterval(() => {
      syncTextState()
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
}

export function setVersionUpdateRuntimeEnv(runtimeEnv: VersionRuntimeEnv) {
  runtimeOptions.runtimeEnv = {
    ...runtimeOptions.runtimeEnv,
    ...runtimeEnv
  }
  refreshVersionUpdateTexts()
}

export function refreshVersionUpdateTexts() {
  syncTextState()
}

export function initVersionUpdate(options: VersionUpdateOptions = {}) {
  if (state.initialized) {
    logDebug('版本更新服务已经初始化，忽略重复调用')
    return
  }

  runtimeOptions.pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL
  runtimeOptions.remindDelay = options.remindDelay ?? DEFAULT_REMIND_DELAY
  runtimeOptions.enableIndicator = options.enableIndicator ?? true
  runtimeOptions.enableFocusCheck = options.enableFocusCheck ?? true
  runtimeOptions.enableVisibilityCheck = options.enableVisibilityCheck ?? true
  runtimeOptions.anchor = options.anchor ?? DEFAULT_ANCHOR
  runtimeOptions.versionUrl = options.versionUrl ?? DEFAULT_VERSION_URL
  runtimeOptions.storagePrefix = options.storagePrefix ?? DEFAULT_STORAGE_PREFIX
  runtimeOptions.refreshStrategy = options.refreshStrategy ?? 'auto'
  runtimeOptions.debug = options.debug ?? false
  runtimeOptions.devMock = options.devMock ?? false
  runtimeOptions.timeFormatter = options.timeFormatter
  runtimeOptions.runtimeEnv = {
    ...runtimeOptions.runtimeEnv,
    ...(options.runtimeEnv || {})
  }
  runtimeOptions.onUpdateDetected = options.onUpdateDetected
  runtimeOptions.onUpdateDeferred = options.onUpdateDeferred
  runtimeOptions.onUpdateConfirmed = options.onUpdateConfirmed
  runtimeOptions.onRefresh = options.onRefresh
  runtimeOptions.texts = options.texts ?? DEFAULT_TEXTS

  state.initialized = true
  state.pollInterval = runtimeOptions.pollInterval
  state.remindDelay = runtimeOptions.remindDelay
  state.enableIndicator = runtimeOptions.enableIndicator
  state.enableFocusCheck = runtimeOptions.enableFocusCheck
  state.enableVisibilityCheck = runtimeOptions.enableVisibilityCheck
  state.anchor = runtimeOptions.anchor
  state.refreshStrategy = runtimeOptions.refreshStrategy
  state.debug = runtimeOptions.debug
  syncTextState()

  logDebug('版本更新服务初始化完成', {
    pollInterval: state.pollInterval,
    remindDelay: state.remindDelay,
    enableIndicator: state.enableIndicator,
    enableFocusCheck: state.enableFocusCheck,
    enableVisibilityCheck: state.enableVisibilityCheck,
    anchor: state.anchor,
    refreshStrategy: state.refreshStrategy,
    versionUrl: runtimeOptions.versionUrl,
    storagePrefix: runtimeOptions.storagePrefix,
    runtimeEnv: getRuntimeEnv(),
    devMock: runtimeOptions.devMock,
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
  logDebug('版本更新服务已销毁')
}

export async function confirmVersionUpdate() {
  if (!state.hasPendingUpdate || !state.latestBuildId) {
    return
  }

  const context = getUpdateContext({
    buildId: state.latestBuildId,
    version: state.latestVersion,
    buildTime: state.latestBuildTime
  })

  if (runtimeOptions.onUpdateConfirmed) {
    await runtimeOptions.onUpdateConfirmed(context)
  }

  await applyUpdate(context.buildId)
}

export async function deferVersionUpdate(duration = state.remindDelay) {
  if (!state.hasPendingUpdate || !state.latestBuildId) {
    return
  }

  state.remindAt = duration > 0 ? Date.now() + duration : 0

  if (state.remindAt > 0) {
    localStorage.setItem(getStorageKey('version_remind_at'), String(state.remindAt))
  } else {
    localStorage.removeItem(getStorageKey('version_remind_at'))
  }

  if (runtimeOptions.onUpdateDeferred) {
    await runtimeOptions.onUpdateDeferred(
      getUpdateContext({
        buildId: state.latestBuildId,
        version: state.latestVersion,
        buildTime: state.latestBuildTime
      })
    )
  }
}

export function requestVersionUpdate() {
  if (!state.hasPendingUpdate || !state.latestBuildId) {
    return
  }

  syncTextState()

  const context = getUpdateContext({
    buildId: state.latestBuildId,
    version: state.latestVersion,
    buildTime: state.latestBuildTime
  })

  Promise.resolve(runtimeOptions.onUpdateConfirmed?.(context))
    .then(() => applyUpdate(context.buildId))
    .catch((error) => {
      console.error('[version-update] 手动触发更新失败', error)
    })
}


export function useVersionUpdate() {
  return {
    ...toRefs(readonly(state)),
    confirmVersionUpdate,
    deferVersionUpdate,
    requestVersionUpdate,
    refreshVersionUpdateTexts
  }
}





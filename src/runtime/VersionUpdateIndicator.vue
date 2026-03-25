<template>
  <div ref="rootRef" class="version-update-indicator" :class="[`version-update-indicator--${mode}`]">
    <slot v-bind="slotProps">
      <template v-if="isRightEdgeAnchor">
        <Teleport to="body">
          <div
            v-if="indicatorVisible"
            ref="panelRef"
            class="version-update-right-edge-shell"
            :class="{ 'version-update-right-edge-shell--open': panelVisible }"
            :style="rightEdgeShellStyle"
            role="dialog"
            :aria-label="cardTitle"
          >
            <button
              ref="sideTabRef"
              class="version-update-side-tab"
              type="button"
              :title="indicatorTitle"
              :aria-label="indicatorTitle"
              @click="togglePanel"
            >
              <span v-if="showSideTab" class="version-update-side-tab__dot"></span>
              <svg class="version-update-side-tab__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 4.75v8.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
                <path
                  d="M8.75 10.5L12 13.75l3.25-3.25"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
                <path
                  d="M5.75 15.5a1.75 1.75 0 0 1 1.75-1.75h9a1.75 1.75 0 0 1 1.75 1.75v1a1.75 1.75 0 0 1-1.75 1.75h-9a1.75 1.75 0 0 1-1.75-1.75z"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
              <span class="version-update-side-tab__text">{{ sideTabText }}</span>
            </button>

            <div
              class="version-update-panel"
              :class="['version-update-panel--right-edge']"
              :style="rightEdgePanelStyle"
            >
              <div class="version-update-panel__header">
                <div>
                  <div class="version-update-panel__title">{{ cardTitle }}</div>
                  <div v-if="showVersion && latestVersion" class="version-update-panel__version">v{{ latestVersion }}</div>
                </div>
                <button class="version-update-panel__close" type="button" aria-label="关闭更新卡片" @click="closePanel">
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div class="version-update-panel__message">{{ cardMessage }}</div>

              <div v-if="showBuildTime && latestBuildTime" class="version-update-panel__meta">
                <span>{{ buildTimeLabel }}</span>
                <span>{{ latestBuildTime }}</span>
              </div>

              <label v-if="showDeferOption" class="version-update-panel__defer-option">
                <input v-model="suppressAutoOpen" type="checkbox" />
                <span>{{ deferOptionText }}</span>
              </label>

              <div class="version-update-panel__actions">
                <button class="version-update-panel__button version-update-panel__button--secondary" type="button" @click="handleDefer">
                  {{ cancelText }}
                </button>
                <button class="version-update-panel__button version-update-panel__button--primary" type="button" @click="handleConfirm">
                  {{ confirmText }}
                </button>
              </div>
            </div>
          </div>
        </Teleport>
      </template>

      <template v-else>
        <button
          ref="triggerRef"
          class="version-update-indicator__trigger"
          type="button"
          :title="indicatorTitle"
          :aria-label="indicatorTitle"
          :aria-expanded="panelVisible"
          @click="togglePanel"
        >
          <span class="version-update-indicator__ring"></span>
          <svg class="version-update-indicator__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 4.75v8.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
            <path
              d="M8.75 10.5L12 13.75l3.25-3.25"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
            <path
              d="M5.75 15.5a1.75 1.75 0 0 1 1.75-1.75h9a1.75 1.75 0 0 1 1.75 1.75v1a1.75 1.75 0 0 1-1.75 1.75h-9a1.75 1.75 0 0 1-1.75-1.75z"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
          <span class="version-update-indicator__dot"></span>
          <span v-if="mode === 'tag'" class="version-update-indicator__text">{{ indicatorText || '发现新版本' }}</span>
        </button>

        <Teleport to="body">
          <transition name="version-update-popover-fade">
            <div
              v-if="panelVisible"
              ref="panelRef"
              class="version-update-panel version-update-panel--header"
              :style="panelStyle"
              role="dialog"
              :aria-label="cardTitle"
            >
              <div class="version-update-panel__arrow" :style="arrowStyle"></div>
              <div class="version-update-panel__header">
                <div>
                  <div class="version-update-panel__title">{{ cardTitle }}</div>
                  <div v-if="showVersion && latestVersion" class="version-update-panel__version">v{{ latestVersion }}</div>
                </div>
                <button class="version-update-panel__close" type="button" aria-label="关闭更新卡片" @click="closePanel">
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div class="version-update-panel__message">{{ cardMessage }}</div>

              <div v-if="showBuildTime && latestBuildTime" class="version-update-panel__meta">
                <span>{{ buildTimeLabel }}</span>
                <span>{{ latestBuildTime }}</span>
              </div>

              <label v-if="showDeferOption" class="version-update-panel__defer-option">
                <input v-model="suppressAutoOpen" type="checkbox" />
                <span>{{ deferOptionText }}</span>
              </label>

              <div class="version-update-panel__actions">
                <button class="version-update-panel__button version-update-panel__button--secondary" type="button" @click="handleDefer">
                  {{ cancelText }}
                </button>
                <button class="version-update-panel__button version-update-panel__button--primary" type="button" @click="handleConfirm">
                  {{ confirmText }}
                </button>
              </div>
            </div>
          </transition>
        </Teleport>
      </template>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { confirmVersionUpdate, deferVersionUpdate, useVersionUpdate } from './service'
import type {
  VersionUpdateAnchor,
  VersionUpdateIndicatorMode,
  VersionUpdateIndicatorSlotProps
} from './types'

const DEFAULT_DEFER_OPTION_DURATION = 2 * 60 * 60 * 1000
const PANEL_WIDTH = 320
const SIDE_TAB_WIDTH = 40
const PANEL_OFFSET = 12
const VIEWPORT_MARGIN = 16

const props = withDefaults(
  defineProps<{
    mode?: VersionUpdateIndicatorMode
    autoOpen?: boolean
    showDeferOption?: boolean
    showBuildTime?: boolean
    showVersion?: boolean
    deferOptionDuration?: number
    anchor?: VersionUpdateAnchor
    sideTabText?: string
  }>(),
  {
    mode: 'icon',
    autoOpen: true,
    showDeferOption: false,
    showBuildTime: false,
    showVersion: false,
    deferOptionDuration: DEFAULT_DEFER_OPTION_DURATION,
    sideTabText: '待更新'
  }
)

const {
  requestVersionUpdate,
  indicatorTitle,
  indicatorText,
  hasPendingUpdate,
  indicatorVisible,
  latestVersion,
  latestBuildId,
  latestBuildTime,
  remindAt,
  anchor: defaultAnchor,
  cardTitle,
  cardMessage,
  buildTimeLabel,
  confirmText,
  cancelText,
  deferOptionText
} = useVersionUpdate()

defineSlots<{
  default?: (props: VersionUpdateIndicatorSlotProps) => any
}>()

const mode = computed(() => props.mode)
const resolvedAnchor = computed(() => props.anchor ?? defaultAnchor.value)
const isRightEdgeAnchor = computed(() => resolvedAnchor.value === 'right-edge')
const showDeferOption = computed(() => props.showDeferOption)
const showBuildTime = computed(() => props.showBuildTime)
const showVersion = computed(() => props.showVersion)
const panelWidth = computed(() => PANEL_WIDTH)
const rightEdgeShellWidth = computed(() => panelWidth.value + SIDE_TAB_WIDTH)
const showPanelArrow = computed(() => !isRightEdgeAnchor.value)

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const sideTabRef = ref<HTMLElement | null>(null)
const panelVisible = ref(false)
const suppressAutoOpen = ref(false)
const autoOpenedBuildId = ref('')
const panelPosition = ref({ top: 0, left: 0, arrowLeft: 0 })

const showSideTab = computed(() => hasPendingUpdate.value && indicatorVisible.value)

const slotProps = computed<VersionUpdateIndicatorSlotProps>(() => ({
  requestVersionUpdate,
  confirmVersionUpdate: () => {
    void confirmVersionUpdate()
  },
  deferVersionUpdate: (duration?: number) => {
    void deferVersionUpdate(duration)
  },
  openPanel: () => {
    void openPanel()
  },
  closePanel,
  panelVisible: panelVisible.value,
  indicatorTitle: indicatorTitle.value,
  indicatorText: indicatorText.value,
  hasPendingUpdate: hasPendingUpdate.value,
  indicatorVisible: indicatorVisible.value,
  latestVersion: latestVersion.value,
  latestBuildId: latestBuildId.value,
  latestBuildTime: latestBuildTime.value,
  remindAt: remindAt.value
}))

const panelStyle = computed(() => ({
  top: !isRightEdgeAnchor.value && panelPosition.value.top > 0 ? `${panelPosition.value.top}px` : undefined,
  left: panelPosition.value.left > 0 ? `${panelPosition.value.left}px` : undefined,
  width: `${panelWidth.value}px`
}))

const rightEdgeShellStyle = computed(() => ({
  width: `${rightEdgeShellWidth.value}px`,
  bottom: '24px'
}))

const rightEdgePanelStyle = computed(() => ({
  width: `${panelWidth.value}px`
}))

const arrowStyle = computed(() => ({
  left: `${panelPosition.value.arrowLeft}px`
}))

function updatePanelPosition() {
  if (isRightEdgeAnchor.value) {
    panelPosition.value = {
      top: 0,
      left: 0,
      arrowLeft: 0
    }
    return
  }

  const triggerElement = triggerRef.value
  if (!triggerElement) {
    return
  }

  const rect = triggerElement.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const triggerCenter = rect.left + rect.width / 2
  const preferredLeft = rect.right - panelWidth.value
  const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - panelWidth.value - VIEWPORT_MARGIN)
  const left = Math.min(Math.max(preferredLeft, VIEWPORT_MARGIN), maxLeft)
  const arrowLeft = Math.min(Math.max(triggerCenter - left, 24), panelWidth.value - 24)

  panelPosition.value = {
    top: rect.bottom + PANEL_OFFSET,
    left,
    arrowLeft
  }
}

function closePanel() {
  panelVisible.value = false
}

async function openPanel() {
  if (!hasPendingUpdate.value) {
    return
  }

  panelVisible.value = true
  await nextTick()
  updatePanelPosition()
}

function togglePanel() {
  if (panelVisible.value) {
    closePanel()
    return
  }

  void openPanel()
}

async function handleConfirm() {
  panelVisible.value = false
  await confirmVersionUpdate()
}

async function handleDefer() {
  panelVisible.value = false
  if (suppressAutoOpen.value) {
    await deferVersionUpdate(props.deferOptionDuration)
    return
  }

  await deferVersionUpdate(0)
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target) {
    closePanel()
    return
  }

  if (rootRef.value?.contains(target) || panelRef.value?.contains(target) || sideTabRef.value?.contains(target)) {
    return
  }

  closePanel()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

function handleViewportChange() {
  if (!panelVisible.value) {
    return
  }

  updatePanelPosition()
}

watch(
  () => latestBuildId.value,
  (buildId) => {
    if (!buildId) {
      autoOpenedBuildId.value = ''
      suppressAutoOpen.value = false
      closePanel()
      return
    }

    suppressAutoOpen.value = false

    if (!props.autoOpen || autoOpenedBuildId.value === buildId) {
      return
    }

    if (remindAt.value > Date.now()) {
      autoOpenedBuildId.value = buildId
      return
    }

    autoOpenedBuildId.value = buildId
    void openPanel()
  },
  { immediate: true }
)

watch(
  () => hasPendingUpdate.value,
  (pending) => {
    if (!pending) {
      closePanel()
    }
  }
)

watch(panelVisible, (visible) => {
  if (visible) {
    updatePanelPosition()
  }
})

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})
</script>

<style scoped lang="scss">
.version-update-indicator {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.version-update-indicator__trigger {
  border: none;
  background: transparent;
  color: #4b5563;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.version-update-indicator__trigger:hover {
  color: #ea580c;
  transform: translateY(-1px);
}

.version-update-indicator--icon .version-update-indicator__trigger {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.version-update-indicator--icon .version-update-indicator__trigger:hover {
  background: rgba(249, 115, 22, 0.08);
}

.version-update-indicator--tag .version-update-indicator__trigger {
  height: 32px;
  padding: 0 12px 0 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff8eb 0%, #fff2d9 100%);
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.16);
  color: #9a3412;
  gap: 6px;
}

.version-update-indicator--tag .version-update-indicator__trigger:hover {
  background: linear-gradient(135deg, #fff3df 0%, #ffe8c2 100%);
  box-shadow: 0 10px 22px rgba(234, 88, 12, 0.18);
}

.version-update-indicator__ring {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px solid rgba(249, 115, 22, 0.18);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.version-update-indicator--icon .version-update-indicator__trigger:hover .version-update-indicator__ring {
  opacity: 1;
}

.version-update-indicator__icon,
.version-update-side-tab__icon {
  width: 18px;
  height: 18px;
  flex: none;
}

.version-update-indicator__dot {
  width: 8px;
  height: 8px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #ef4444;
  position: absolute;
  top: 4px;
  right: 3px;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45);
  animation: version-update-dot-pulse 1.8s infinite;
}

.version-update-indicator--tag .version-update-indicator__dot {
  top: 5px;
  right: 6px;
}

.version-update-indicator__text {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.version-update-side-tab {
  position: relative;
  flex: none;
  width: 40px;
  min-height: 138px;
  padding: 14px 8px 12px;
  border: none;
  border-radius: 12px 0 0 12px;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  cursor: pointer;
  z-index: 9998;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.version-update-side-tab:hover {
  background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow: 0 16px 30px rgba(29, 78, 216, 0.24);
}

.version-update-side-tab__text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.5px;
  font-weight: 600;
  opacity: 0.92;
}

.version-update-side-tab__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fef08a;
  box-shadow: 0 0 0 0 rgba(254, 240, 138, 0.55);
  animation: version-update-dot-pulse-yellow 1.8s infinite;
}

.version-update-right-edge-shell {
  position: fixed;
  right: 0;
  bottom: 24px;
  display: inline-flex;
  align-items: flex-start;
  gap: 0;
  z-index: 9998;
  pointer-events: none;
  transition: transform 0.24s ease, opacity 0.2s ease;
  transform: translateX(calc(100% - 40px));
}

.version-update-right-edge-shell > * {
  pointer-events: auto;
}

.version-update-right-edge-shell--open {
  transform: translateX(0);
}

.version-update-panel {
  position: fixed;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  height: auto;
  min-height: 0;
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 18px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  border: 1px solid rgba(226, 232, 240, 0.9);
  z-index: 9999;
  line-height: normal;
}

.version-update-panel--header {
  position: fixed;
}

.version-update-panel--right-edge {
  position: relative;
  flex: none;
  margin-right: 0;
  border-radius: 12px 0 0 12px;
  border-right: none;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
}

.version-update-panel__arrow {
  position: absolute;
  top: -7px;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  border-left: 1px solid rgba(226, 232, 240, 0.9);
  transform: translateX(-50%) rotate(45deg);
}

.version-update-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.version-update-panel__title {
  color: #111827;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.version-update-panel__version {
  margin-top: 4px;
  color: #f97316;
  font-size: 12px;
  font-weight: 600;
}

.version-update-panel__close {
  border: none;
  background: transparent;
  color: #9ca3af;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.version-update-panel__close:hover {
  color: #4b5563;
  background: #f3f4f6;
}

.version-update-panel__message {
  color: #4b5563;
  font-size: 13px;
  line-height: 1.8;
}

.version-update-panel__meta {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.version-update-panel__defer-option {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}

.version-update-panel__defer-option input {
  margin: 0;
}

.version-update-panel__actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.version-update-panel__button {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.version-update-panel__button:hover {
  transform: translateY(-1px);
}

.version-update-panel__button--secondary {
  background: #f3f4f6;
  color: #4b5563;
}

.version-update-panel__button--secondary:hover {
  background: #e5e7eb;
}

.version-update-panel__button--primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.22);
}

.version-update-panel__button--primary:hover {
  box-shadow: 0 14px 24px rgba(37, 99, 235, 0.24);
}

.version-update-popover-fade-enter-active,
.version-update-popover-fade-leave-active,
.version-update-side-tab-fade-enter-active,
.version-update-side-tab-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.version-update-popover-fade-enter-from,
.version-update-popover-fade-leave-to,
.version-update-side-tab-fade-enter-from,
.version-update-side-tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}


@keyframes version-update-dot-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }

  70% {
    box-shadow: 0 0 0 7px rgba(239, 68, 68, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

@keyframes version-update-dot-pulse-yellow {
  0% {
    box-shadow: 0 0 0 0 rgba(254, 240, 138, 0.45);
  }

  70% {
    box-shadow: 0 0 0 8px rgba(254, 240, 138, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(254, 240, 138, 0);
  }
}
</style>

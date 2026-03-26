# vue3-version-update

`vue3-version-update` 是一个面向 `Vue 3` 管理后台与微前端子系统的运行时版本更新公共包。

它解决的是“前端如何发现新版本、如何以尽量不打断用户的方式提醒更新、以及用户确认后如何刷新到新版本”这件事。

## 当前定位

- 面向 `Vue 3` 项目
- 适合后台系统、中后台系统、微前端子系统
- 推荐搭配 `vite-version-manifest` 使用
- 不强依赖任何第三方 UI 组件库

## 当前支持的展示方案

当前版本只保留 2 套正式方案：

1. `anchor: 'header'`
   适用于有顶部导航栏的项目。
   交互是“顶部入口 + 轻量卡片 Popover”。

2. `anchor: 'right-edge'`
   适用于没有顶部栏，或者希望入口独立于页面布局存在的项目。
   交互是“右侧拉手 + 一体式侧边更新面板”。

## 安装

```bash
npm install vue3-version-update
```

## 快速开始

### 1. 初始化服务

```ts
import { initVersionUpdate } from 'vue3-version-update'

initVersionUpdate({
  anchor: 'right-edge'
})
```

### 2. 在布局中放置更新入口

```vue
<template>
  <VersionUpdateIndicator v-if="indicatorVisible" />
</template>

<script setup lang="ts">
import { VersionUpdateIndicator, useVersionUpdate } from 'vue3-version-update'

const { indicatorVisible } = useVersionUpdate()
</script>
```

## 运行时环境

如果项目使用 `vite-version-manifest`，当前版本信息通常会在开发与构建阶段自动注入，业务项目一般不需要手动传 `runtimeEnv`。  
如果不是 Vite 项目，也可以手动传入运行时环境：

```ts
initVersionUpdate({
  runtimeEnv: {
    version: window.__APP_VERSION__,
    buildId: window.__APP_BUILD_ID__,
    buildTime: window.__APP_BUILD_TIME__,
    baseUrl: '/'
  }
})
```

## API 总览

### `initVersionUpdate(options?)`

初始化版本更新服务。

### `destroyVersionUpdate()`

销毁版本更新服务，清理轮询、聚焦监听、可见性监听。  
适合微前端子系统卸载场景。

### `setVersionUpdateRuntimeEnv(runtimeEnv)`

动态设置当前运行环境版本信息。

### `refreshVersionUpdateTexts()`

当业务项目切换语言后，手动刷新当前文案。

### `useVersionUpdate()`

获取响应式状态和操作方法。

### `requestVersionUpdate()`

主动发起一次更新处理。

### `confirmVersionUpdate()`

直接确认并执行更新。

### `deferVersionUpdate(duration?)`

延后更新提醒。  
默认使用当前配置的 `remindDelay`。

## `initVersionUpdate(options)` 说明

```ts
interface VersionUpdateOptions {
  pollInterval?: number
  remindDelay?: number
  enableIndicator?: boolean
  enableFocusCheck?: boolean
  enableVisibilityCheck?: boolean
  anchor?: 'header' | 'right-edge'
  versionUrl?: string | (() => string)
  storagePrefix?: string
  refreshStrategy?: 'auto' | 'self' | 'top' | 'custom'
  debug?: boolean
  devMock?: boolean
  timeFormatter?: (buildTime: string) => string
  runtimeEnv?: {
    version?: string
    buildId?: string
    buildTime?: string
    baseUrl?: string
  }
  texts?: VersionUpdateTexts | (() => VersionUpdateTexts)
  onUpdateDetected?: (context) => void | Promise<void>
  onUpdateDeferred?: (context) => void | Promise<void>
  onUpdateConfirmed?: (context) => void | Promise<void>
  onRefresh?: (context) => void | Promise<void>
}
```

### 配置项说明

- `pollInterval`
  轮询间隔，默认 `5 * 60 * 1000`。

- `remindDelay`
  点击“稍后更新”后的默认冷却时间，默认 `10 * 60 * 1000`。

- `enableIndicator`
  是否显示更新入口。

- `enableFocusCheck`
  页面重新获得焦点时是否检查版本。

- `enableVisibilityCheck`
  页面从后台切回前台时是否检查版本。

- `anchor`
  默认展示方案。
  初始化后，`VersionUpdateIndicator` 不传 `anchor` 时会自动使用这里的值。

- `versionUrl`
  版本清单地址，默认 `version.json`。
  在 Wujie 等微前端场景下，组件会优先按子应用自己的运行地址解析该路径，而不是直接使用基座域名。

- `storagePrefix`
  本地存储前缀，用于隔离多项目缓存键。

- `refreshStrategy`
  刷新策略：
  - `auto`：独立运行刷新当前页，微前端场景刷新顶层页
  - `self`：始终刷新当前页
  - `top`：始终刷新顶层页
  - `custom`：由 `onRefresh` 接管

- `debug`
  是否输出调试日志。

- `devMock`
  是否启用开发环境 mock 预览能力。
  开启后，访问 `?__mock_version_update=1` 会继续请求 `version.json`，但运行时会临时伪造一个旧的本地构建标识，并拦截真实刷新，方便预览更新交互。

- `timeFormatter`
  自定义发布时间格式化函数。
  适合把 ISO 时间转为本地展示格式，也适合接入业务项目自己的多语言时间格式化逻辑。

- `runtimeEnv`
  当前运行环境版本信息。
  仅在未接入 `vite-version-manifest`，或需要手动覆盖运行环境时再传。

- `texts`
  自定义文案，支持对象或函数。

- `onUpdateDetected`
  检测到新版本时触发。

- `onUpdateDeferred`
  用户选择稍后更新时触发。

- `onUpdateConfirmed`
  用户确认立即更新时触发。

- `onRefresh`
  自定义刷新逻辑。

## `VersionUpdateIndicator` 组件

当前组件只支持两种展示方向：`header`、`right-edge`。

### Props

```ts
interface Props {
  mode?: 'icon' | 'tag'
  autoOpen?: boolean
  showDeferOption?: boolean
  showBuildTime?: boolean
  showVersion?: boolean
  deferOptionDuration?: number
  anchor?: 'header' | 'right-edge'
  sideTabText?: string
}
```

### Props 说明

- `mode`
  顶部入口样式，仅在 `anchor='header'` 时有意义。
  - `icon`：图标入口
  - `tag`：轻标签入口

- `autoOpen`
  检测到新版本后，是否自动展开当前入口对应的面板。

- `showDeferOption`
  是否显示“2小时内不再提醒”选项。
  默认 `false`。

- `showBuildTime`
  是否显示发布时间。
  默认 `false`。

- `showVersion`
  是否显示版本号。
  默认 `false`。

- `deferOptionDuration`
  勾选“2小时内不再提醒”时，实际写入的冷却时间。

- `anchor`
  展示方案：
  - `header`
  - `right-edge`

- `sideTabText`
  右侧拉手文案，默认 `待更新`。

## 插槽

`VersionUpdateIndicator` 支持默认插槽自定义展示层。

```vue
<VersionUpdateIndicator v-slot="slotProps" anchor="header">
  <button type="button" @click="slotProps.openPanel">
    {{ slotProps.indicatorText }}
  </button>
</VersionUpdateIndicator>
```

### 插槽参数

- `requestVersionUpdate`
  直接执行更新处理。

- `confirmVersionUpdate`
  直接确认更新。

- `deferVersionUpdate(duration?)`
  手动延后提醒。

- `openPanel`
  打开当前入口对应的更新面板。

- `closePanel`
  关闭更新面板。

- `panelVisible`
  当前面板是否已展开。

- `indicatorTitle`
  入口标题文案。

- `indicatorText`
  入口显示文案。

- `hasPendingUpdate`
  当前是否存在待更新版本。

- `indicatorVisible`
  当前入口是否可见。

- `latestVersion`
  当前检测到的最新版本号。可能为空。

- `latestBuildId`
  当前检测到的最新构建标识。

- `latestBuildTime`
  当前检测到的发布时间。可能为空。

- `remindAt`
  当前冷却截止时间戳。

## `useVersionUpdate()` 返回值

```ts
const {
  initialized,
  checking,
  hasPendingUpdate,
  indicatorVisible,
  latestBuildId,
  latestVersion,
  latestBuildTime,
  remindAt,
  confirmText,
  cancelText,
  cardTitle,
  cardMessage,
  deferOptionText,
  requestVersionUpdate,
  confirmVersionUpdate,
  deferVersionUpdate,
  refreshVersionUpdateTexts
} = useVersionUpdate()
```

## 文案配置

```ts
initVersionUpdate({
  texts: () => ({
    title: t('versionUpdate.title'),
    message: t('versionUpdate.message'),
    confirmText: t('versionUpdate.confirmText'),
    cancelText: t('versionUpdate.cancelText'),
    indicatorText: t('versionUpdate.indicatorText'),
    indicatorTitle: t('versionUpdate.indicatorTitle'),
    cardTitle: t('versionUpdate.cardTitle'),
    cardMessage: t('versionUpdate.cardMessage'),
    deferOptionText: t('versionUpdate.deferOptionText')
  })
})
```

## 推荐接法

### 方案一：有顶部栏项目

```vue
<VersionUpdateIndicator anchor="header" mode="icon" />
```

适用于常规后台布局。

### 方案二：无顶部栏项目

```vue
<VersionUpdateIndicator anchor="right-edge" sideTabText="待更新" />
```

适用于地图、大屏、全屏页、无全局顶部栏项目。

## 推荐策略

### 独立后台

```ts
initVersionUpdate({
  refreshStrategy: 'self'
})
```

### Wujie 子系统

```ts
initVersionUpdate({
  refreshStrategy: 'top'
})
```

说明：

- 当项目运行在 Wujie 子应用中时，`vue3-version-update` 会优先基于 `$wujie.location` 解析 `version.json`
- 推荐仍然搭配 `vite-version-manifest`，这样运行时还能自动拿到 `__APP_BASE_URL__`
- 如果基座与子应用跨域，`version.json` 仍然需要满足浏览器跨域要求；更稳的做法是让基座通过同域代理暴露一个 `versionUrl`

### 业务自己接管刷新

```ts
initVersionUpdate({
  refreshStrategy: 'custom',
  onRefresh() {
    window.top?.location.reload()
  }
})
```

## 版本清单格式

```json
{
  "buildId": "2026.03.25-1001",
  "version": "1.0.1",
  "buildTime": "2026-03-25T10:01:00.000Z"
}
```

说明：

- `buildId` 必填
- `version` 可选
- `buildTime` 可选

因此当没有版本号或发布时间时，默认 UI 不会显示对应字段。

## 行为说明

### “2小时内不再提醒”是否有效

有效。它只抑制自动再次弹出，不会隐藏更新入口。

也就是说：
- 勾选后，2 小时内系统不会自动重新展开面板
- 但用户仍然可以手动点击顶部入口或右侧拉手重新打开更新面板

### 为什么默认不强刷

因为后台系统经常有表单、弹窗、编辑态，自动强刷容易导致用户数据丢失。当前包默认采用“发现更新后提示用户自主刷新”的策略。

## 边界说明

当前包不负责：

- 构建期生成 `version.json`
- 生成 `buildId`
- 服务端缓存头配置

这些能力建议由 `vite-version-manifest` 和部署侧共同负责。

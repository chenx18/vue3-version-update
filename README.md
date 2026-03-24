# vue3-version-update

`vue3-version-update` 是一个面向 `Vue 3` 项目的运行时版本更新公共包，用于统一处理以下问题：

- 页面启动后主动检测是否已有新版本
- 轮询版本清单并在窗口重新聚焦、页面回到前台时补充检查
- 提供“立即更新 / 稍后更新”交互入口
- 提供顶部“待更新”标识组件
- 支持独立运行与微前端运行场景的不同刷新策略
- 支持业务项目通过可配置文案接入多语言体系
- 支持通过运行时环境配置降低对 Vite 的耦合
- 支持微前端卸载场景下的显式销毁
- 内置轻量默认弹窗，不依赖任何第三方 UI 库

## 适用范围

- Vue 3 项目
- 需要前端自行检测线上新版本的后台系统或管理端
- 希望统一“新版本提醒 + 用户确认刷新”机制的项目
- 推荐搭配 `vite-version-manifest` 使用，但不强制依赖它

## 安装

```bash
npm install vue3-version-update
```

## 快速开始

```ts
import { initVersionUpdate } from 'vue3-version-update'

initVersionUpdate()
```

## 运行时环境

如果项目使用 `vite-version-manifest`，当前版本信息通常会通过构建期自动注入。  
如果不是 Vite 项目，也可以通过 `runtimeEnv` 手动传入。

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

## 主要 API

### `initVersionUpdate(options?)`

初始化版本更新服务。

### `setVersionUpdateRuntimeEnv(runtimeEnv)`

动态设置当前运行环境的版本信息和基础路径。

### `destroyVersionUpdate()`

销毁版本更新服务，清理轮询和事件监听。适合微前端卸载场景。

### `refreshVersionUpdateTexts()`

在业务项目切换语言后，手动刷新当前文案。

### `useVersionUpdate()`

获取版本更新状态和交互方法。

### `requestVersionUpdate()`

主动发起一次更新处理流程。

### `VersionUpdateIndicator`

内置待更新标识组件。

## 默认弹窗说明

如果没有传 `dialogRenderer`，包内部会使用轻量 DOM 弹窗而不是 `window.confirm`。这样可以保证：

- 按钮文案可控
- 不依赖 Element Plus 等第三方 UI 库
- 默认交互比浏览器原生确认框更稳定

如果业务项目有自己的 UI 体系，仍然推荐通过 `dialogRenderer` 接管。

## 多语言文案

包本身不直接依赖 `vue-i18n`，而是通过 `texts` 配置让业务项目自行接入国际化。

```ts
initVersionUpdate({
  texts: () => ({
    title: t('versionUpdate.title'),
    message: t('versionUpdate.message'),
    confirmText: t('versionUpdate.confirmText'),
    cancelText: t('versionUpdate.cancelText'),
    indicatorText: t('versionUpdate.indicatorText'),
    indicatorTitle: t('versionUpdate.indicatorTitle')
  })
})
```

## 说明

这个包只负责运行时版本检测与 UI 状态，不负责构建期生成版本清单。  
如果项目使用 Vite，建议同时接入 `vite-version-manifest`。


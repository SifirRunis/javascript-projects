# JavaScript 项目集合

> 个人 JavaScript 练习与实验项目集合，涵盖可视化、8 位 CPU 模拟器、视频播放器等多种类型的小项目

## 目录

- [项目结构](#项目结构)
- [项目简介](#项目简介)
  - [Emitter](#emitter)
  - [Simple 8-bit CPU](#simple-8-bit-cpu)
  - [Video Player](#video-player)
  - [其他](#其他)
- [依赖库](#依赖库)
- [使用说明](#使用说明)

## 项目结构

```
JavaScript/
├── emitter/                   # 发射器/特效演示
│   ├── index.html
│   └── style.css
├── libs/                      # 第三方库
│   ├── echarts.min.js         # ECharts 图表库
│   └── tex-mml-chtml.js       # MathJax 数学公式渲染
├── simple-8bit-cpu/           # 简易 8 位 CPU 模拟器
│   ├── assembler.js           # 汇编器
│   ├── cpu.js                 # CPU 核心
│   ├── index.html
│   ├── main.js
│   └── style.css
├── video-player/              # 视频播放器
│   ├── integrated/            # 单文件版本
│   │   └── index.html
│   └── separated/             # 分离版本（HTML/JS/CSS 分离）
│       ├── index.html
│       ├── script.js
│       └── style.css
├── electron-toolbar-zh-cn.js  # Electron 工具栏中文化脚本
└── to-do.html                 # 待办事项应用
```

## 项目简介

### Emitter

一个基于 HTML + CSS 的发射器/粒子特效演示页面，可直接在浏览器中打开 `index.html` 查看

### Simple 8-bit CPU

一个用 JavaScript 实现的简易 8 位 CPU 模拟器，包含：

- **assembler.js**：简易汇编器，将汇编指令转换为机器码
- **cpu.js**：CPU 核心逻辑（寄存器、指令执行、内存等）
- **main.js**：界面交互与运行控制

打开 `index.html` 即可在浏览器中运行，适合学习计算机组成原理与指令执行流程

### Video Player

自定义视频播放器，提供两个版本：

- **integrated/**：单文件整合版本，HTML/CSS/JS 全部内联
- **separated/**：结构分离版本，HTML/CSS/JS 分文件组织，便于维护与扩展

直接打开对应目录下的 HTML 文件即可使用

### 其他

- **electron-toolbar-zh-cn.js**：用于将 Electron 应用工具栏菜单汉化的脚本
- **to-do.html**：一个简单的待办事项（To-Do List）网页应用，打开即用

## 依赖库

`libs/` 目录下存放项目共用的第三方库：

| 文件 | 说明 |
| --- | --- |
| `echarts.min.js` | [Apache ECharts](https://echarts.apache.org/) 数据可视化图表库 |
| `tex-mml-chtml.js` | [MathJax](https://www.mathjax.org/) 数学公式渲染库 |

## 使用说明

1. 克隆或下载本仓库到本地
2. 大部分项目为纯前端页面，直接用浏览器打开对应的 `index.html` / `*.html` 即可运行
3. 本仓库不包含视频文件，因版权原因，`video-player` 里的 mp4 需自行准备并放入对应目录

## 版权说明

本项目代码部分仅供个人学习与实验交流使用

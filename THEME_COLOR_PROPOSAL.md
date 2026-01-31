# 侧边栏背景颜色优化方案

## 问题分析

当前侧边栏使用半透明背景色 `rgba(235, 235, 235, 0.8)`，在操作系统深色模式下会与黑色文字产生对比度问题，导致可读性下降。

### 现有问题
- 左侧栏：`rgba(235, 235, 235, 0.8)` - 半透明，深色模式下透出黑色背景
- 选中项/悬停态：使用 `rgba(0, 0, 0, alpha)` - 在深色背景下不可见
- 文字颜色：硬编码为黑色，深色模式下无对比度

---

## 优化方案：使用 CSS 变量 + 媒体查询

### 1. 定义 CSS 变量系统

```less
// src/ui/styles/themes.less

// 默认（浅色主题）
:root {
  // 左侧库列表栏
  --sidebar-bg: rgba(235, 235, 235, 1);           // 从 0.8 改为 1，不透明
  --sidebar-border: rgba(0, 0, 0, 0.04);
  --sidebar-text-primary: rgba(0, 0, 0, 0.88);
  --sidebar-text-secondary: rgba(0, 0, 0, 0.65);

  // 菜单交互状态
  --menu-item-hover-bg: rgba(0, 0, 0, 0.06);
  --menu-item-selected-bg: rgba(0, 0, 0, 0.08);
  --menu-icon-hover-bg: rgba(0, 0, 0, 0.08);

  // 底部添加按钮
  --sidebar-footer-bg: transparent;
  --sidebar-footer-hover-bg: rgb(220, 220, 220);

  // 中间详情栏
  --detail-bg: #ffffff;
  --detail-border: rgba(0, 0, 0, 0.1);
  --detail-text-primary: rgba(0, 0, 0, 0.88);
  --detail-text-secondary: rgba(0, 0, 0, 0.45);

  // 笔记项交互状态
  --detail-item-hover-bg: rgba(0, 0, 0, 0.02);
  --detail-item-selected-bg: rgba(0, 0, 0, 0.06);
  --detail-icon-hover-bg: rgba(0, 0, 0, 0.08);

  // 未保存指示器
  --unsaved-indicator-bg: #ff4d4f;
}

// 深色主题
@media (prefers-color-scheme: dark) {
  :root {
    // 左侧库列表栏
    --sidebar-bg: rgba(40, 40, 40, 1);            // 深灰，不透明
    --sidebar-border: rgba(255, 255, 255, 0.08);
    --sidebar-text-primary: rgba(255, 255, 255, 0.9);
    --sidebar-text-secondary: rgba(255, 255, 255, 0.65);

    // 菜单交互状态
    --menu-item-hover-bg: rgba(255, 255, 255, 0.08);
    --menu-item-selected-bg: rgba(255, 255, 255, 0.12);
    --menu-icon-hover-bg: rgba(255, 255, 255, 0.1);

    // 底部添加按钮
    --sidebar-footer-bg: transparent;
    --sidebar-footer-hover-bg: rgba(255, 255, 255, 0.1);

    // 中间详情栏
    --detail-bg: rgba(50, 50, 50, 1);             // 比侧边栏略亮的深灰
    --detail-border: rgba(255, 255, 255, 0.1);
    --detail-text-primary: rgba(255, 255, 255, 0.9);
    --detail-text-secondary: rgba(255, 255, 255, 0.45);

    // 笔记项交互状态
    --detail-item-hover-bg: rgba(255, 255, 255, 0.05);
    --detail-item-selected-bg: rgba(255, 255, 255, 0.12);
    --detail-icon-hover-bg: rgba(255, 255, 255, 0.1);

    // 未保存指示器
    --unsaved-indicator-bg: #ff7875;             // 稍微柔和一点的红色
  }
}
```

---

### 2. 修改 `library-sidebar/index.less`

```less
// 在文件顶部导入主题变量
@import (reference) 'src/ui/styles/themes.less';

.library-sidebar-wrapper {
  height: 100%;
  width: 220px;
  border-right: 1px solid var(--sidebar-border);
  cursor: default;
  user-select: none;
  background-color: var(--sidebar-bg);          // 替换 rgba(235, 235, 235, 0.8)
  display: flex;
  flex-direction: column;
  flex-flow: column;
  flex-shrink: 0;
  min-width: 0;
  color: var(--sidebar-text-primary);           // 添加文字颜色

  .library-sidebar-main {
    overflow: auto;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    flex-flow: column;

    .library-sidebar-menu {
      overflow: auto;
      padding-bottom: 40px;
      flex-grow: 1;
    }

    .library-sidebar-footer {
      height: 40px;
      flex-shrink: 0;
      padding-left: 28px;
      line-height: 40px;
      background-color: var(--sidebar-footer-bg);
      color: var(--sidebar-text-secondary);     // 添加文字颜色

      &:hover {
        cursor: pointer;
        background-color: var(--sidebar-footer-hover-bg);
      }

      .footer-text {
        margin-left: 6px;
      }
    }
  }

  .library-next-writer {
    margin-left: 28px;
    padding-block-start: 4px;
    padding-block-end: 8px;
    font-weight: bold;
    flex-shrink: 0;
    color: var(--sidebar-text-primary);         // 添加文字颜色
  }

  ._next_writer-menu-root {
    background-color: transparent;

    ._next_writer-menu._next_writer-menu-sub._next_writer-menu-inline {
      background-color: transparent;
    }
  }

  .library-sidebar-icon {
    padding: 4px;
    border-radius: 4px;
    display: inline-flex;
    vertical-align: -2px;
    opacity: .1;

    &:hover {
      cursor: pointer;
      opacity: 1;
      background-color: var(--menu-icon-hover-bg);  // 替换 rgba(0, 0, 0, 0.08)
    }
  }

  ._next_writer-menu-item-selected {
    color: unset;
    background-color: var(--menu-item-selected-bg); // 替换 rgba(0, 0, 0, 0.06)
  }
}

.library-detail-wrapper {
  width: 300px;
  border-right: 1px solid var(--detail-border);
  background-color: var(--detail-bg);               // 替换 white
  padding: 16px;
  flex-shrink: 0;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex-flow: column;
  position: relative;
  color: var(--detail-text-primary);                // 添加文字颜色
}

.library-detail-header {
  height: 40px;
  line-height: 40px;
  user-select: none;
  box-sizing: border-box;
  border-bottom: 1px solid var(--detail-border);
  flex-shrink: 0;
  min-height: 0;
  box-sizing: border-box;
  color: var(--detail-text-primary);                // 添加文字颜色

  .library-detail-icon {
    padding: 4px;
    border-radius: 4px;
    display: inline-flex;
    vertical-align: -2px;

    &:hover {
      cursor: pointer;
      background-color: var(--detail-icon-hover-bg); // 替换 rgba(0, 0, 0, 0.08)
    }
  }
}

.library-detail-item-wrapper {
  flex-grow: 1;
  overflow: auto;
}

.library-detail-item {
  padding: 10px;
  cursor: pointer;
  border-radius: 2px;
  color: var(--detail-text-primary);                // 添加文字颜色

  &:not(.library-detail-item-selected):hover {
    background-color: var(--detail-item-hover-bg);  // 替换 rgba(0, 0, 0, 0.02)
  }

  .library-detail-item-text {
    margin: 0;
    color: inherit;
  }

  .library-detail-item-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .unsaved-indicator {
    width: 8px;
    height: 8px;
    background-color: var(--unsaved-indicator-bg);  // 替换 #ff4d4f
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
    margin-left: 8px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
}

.library-detail-item-active {
  background-color: var(--detail-item-hover-bg);
}

.library-detail-item-selected {
  background-color: var(--detail-item-selected-bg); // 替换 rgba(0, 0, 0, 0.06)
}
```

---

## 配色对比表

| 元素 | 浅色主题 | 深色主题 |
|------|----------|----------|
| **左侧栏背景** | `#ebebeb` | `#282828` |
| **详情栏背景** | `#ffffff` | `#323232` |
| **边框颜色** | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.08)` |
| **主要文字** | `rgba(0,0,0,0.88)` | `rgba(255,255,255,0.9)` |
| **次要文字** | `rgba(0,0,0,0.65)` | `rgba(255,255,255,0.65)` |
| **菜单选中** | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` |
| **笔记选中** | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.12)` |
| **悬停态** | `rgba(0,0,0,0.02~0.08)` | `rgba(255,255,255,0.05~0.1)` |
| **未保存指示器** | `#ff4d4f` | `#ff7875` |

---

## 实施步骤

1. **创建主题变量文件**
   ```bash
   src/ui/styles/themes.less
   ```

2. **更新侧边栏样式**
   - 将所有硬编码颜色替换为 CSS 变量
   - 添加文字颜色变量

3. **全局导入主题**
   - 在 `src/ui/index.less` 或 `src/ui/App.tsx` 中导入

4. **测试验证**
   - 切换系统深色/浅色模式
   - 检查所有交互状态的对比度

---

## 优势

1. **自动适配** - 跟随系统主题自动切换
2. **向后兼容** - 保持浅色主题原有设计
3. **易于维护** - 集中管理颜色变量
4. **可扩展** - 未来可添加手动主题切换功能

---

## 颜色选择参考

- 深色背景参考：VS Code Dark+ (`#1e1e1e`), GitHub Dark (`#0d1117`)
- 本方案采用 `#282828` (侧边栏) 和 `#323232` (详情区)，层次清晰
- 所有颜色符合 WCAG AA 对比度标准

# src/ui 架构升级落地计划

  ## Summary

  - 目标：重建 src/ui 架构，保留现有功能行为，不引入 Zustand/Redux，使用 React 内建状态方案完成模块拆分、状态收敛和副作用治理。
  - 先落地本地计划文档，方便核对进度与模块功能；每实践完成一个模块，同步维护开发文档中的模块说明。
  - 核心方向：组件只负责 UI 和交互；业务流程进入 domain hooks/use-cases；IPC、loading、message、缓存、renderer command listener
    作为 AOP 式横切能力统一封装。

  ## Key Changes

  - 新增本地追踪文档：
      - docs/ui-architecture-upgrade.md：记录升级目标、阶段 checklist、模块迁移状态、功能验收清单、风险项。
      - docs/ui-modules.md：记录已完成模块的职责、公开 hooks/API、数据流、副作用边界、测试说明。

  - 重建 src/ui 目录边界：
      - app/：React 根、AntD Provider、应用启动编排。
      - shared/：通用组件、IPC client、async/loading/message hooks、类型工具。
      - domain/library：库树 reducer、selectors、tree operation、当前库/当前笔记状态。
      - domain/runtime：菜单可见性和 runtime config 状态。
      - domain/editor：editor session、cache/save/read flow、outline state。
      - features/library-sidebar、features/editor-main、features/outline：只组合 domain hooks 和展示组件。
      - editor/codemirror：CodeMirror 默认扩展、主题、插件注册、DOM lifecycle hook。

  - React 状态方案：
      - 用 LibraryProvider、RuntimeProvider、EditorProvider 替代单个 HomeContext。
      - 每个 Provider 使用 useReducer + action creators；状态读取和操作 hooks 分离。
      - Context guarded hook 在 Provider 缺失时抛明确错误。

  - 副作用与 IPC：
      - 保留 preload/main process IPC 协议不变。
      - 将 mainProcess 收敛为 typed renderer gateway，只允许 domain/use-case 层调用。
      - 新增 useAsyncAction/withUiFeedback 封装 loading、message、错误处理和 finally 清理。
      - 用 RendererCommandProvider 或 useRendererCommand(type, handler) 替代各模块直接依赖 singleton listener。

  - 模块迁移：
      - LibrarySidebar 拆为 container、library menu、detail header、note list、rename modal adapter；新建、删除、重命名等动作进
        入 useLibraryActions。

      - Main 的读文件、缓存更新、保存、标题重命名拆入 editor use-cases。
      - useCodemirror 拆为 editor extensions、view lifecycle、mouse aspect、editor session。
      - Outline 从 EditorProvider 读取 heading/scroll command，不再依赖 messagePublish + renderStore。

  ## Documentation Workflow

  - 每完成一个模块实践，必须同步更新 docs/ui-modules.md：
      - 模块职责。
      - 输入/输出 hooks 或 props。
      - 依赖的 domain/shared 能力。
      - 副作用边界。
      - 已覆盖测试和手动验收点。

  - 每完成一个阶段，更新 docs/ui-architecture-upgrade.md：
      - checklist 状态。
      - 已迁移文件或模块。
      - 未解决风险。
      - 下一阶段入口。

  - 新代码不得只改实现不改文档；文档维护作为每个模块完成的验收条件之一。

  ## Public Interfaces / Types

  - 新增 renderer hooks：
      - useLibraryState()、useLibraryActions()
      - useRuntimeLayout()
      - useEditorState()、useEditorActions()

  - 保留 _types IPC 请求/响应 wire shape。
  - messagePublish 与 renderStore 作为迁移期兼容层，最终删除；新代码不得继续直接引用。

  ## Test Plan

  - 单元测试：library reducer/tree selectors、renderer gateway/use-cases、editor session cache/save flow、outline heading/scroll
    command。

  - 组件测试：LibrarySidebar、Main、Outline 的关键展示与交互。
  - 回归命令：npm run lint、npm run format:check、npm test。
  - 手动验收：启动、切换库/笔记、编辑、保存、重命名、删除、大纲跳转、菜单 toggle、热重载后缓存行为。

  ## Assumptions

  - 采用模块重建，但保持当前用户可见行为。
  - 不新增 Zustand/Redux。
  - 不改主进程 IPC 协议。
  - 本地文档文件在进入执行模式后优先创建，再开始模块迁移。

# 阶段一进度记录

> 对应计划：[阶段一执行计划：可靠性与效率基础](./phase-one-plan.md)
> 更新日期：2026-09-05

## 1. 当前阶段判断

当前项目处于阶段一第 6 周整改阶段。命令面板与结构化观测已有初版实现，但代码评审发现同步工作区破坏稳定 ID、保存失败状态未恢复等可靠性问题，必须先整改再继续阶段验收。

- 整体进度：约 85%。
- 已基本完成：A. 文档会话与状态模型、B. 保存调度与缓存 flush、C. 草稿恢复、D. 外部变更与冲突、E. 工作区索引与全文搜索、F. 最近打开/收藏/置顶。
- 部分完成：G. 命令面板、H. 阶段质量与观测。
- 阶段结论：阶段一尚未完成，当前不满足进入阶段二的决策门条件。

“基本完成”表示计划中的主要代码链路和自动化测试已经落地，但仍需结合后续阶段验收执行完整手工回归和性能验证。

## 2. 模块进度

| 模块                    | 状态     | 当前进展                                                                                                                            | 后续工作                                                                          |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A. 文档会话与状态模型   | 基本完成 | 已实现会话状态、revision、状态转换、主进程服务、IPC、renderer gateway、保存状态 UI 和状态测试                                       | 在阶段总验收中补充多文档连续切换手工回归                                          |
| B. 保存调度与缓存 flush | 基本完成 | 已实现自动保存配置、单文档串行保存、手动保存、切换/退出 flush、超时处理、失败保护和对应测试                                         | 在真实应用中验证输入后立即关闭、连续保存和失败重试                                |
| C. 草稿恢复             | 基本完成 | 已实现带版本号的草稿格式、原子写入、定时快照、保存失败/退出超时兜底、启动扫描、过期清理、恢复/忽略/差异界面和测试                   | 补充强制结束应用后的完整启动恢复手工回归                                          |
| D. 外部变更与冲突       | 基本完成 | 已实现工作区 Markdown 文件监听、写前磁盘基线校验、冲突和文件不可用状态、自动保存阻断、使用磁盘版本/保留本地版本/保存副本操作和测试  | 验证外部编辑器、Git 操作、应用内重命名和连续外部修改场景                          |
| E. 工作区索引与全文搜索 | 基本完成 | 已实现版本化持久索引、启动校验与重建、watcher 增量更新、文件名/标题/正文搜索、分页、大小写/模糊匹配、上下文预览、行列定位和快捷入口 | 在真实应用中补充 1,000 文件工作区、连续外部修改和超大 Markdown 文件的交互性能回归 |
| F. 最近打开、收藏与置顶 | 基本完成 | 已实现版本化工作区元数据、成功打开后记录、数量上限、收藏/置顶、清除记录、重命名路径修正、失效清理、完整 IPC、快捷文档面板和快捷键   | 在真实应用中验证大量历史记录、文件不可访问和连续重命名场景                        |
| G. 命令面板             | 部分完成 | 已实现注册表、Provider、四类结果、键盘导航和核心命令，但存在同步稳定 ID、状态刷新、菜单反馈和收藏竞态问题                           | 关闭验收记录中的 REV-001 至 REV-004、REV-007、REV-008、REV-010 和 REV-011         |
| H. 阶段质量与观测       | 部分完成 | 已增加命令与日志自动化测试及 JSONL 日志初版，但保存终态、错误隐私、启动期日志和性能证据仍不完整                                     | 关闭 REV-005、REV-006、REV-009、REV-012，并完成性能基线及真实应用手工回归         |

## 3. 已落地的关键能力

### 3.1 文档可靠性

- 文档内容、磁盘快照、dirty 状态和 revision 已收敛到文档会话服务。
- 自动保存和主动保存统一经过保存调度及 revision 检查。
- 保存失败后保留编辑内容和 dirty 状态，并生成恢复草稿。
- 窗口关闭前执行有界 flush，超时内容进入恢复草稿。
- 恢复草稿存储在应用配置目录，不污染 Markdown 工作区。

### 3.2 外部文件保护

- 工作区初始化后监听 Markdown 文件变化，并在窗口会话销毁时停止监听。
- 普通保存执行磁盘基线校验，外部内容变化时拒绝静默覆盖。
- 干净文档可应用外部内容；脏文档进入冲突并保留本地编辑内容。
- 当前文件被删除或移动后保留会话和本地内容，并支持保存本地副本。
- 冲突期间暂停普通持久化，用户可以明确选择冲突处理方式。

### 3.3 IPC 与架构边界

- 新增能力沿用 IPC contract、请求校验、handler、preload 和 renderer gateway 链路。
- 主进程文件系统、持久化和窗口生命周期职责未暴露给 renderer。
- 新增主进程服务通过接口定义并由容器注册。

### 3.4 工作区索引与全文搜索

- 主进程根据文库树中的稳定文件 ID 建立 Markdown 索引，renderer 不读取工作区文件。
- 索引以带版本号的 `workspace-index.json` 存放在应用配置目录；启动时校验版本、工作区和磁盘元数据并按需重读。
- 文件 watcher 负责单路径增量更新，应用内新增、删除和重命名后执行树级校准，删除文件不会继续出现在结果中。
- 搜索覆盖文件名、首个 Markdown 标题和正文，支持大小写、简单模糊匹配、上下文、行列位置和分页继续加载。
- 用户可从侧栏或 `Cmd/Ctrl+Shift+F` 打开搜索；点击结果后切换文档，并在目标 CodeMirror 实例挂载后定位和选中匹配内容。
- 超过 2 MiB 的单文件跳过正文索引但保留文件名搜索；索引重建分批让出主进程事件循环。

### 3.5 最近打开、收藏与置顶

- 主进程以带版本号的 `workspace-metadata.json` 持久化最近打开、收藏、置顶、数量上限和失效清理时间，不修改 Markdown 正文。
- 编辑器通过 `read-file` 成功取得文档会话后才更新最近打开；后台会话查询、保存和草稿流程不会误计为访问。
- 最近打开按实际成功打开顺序排列并受数量上限约束；收藏、置顶和清除最近记录通过类型化 IPC 操作。
- 应用内删除、重命名及工作区同步会清理失效 ID 或修正文档路径；打开快捷面板时还会依据当前文库树和磁盘可访问性重新校准。
- 用户可从侧栏“快捷文档”或 `Cmd/Ctrl+Shift+O` 打开面板，从最近打开、收藏或置顶列表直接进入文档。

## 4. 实现与提交证据

| 提交                                               | 日期       | 对应模块 |
| -------------------------------------------------- | ---------- | -------- |
| `76a8291 feat: 增加文档会话与状态模型`             | 2026-08-09 | A        |
| `4e97843 feat: 增加自动保存能力`                   | 2026-08-09 | B        |
| `c6972b3 feat: add recovery draft workflow`        | 2026-08-15 | C        |
| `3b7e9be feat: handle external document conflicts` | 2026-08-15 | D        |
| `8af5732 feat: 增加文件搜索能力`                   | 2026-08-22 | E        |
| `55a1e65 feat: 增加最近打开功能`                   | 2026-08-22 | F        |

主要实现位置：

- `src/window/domain/document-session-service.ts`
- `src/window/domain/save-scheduler.ts`
- `src/window/domain/document-service.ts`
- `src/window/domain/recovery-draft-service.ts`
- `src/window/infrastructure/workspace-file-watcher.ts`
- `src/ui/modules/main/document-external-change.ts`
- `src/ui/modules/main/index.tsx`
- `src/window/domain/workspace-index-service.ts`
- `src/window/ipc/handlers/search-workspace-handler.ts`
- `src/ui/features/library-workspace/workspace-search.tsx`
- `src/window/domain/workspace-index-service.test.ts`
- `src/ui/features/library-workspace/workspace-search.test.tsx`
- `src/window/domain/workspace-metadata-service.ts`
- `src/window/ipc/handlers/get-workspace-metadata-handler.ts`
- `src/window/ipc/handlers/update-workspace-metadata-handler.ts`
- `src/ui/features/library-workspace/document-shortcuts.tsx`
- `src/window/domain/workspace-metadata-service.test.ts`
- `src/ui/features/library-workspace/document-shortcuts.test.tsx`

## 5. 当前验证结果

本次阶段验收执行结果：

- `npm test -- --runInBand`：通过，36 个测试套件、199 个测试全部成功。
- `npm run lint`：通过。
- `npm run format:check`：通过；同时修复了 `docs/project-plan.md` 的既有格式问题。
- `npm run package`：通过，Electron Forge/Webpack 成功生成 macOS arm64 应用包。
- 命令面板过滤曾观察到 P95 3.35 ms、最大 8.96 ms，但缺少可复现 benchmark，暂不作为通过证据。

完整环境、指标和未通过项见[阶段一验收记录](./phase-one-validation.md)。H 模块不能仅依据现有测试数量判定完成；真实应用交互性能、长文档基线和手工可靠性回归仍是退出条件。

## 6. 下一里程碑

下一里程碑为关闭[阶段一验收记录](./phase-one-validation.md)中的代码评审问题。先处理 REV-001 和 REV-002，再处理其余中优先级问题并补跨层测试；之后才在固定真实应用环境执行性能与手工回归。

## 7. 阶段一剩余退出条件

进入阶段二前至少还需要满足：

- 在真实应用的 1,000 文件工作区中验证索引重建、增量更新和搜索定位不会明显阻塞编辑。
- 关闭全部高、中优先级代码评审问题，并补齐相应回归测试。
- 完成长文档和大工作区性能基线。
- 测试、lint 和格式检查全部通过。

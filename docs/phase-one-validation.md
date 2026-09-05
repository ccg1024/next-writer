# 阶段一验收记录

本文档记录阶段一退出条件的可复现验证环境、步骤、实测结果和未通过项。阶段状态以本页结果及[阶段一进度记录](./phase-one-progress.md)为准。

## 1. 验证环境

- 日期：2026-09-05
- 系统：macOS 26.5.1（Build 25F80），arm64
- Node.js：22.14.0
- npm：10.9.2
- 应用构建：Electron Forge + Webpack，macOS arm64
- 数据集：自动化测试生成的 1,000 篇 Markdown 文档；命令面板基准生成 1,000 个文档命令

## 2. 自动化与构建验证

在仓库根目录执行：

```sh
npm test -- --runInBand
npm run lint
npm run format:check
npm run package
```

最终结果见[阶段一进度记录](./phase-one-progress.md)。测试覆盖命令注册、匹配排序、禁用原因、并发执行保护、错误反馈、IPC 白名单裁剪、串行配置 patch、菜单状态显式赋值，以及 JSONL 日志的隐私、串行、轮转和失败隔离。

## 3. 性能结果

| 指标                        | 目标          | 测试方法                                     | 结果                                                       | 状态   |
| --------------------------- | ------------- | -------------------------------------------- | ---------------------------------------------------------- | ------ |
| 1,000 文件索引重建          | 不超过 5 秒   | 自动化临时工作区样本                         | 当前测试只约束“重建 + 搜索”小于 10 秒，未取得独立 5 次数据 | 未验收 |
| 工作区搜索 P95              | 不超过 100 ms | 固定 1,000 文件索引，至少 5 次               | 尚未在固定、预热后的真实应用环境记录                       | 未验收 |
| 命令面板过滤 1,000 文档 P95 | 不超过 50 ms  | 对真实 `CommandRegistry.list` 连续执行 20 次 | 曾观察到 P95 3.35 ms、最大 8.96 ms，但尚无可复现基准脚本   | 未验收 |
| 长文档输入 P95              | 不超过 50 ms  | Electron 中输入跟踪                          | 尚未执行                                                   | 未验收 |
| 连续主线程阻塞              | 不超过 100 ms | Electron Performance 记录                    | 尚未执行                                                   | 未验收 |

命令面板数字目前只能视为一次性本机观察。正式验收前需要提交可重复执行的基准脚本，固定数据生成、预热次数、采样次数、P95 计算方式和原始结果。

## 4. 手工回归清单

- [ ] 多文档连续切换和保存。
- [ ] 输入后立即退出并确认草稿恢复。
- [ ] 保存失败后重试。
- [ ] 外部修改、删除、Git 更新和保存副本。
- [ ] 命令面板、原生菜单和快捷键行为一致。
- [ ] 大量最近记录、失效文档和连续重命名。
- [ ] 所有阶段一命令均可从面板完成。

## 5. 代码评审未解决问题

评审日期：2026-09-05。三个携带完整任务上下文的子 agent 分别检查了 renderer、主进程与测试/验收；以下问题已经去重。状态均为“待修复”，关闭时必须补充对应自动化测试或可复现证据。

### 5.1 高优先级

#### REV-001：同步工作区破坏稳定文档 ID

- 证据：[`library-service.ts`](../src/window/domain/library-service.ts) 重扫磁盘时为全部节点生成新 UUID；[`synchronize-workspace-handler.ts`](../src/window/ipc/handlers/synchronize-workspace-handler.ts) 不再触发旧的窗口 reload；renderer 仅在 [`command-contributions.tsx`](../src/ui/features/command-palette/command-contributions.tsx) 替换文库树。
- 影响：当前选择和会话成为孤儿，最近记录与收藏可能被当作失效数据清除，旧搜索索引返回无法映射到新树的 ID。
- 关闭标准：同步时按规范化相对路径复用稳定 ID；同步成功后同步会话路径、元数据与搜索索引；增加成功同步后的树、session、metadata 和 index 跨层测试。

#### REV-002：保存失败后 renderer 可能停留在虚假的 `saving` 状态

- 证据：[`main/index.tsx`](../src/ui/modules/main/index.tsx) 在保存前设置 `saving`，失败后虽查询权威 session，但丢弃返回值并抛出错误。
- 影响：保存失败后状态标签、修改标记及后续交互不能恢复到主进程权威状态。
- 关闭标准：保存成功和失败均通过同一 helper 应用权威 session；覆盖写入失败、session 查询失败及切换文档期间失败的测试。

### 5.2 中优先级

#### REV-003：面板打开期间命令可用性不会刷新

- 证据：[`command/index.tsx`](../src/ui/domain/command/index.tsx) 更新 availability 闭包时不会使 registry 发出变更；[`command-palette.tsx`](../src/ui/features/command-palette/command-palette.tsx) 缓存了 `registry.list()` 返回的可用状态。
- 影响：编辑器就绪、当前文档变化或发生外部冲突后，保存等命令仍可能展示旧的禁用状态和原因。
- 关闭标准：提供显式 invalidate/update，或让 Hook 在可用性依赖变化时通知 registry；增加面板保持打开时状态变化的测试。

#### REV-004：原生菜单命令失败被静默吞掉

- 证据：[`home/index.tsx`](../src/ui/home/index.tsx) 未消费 `execute(id)` 的 `CommandExecutionResult`；[`menu-action-service.ts`](../src/window/menu/menu-action-service.ts) 使用无确认的单向消息。
- 影响：保存、同步或打字机命令失败时，菜单路径没有反馈；renderer 尚未就绪时命令可能丢失，checkbox 也可能与主进程状态脱节。
- 关闭标准：菜单与面板共用 execute-and-notify 流程；命令就绪前禁用菜单或增加确认机制；测试菜单成功、禁用和失败路径。

#### REV-005：保存日志的终态不完整或不准确

- 证据：[`document-service.ts`](../src/window/domain/document-service.ts) 的部分前置失败位于保存日志捕获范围之外，而 `persistLibTree` 失败可能发生在 `success` 已记录之后。
- 影响：日志可能只有孤立的 `start`，也可能在 IPC 最终失败时记录 `success`。
- 关闭标准：用覆盖完整持久化流程的单一边界保证每个 start 恰有一个 success/failure；增加无效 ID、冲突、旧 revision、磁盘写入和树元数据写入失败测试。

#### REV-006：日志错误文本仍可能泄露敏感信息

- 证据：[`app-logger.ts`](../src/window/infrastructure/app-logger.ts) 接受任意错误消息，仅以不完整的路径正则进行替换。
- 影响：搜索词、正文片段以及含空格路径的尾部可能进入日志。
- 关闭标准：改为受控错误代码或严格白名单分类，不直接持久化任意 message；覆盖含空格路径、Windows 路径、搜索词和正文片段的隐私测试。

#### REV-007：收藏命令存在 metadata 加载竞态

- 证据：[`command-contributions.tsx`](../src/ui/features/command-palette/command-contributions.tsx) 在 metadata 尚未加载或加载失败时仍允许执行，并默认提交 `value: true`。
- 影响：已收藏文档可能显示为“收藏当前文档”，且无法正确取消收藏。
- 关闭标准：metadata 未就绪时禁用并展示原因，显式建模 loading/error；覆盖打开面板后立即执行及刷新失败场景。

#### REV-008：命令贡献层集成测试不足

- 证据：[`command-palette.test.tsx`](../src/ui/features/command-palette/command-palette.test.tsx) 仅覆盖通用快捷键、焦点、一次键盘执行和 Escape；当前没有 `CommandContributions` 测试。
- 影响：最近记录排序、失效过滤、文档/主题执行、上下文禁用、状态切换刷新及菜单反馈等跨层问题无法被现有测试发现。
- 关闭标准：按阶段计划补齐 CommandContributions、领域 Context、renderer gateway 和菜单命令的集成测试。

#### REV-009：命令面板性能结果不可复现

- 证据：此前记录的命令只有注释占位；[`command-registry.test.ts`](../src/ui/domain/command/command-registry.test.ts) 实际仅采样 5 次并断言最大值小于 50 ms。
- 影响：无法从仓库重新得到“20 次、P95 3.35 ms”的结论，也不能作为阶段退出证据。
- 关闭标准：提交独立 benchmark 脚本及原始结果，至少固定数据集、预热、采样和 P95 算法；通过前保持“未验收”。

### 5.3 低优先级

#### REV-010：长列表键盘选择不会跟随滚动

- 影响：连续使用方向键时，当前高亮项可能移出可视区域；Input 也缺少 `aria-controls` 和 `aria-activedescendant` 关联。
- 关闭标准：选择变化时滚动 active option，并补长列表键盘与可访问性测试。

#### REV-011：主题失败会重复提示

- 影响：主题 Context 与命令面板会各显示一次相同错误。
- 关闭标准：统一错误展示职责，领域 action 只返回或抛出一次规范化错误。

#### REV-012：日志目录初始化前的全局错误会丢失

- 影响：HOME 缺失或其他早期启动异常只能显示对话框，不能写入结构化日志。
- 关闭标准：使用启动期固定日志目录，或先缓存在内存中并在路径初始化后刷出。

## 6. 当前结论

命令面板和结构化观测已经形成初版代码链路，但评审确认仍有两个高优先级可靠性问题及多个跨层缺口。所有高、中优先级评审项、真实 Electron 手工回归、索引/搜索独立性能数据和长文档输入基线完成前，阶段一保持“未完成”，不得据此进入阶段二。

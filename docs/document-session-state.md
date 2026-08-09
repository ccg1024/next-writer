# 文档会话状态说明

`DocumentSessionService` 是文档内容、磁盘快照、修改状态和 revision 的唯一事实来源。renderer 只通过
`get-document-session` 和 `update-document-session` 查询或提交会话 action；旧 `update-cache` IPC 仅作为兼容入口，
其缓存值也由会话快照派生。

## 核心不变量

- `content` 是最新编辑内容，`savedContent` 是最后一次成功写入磁盘的内容。
- `content !== savedContent` 表示文档存在未保存修改；UI 的修改标记不得只根据单个瞬时状态推断。
- `localRevision` 只在内容实际变化时递增。renderer 为每个文档同步生成单调 revision；主进程拒绝旧 revision
  以及使用当前 revision 提交冲突内容。读取、重复提交相同内容、切换文档和开始保存都不创建 revision。
- `savedRevision` 是磁盘快照对应的 revision，始终不大于 `localRevision`。
- 较旧保存完成时不得覆盖较新的 `content`，但必须更新 `savedContent`，使会话快照与真实磁盘保持一致。
- 会话以稳定的文档 `id` 隔离；文件或父目录重命名只更新 `path`，不改变内容和 revision。

## 状态转换

| 当前状态                                   | action                        | 下一状态                | 说明                                          |
| ------------------------------------------ | ----------------------------- | ----------------------- | --------------------------------------------- |
| 无会话                                     | load                          | `ready`                 | 从磁盘建立干净快照                            |
| `ready` / `saved`                          | updateContent（内容不同）     | `dirty`                 | 创建新的本地 revision                         |
| `dirty`                                    | updateContent（改回磁盘快照） | `saved`                 | 内容已与磁盘一致，无需写入                    |
| `ready` / `dirty` / `saved` / `save-error` | beginSave                     | `saving`                | 不创建内容 revision                           |
| `saving`                                   | completeSave（当前 revision） | `saved`                 | 同步内容、磁盘快照和保存时间                  |
| `saving` / `dirty`                         | completeSave（较旧 revision） | `saving` / `dirty`      | 保留较新编辑，同时更新真实磁盘快照            |
| `saving`                                   | failSave（当前 revision）     | `save-error`            | 保留编辑内容并记录错误                        |
| `dirty` / `saving`                         | failSave（较旧 revision）     | `save-error` / `saving` | 记录错误；若有较新保存仍在进行则保持 `saving` |

不在允许列表中的转换会抛出错误，避免调用方静默制造不一致状态。`external-change` 和 `conflict` 的完整 action
由阶段一模块 D 接入。

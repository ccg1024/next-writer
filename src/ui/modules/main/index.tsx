import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ViewUpdate } from '@codemirror/view';
import { App, Button, Modal, Typography } from 'antd';
import { DocumentSession, RecoveryDraft } from '_types';
import { isTrulyEmpty } from 'src/tools/utils';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import useCodemirror, { InitialEditorState } from 'src/ui/hooks/useCodemirror';
import { useRendererCommand } from 'src/ui/shared/renderer-command';
import { debounceFn } from 'src/ui/libs/utils';
import messagePublish from 'src/ui/libs/pub-sub';
import { nwSpin } from 'src/ui/mix-components/spin';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useEditorActions } from 'src/ui/domain/editor';
import { useRuntimeLayout } from 'src/ui/domain/runtime';
import { findRendererNodeById } from 'src/ui/libs/renderer-tree';

import './index.less';

const { Title } = Typography;

const MAX_DESCRIPTION_LENGTH = 100 as const;

/**
 * 当前笔记编辑区，负责 CodeMirror 生命周期、文档会话修订同步、保存命令和标题重命名。
 */
const Main: FC = () => {
  const { message } = App.useApp();
  const { currentNote, libraryTree } = useLibraryState();
  const { runtimeConfig } = useRuntimeLayout();
  const [initialEditorState, setInitialEditorState] = useState<InitialEditorState>(null);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const { patchCurrentNote, patchLibraryNode, renameNode, setLibraryTree } = useLibraryActions();
  const { setEditorView, syncOutlineFromView } = useEditorActions();
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<RecoveryDraft | null>(null);
  const [recoveryDiffVisible, setRecoveryDiffVisible] = useState(false);
  const sessionRef = useRef<DocumentSession | null>(null);
  const sessionRevisionsRef = useRef(new Map<string, number>());
  const sessionUpdatesRef = useRef(new Map<string, Promise<unknown>>());
  const autoSaveStatusTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const loadedNoteIdRef = useRef<string | undefined>(undefined);
  const activeNoteIdRef = useRef<string | undefined>(undefined);
  activeNoteIdRef.current = currentNote?.id;

  // 描述只用于侧栏预览，延迟更新可以避免每次按键都克隆整棵渲染树。
  const debounceDescriptionUpdate = useMemo(
    () =>
      debounceFn((note: NonNullable<typeof currentNote>, description: string) =>
        patchLibraryNode(note, { description })
      ),
    [patchLibraryNode]
  );

  const headInProcess = useRef<string>('');

  const updateDocumentSession = useCallback(
    (id: string, content: string) => {
      // 每篇笔记独立维护单调修订号，保证快速切换笔记或 IPC 乱序时不会回退会话。
      const revision = Math.max(sessionRevisionsRef.current.get(id) ?? 0, sessionRef.current?.localRevision ?? 0) + 1;
      sessionRevisionsRef.current.set(id, revision);
      const request = rendererGateway.updateDocumentSession({ id, content, revision }).then(res => {
        const currentSession = sessionRef.current;
        if (res.status === 0 && res.data) {
          sessionRevisionsRef.current.set(
            id,
            Math.max(sessionRevisionsRef.current.get(id) ?? 0, res.data.localRevision)
          );
        }
        if (
          res.status === 0 &&
          res.data &&
          activeNoteIdRef.current === id &&
          (!currentSession || currentSession.id !== id || res.data.localRevision >= currentSession.localRevision)
        ) {
          sessionRef.current = res.data;
          setSession(res.data);
          patchCurrentNote({ isChange: isDocumentSessionModified(res.data) });
        }
        const autoSave = runtimeConfig?.autoSave;
        if (res.status === 0 && autoSave?.enabled) {
          const currentTimer = autoSaveStatusTimersRef.current.get(id);
          if (currentTimer) {
            clearTimeout(currentTimer);
          }
          const statusTimer = setTimeout(async () => {
            const response = await rendererGateway.flushDocument({ id });
            if (response.status === 0 && activeNoteIdRef.current === id) {
              sessionRef.current = response.data.session;
              setSession(response.data.session);
              patchCurrentNote({ isChange: isDocumentSessionModified(response.data.session) });
              setLibraryTree(response.data.libTree);
            } else if (response.status !== 0 && activeNoteIdRef.current === id) {
              const sessionResponse = await rendererGateway.getDocumentSession({ id });
              if (sessionResponse.status === 0) {
                sessionRef.current = sessionResponse.data;
                setSession(sessionResponse.data);
                patchCurrentNote({ isChange: isDocumentSessionModified(sessionResponse.data) });
              }
            }
            if (autoSaveStatusTimersRef.current.get(id) === statusTimer) {
              autoSaveStatusTimersRef.current.delete(id);
            }
          }, autoSave.delayMs + 100);
          autoSaveStatusTimersRef.current.set(id, statusTimer);
        }
        return res;
      });
      sessionUpdatesRef.current.set(id, request);
      const clearPendingRequest = () => {
        if (sessionUpdatesRef.current.get(id) === request) {
          sessionUpdatesRef.current.delete(id);
        }
      };
      void request.then(clearPendingRequest, clearPendingRequest);
      return request;
    },
    [patchCurrentNote, runtimeConfig?.autoSave, setLibraryTree]
  );

  const onEditorDocChange = useCallback(
    (update: ViewUpdate) => {
      if (!currentNote?.id || sessionRef.current?.id !== currentNote.id) {
        return;
      }

      update.transactions.forEach(tr => {
        if (tr.changes) {
          tr.changes.iterChanges(fromA => {
            // 如果前 MAX_DESCRIPTION_LENGTH 个字符变化，则更新文件描述内容
            if (fromA <= MAX_DESCRIPTION_LENGTH) {
              const fullDoc = update.state.doc.toString();
              const doc =
                fullDoc.length > MAX_DESCRIPTION_LENGTH ? fullDoc.substring(0, MAX_DESCRIPTION_LENGTH) : fullDoc;
              // Must using debounce function
              debounceDescriptionUpdate(currentNote, doc);
            }
          });
        }
      });

      patchCurrentNote({ isChange: true });
      updateDocumentSession(currentNote.id, update.view.state.doc.toString());

      // 通知其他模块，文档变更
      syncOutlineFromView(update.view);
      messagePublish.pub('docChanged', update.view);
    },
    [currentNote?.id, patchCurrentNote, debounceDescriptionUpdate, updateDocumentSession, syncOutlineFromView]
  );

  const [divRef, editor] = useCodemirror<HTMLDivElement>({
    initialEditorState,
    onEditorDocChange,
    typewriterMode
  });

  const handleWriteFile = useCallback(() => {
    if (!editor || !currentNote?.id || sessionRef.current?.id !== currentNote.id) {
      return;
    }

    const content = editor.state.doc.toString();
    const noteId = currentNote.id;
    // 先显示 saving，再以主进程返回的权威会话校正文档状态。
    if (sessionRef.current) {
      const savingSession = { ...sessionRef.current, status: 'saving' as const };
      sessionRef.current = savingSession;
      setSession(savingSession);
    }
    nwSpin.loading(true);
    rendererGateway
      .writeFile({ id: noteId, content, revision: sessionRevisionsRef.current.get(noteId) })
      .then(res => {
        if (res.status !== 0) {
          message.error(res.message || '保存文件失败');
          return rendererGateway.getDocumentSession({ id: noteId });
        }

        setLibraryTree(res.data);
        return rendererGateway.getDocumentSession({ id: noteId });
      })
      .then(sessionResponse => {
        if (
          sessionResponse?.status === 0 &&
          sessionResponse.data &&
          activeNoteIdRef.current === noteId &&
          sessionRef.current?.id === noteId
        ) {
          sessionRef.current = sessionResponse.data;
          setSession(sessionResponse.data);
          patchCurrentNote({ isChange: isDocumentSessionModified(sessionResponse.data) });
        }
      })
      .finally(() => {
        nwSpin.loading(false);
      });
  }, [currentNote, editor, message, patchCurrentNote, setLibraryTree]);

  useRendererCommand('write-file', handleWriteFile);

  const handleRecoverDraft = useCallback(async () => {
    if (!currentNote?.id || !recoveryDraft) {
      return;
    }
    const noteId = currentNote.id;
    const response = await rendererGateway.recoverDraft({ id: noteId });
    if (response.status !== 0 || activeNoteIdRef.current !== noteId) {
      message.error(response.message || '恢复草稿失败');
      return;
    }

    sessionRef.current = response.data;
    sessionRevisionsRef.current.set(noteId, response.data.localRevision);
    setSession(response.data);
    setInitialEditorState({ initDoc: response.data.content });
    patchCurrentNote({ isChange: isDocumentSessionModified(response.data) });
    setRecoveryDraft(null);
    setRecoveryDiffVisible(false);
  }, [currentNote?.id, message, patchCurrentNote, recoveryDraft]);

  const handleDiscardRecoveryDraft = useCallback(async () => {
    if (!currentNote?.id) {
      return;
    }
    const noteId = currentNote.id;
    const response = await rendererGateway.discardRecoveryDraft({
      id: noteId,
      createdAt: recoveryDraft.createdAt,
      revision: recoveryDraft.revision
    });
    if (response.status !== 0) {
      message.error(response.message || '忽略草稿失败');
      return;
    }
    if (!response.data.success) {
      const latest = await rendererGateway.getRecoveryDraft({ id: noteId });
      if (latest.status === 0 && activeNoteIdRef.current === noteId) {
        setRecoveryDraft(latest.data);
      }
      message.warning('草稿已更新，请重新确认');
      return;
    }
    if (activeNoteIdRef.current === noteId) {
      setRecoveryDraft(null);
      setRecoveryDiffVisible(false);
    }
  }, [currentNote?.id, message, recoveryDraft]);

  useRendererCommand('toggle-typewriter-mode', (_e, action) => {
    setTypewriterMode(Boolean(action.payload));
  });

  useEffect(() => {
    setTypewriterMode(runtimeConfig?.menuStatus?.typewriterMode ?? false);
  }, [runtimeConfig?.menuStatus?.typewriterMode]);

  // 切换笔记时废弃上一次异步结果，防止慢请求把新编辑器替换成旧笔记内容。
  useEffect(() => {
    if (isTrulyEmpty(currentNote?.id)) {
      const previousId = loadedNoteIdRef.current;
      if (previousId) {
        const statusTimer = autoSaveStatusTimersRef.current.get(previousId);
        if (statusTimer) {
          clearTimeout(statusTimer);
          autoSaveStatusTimersRef.current.delete(previousId);
        }
        if (findRendererNodeById(libraryTree, previousId)) {
          void (async () => {
            await sessionUpdatesRef.current.get(previousId);
            const response = await rendererGateway.flushDocument({ id: previousId });
            if (response.status === 0) {
              setLibraryTree(response.data.libTree);
            } else {
              message.error(response.message || '切换文档前保存失败');
            }
          })();
        }
        loadedNoteIdRef.current = undefined;
      }
      sessionRef.current = null;
      setSession(null);
      setInitialEditorState(null);
      return;
    }

    sessionRef.current = null;
    setSession(null);
    setRecoveryDraft(null);
    setRecoveryDiffVisible(false);
    setInitialEditorState(null);
    let shouldUpdate = true;
    const readNote = async () => {
      const previousId = loadedNoteIdRef.current;
      if (previousId && previousId !== currentNote.id) {
        const statusTimer = autoSaveStatusTimersRef.current.get(previousId);
        if (statusTimer) {
          clearTimeout(statusTimer);
          autoSaveStatusTimersRef.current.delete(previousId);
        }
        await sessionUpdatesRef.current.get(previousId);
        const flushResponse = await rendererGateway.flushDocument({ id: previousId });
        if (flushResponse.status === 0) {
          setLibraryTree(flushResponse.data.libTree);
        } else {
          message.error(flushResponse.message || '切换文档前保存失败');
        }
      }
      if (!shouldUpdate) {
        return;
      }
      const { status, data } = await rendererGateway.getDocumentSession({ id: currentNote.id });
      if (shouldUpdate && status === 0) {
        sessionRevisionsRef.current.set(
          data.id,
          Math.max(sessionRevisionsRef.current.get(data.id) ?? 0, data.localRevision)
        );
        sessionRef.current = data;
        setSession(data);
        patchCurrentNote({ isChange: isDocumentSessionModified(data) });
        setInitialEditorState({ initDoc: data.content });
        loadedNoteIdRef.current = data.id;
        const draftResponse = await rendererGateway.getRecoveryDraft({ id: data.id });
        if (shouldUpdate && draftResponse.status === 0 && draftResponse.data?.content !== data.savedContent) {
          setRecoveryDraft(draftResponse.data);
        }
      }
    };

    readNote();
    return () => {
      shouldUpdate = false;
    };
  }, [currentNote?.id, message, patchCurrentNote, setLibraryTree]);

  useEffect(
    () => () => {
      autoSaveStatusTimersRef.current.forEach(timer => clearTimeout(timer));
      autoSaveStatusTimersRef.current.clear();
    },
    []
  );

  useEffect(() => {
    if (!editor) {
      setEditorView(null);
      syncOutlineFromView(null);
      return;
    }

    setEditorView(editor);
    syncOutlineFromView(editor);
    // 大纲等非父子模块通过共享状态和事件总线感知当前 EditorView。
    messagePublish.pub('editorChanged', editor);

    return () => {
      setEditorView(null);
      syncOutlineFromView(null);
    };
  }, [editor, setEditorView, syncOutlineFromView]);

  if (isTrulyEmpty(currentNote?.id)) {
    return (
      <div className="main-wrapper">
        <VerticalEmpty description="无笔记" style={{ paddingTop: '48px' }} />
        <div ref={divRef} className="next-writer-editor-wrapper" style={{ display: 'none' }}></div>
      </div>
    );
  }

  return (
    <div className="main-wrapper">
      <div className="main-header">
        <Title
          level={4}
          style={{ marginTop: 0 }}
          editable={{
            triggerType: ['text'],
            // editing: headEditState,
            onStart: () => {
              headInProcess.current = currentNote.name;
            },
            onChange: text => {
              headInProcess.current = text;
            },
            onEnd: () => {
              const nextName = headInProcess.current.trim();
              if (nextName !== currentNote.name) {
                nwSpin.loading(true);
                renameNode(currentNote, nextName)
                  .then(res => {
                    if (res.status === 0) {
                      setLibraryTree(res.data);
                    } else {
                      message.error(res.message || '重命名失败');
                    }
                  })
                  .finally(() => {
                    nwSpin.loading(false);
                  });
              }
              // Cleaning the data in process
              headInProcess.current = '';
            }
          }}
        >
          {currentNote.name}
        </Title>
        <span className={`document-session-status document-session-status-${session?.status ?? 'loading'}`}>
          {getSessionStatusLabel(session?.status)}
        </span>
        {session?.status === 'save-error' && <span className="document-session-error">{session.lastError}</span>}
      </div>
      {recoveryDraft && (
        <div className="recovery-draft-notice">
          <span>发现 {new Date(recoveryDraft.createdAt).toLocaleString()} 的未保存草稿</span>
          <Button type="link" size="small" onClick={handleRecoverDraft}>
            恢复草稿
          </Button>
          <Button type="link" size="small" onClick={() => setRecoveryDiffVisible(true)}>
            查看差异
          </Button>
          <Button type="link" size="small" danger onClick={handleDiscardRecoveryDraft}>
            忽略草稿
          </Button>
        </div>
      )}
      {/* put codemirror here */}
      <div
        ref={divRef}
        className="next-writer-editor-wrapper"
        style={session?.id === currentNote.id ? undefined : { display: 'none' }}
      ></div>
      <Modal
        title="草稿与磁盘内容"
        open={recoveryDiffVisible}
        footer={null}
        width={900}
        onCancel={() => setRecoveryDiffVisible(false)}
      >
        <div className="recovery-draft-diff">
          <section>
            <strong>磁盘版本</strong>
            <pre>{session?.savedContent}</pre>
          </section>
          <section>
            <strong>恢复草稿</strong>
            <pre>{recoveryDraft?.content}</pre>
          </section>
        </div>
      </Modal>
    </div>
  );
};

function getSessionStatusLabel(status?: DocumentSession['status']): string {
  switch (status) {
    case 'ready':
      return '就绪';
    case 'dirty':
      return '未保存';
    case 'saving':
      return '保存中';
    case 'saved':
      return '已保存';
    case 'save-error':
      return '保存失败';
    case 'external-change':
      return '文件已变更';
    case 'conflict':
      return '存在冲突';
    default:
      return '加载中';
  }
}

function isDocumentSessionModified(session: DocumentSession): boolean {
  return session.content !== session.savedContent;
}

export default React.memo(Main);

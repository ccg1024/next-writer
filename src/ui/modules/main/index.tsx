import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ViewUpdate } from '@codemirror/view';
import { App, Typography } from 'antd';
import { DocumentSession } from '_types';
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

import './index.less';

const { Title } = Typography;

const MAX_DESCRIPTION_LENGTH = 100 as const;

/**
 * 当前笔记编辑区，负责 CodeMirror 生命周期、文档会话修订同步、保存命令和标题重命名。
 */
const Main: FC = () => {
  const { message } = App.useApp();
  const { currentNote } = useLibraryState();
  const { runtimeConfig } = useRuntimeLayout();
  const [initialEditorState, setInitialEditorState] = useState<InitialEditorState>(null);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const { patchCurrentNote, patchLibraryNode, renameNode, setLibraryTree } = useLibraryActions();
  const { setEditorView, syncOutlineFromView } = useEditorActions();
  const [session, setSession] = useState<DocumentSession | null>(null);
  const sessionRef = useRef<DocumentSession | null>(null);
  const sessionRevisionsRef = useRef(new Map<string, number>());
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
      return rendererGateway.updateDocumentSession({ id, content, revision }).then(res => {
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
        return res;
      });
    },
    [patchCurrentNote]
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

  useRendererCommand('toggle-typewriter-mode', (_e, action) => {
    setTypewriterMode(Boolean(action.payload));
  });

  useEffect(() => {
    setTypewriterMode(runtimeConfig?.menuStatus?.typewriterMode ?? false);
  }, [runtimeConfig?.menuStatus?.typewriterMode]);

  // 切换笔记时废弃上一次异步结果，防止慢请求把新编辑器替换成旧笔记内容。
  useEffect(() => {
    if (isTrulyEmpty(currentNote?.id)) {
      sessionRef.current = null;
      setSession(null);
      setInitialEditorState(null);
      return;
    }

    sessionRef.current = null;
    setSession(null);
    setInitialEditorState(null);
    let shouldUpdate = true;
    const readNote = async () => {
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
      }
    };

    readNote();
    return () => {
      shouldUpdate = false;
    };
  }, [currentNote?.id, patchCurrentNote]);

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
      {/* put codemirror here */}
      <div
        ref={divRef}
        className="next-writer-editor-wrapper"
        style={session?.id === currentNote.id ? undefined : { display: 'none' }}
      ></div>
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

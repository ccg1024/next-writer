import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { App, Typography } from 'antd';
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

const Main: FC = () => {
  const { message } = App.useApp();
  const { currentNote } = useLibraryState();
  const { runtimeConfig } = useRuntimeLayout();
  const [initialEditorState, setInitialEditorState] = useState<InitialEditorState>(null);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const { patchCurrentNote, renameNode, setLibraryTree } = useLibraryActions();
  const { setEditorView, syncOutlineFromView } = useEditorActions();
  const cacheUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRevisionRef = useRef(0);
  // Track whether current file is already marked as modified
  const isModifiedRef = useRef<boolean>(false);
  // Track previous file info for cleanup on switch
  const prevNoteInfoRef = useRef<{ id?: string }>({});

  // 处理自定义编辑器事件
  const debounceDescriptionUpdate = useMemo(
    () => debounceFn((description: string) => patchCurrentNote({ description })),
    [patchCurrentNote]
  );

  const headInProcess = useRef<string>('');

  const nextCacheRevision = useCallback(() => {
    cacheRevisionRef.current += 1;
    return cacheRevisionRef.current;
  }, []);

  const updateFileCache = useCallback(
    (id: string, content: string, isChange: boolean) =>
      rendererGateway.updateCache({
        id,
        content,
        isChange,
        revision: nextCacheRevision()
      }),
    [nextCacheRevision]
  );

  const scheduleCacheUpdate = useCallback(
    (view: EditorView) => {
      if (cacheUpdateTimerRef.current) {
        return;
      }

      cacheUpdateTimerRef.current = setTimeout(() => {
        const content = view.state.doc.toString();
        const id = currentNote?.id;
        if (id) {
          updateFileCache(id, content, isModifiedRef.current);
        }
        cacheUpdateTimerRef.current = null;
      }, 1000);
    },
    [currentNote?.id, updateFileCache]
  );

  const onEditorDocChange = useCallback(
    (update: ViewUpdate) => {
      update.transactions.forEach(tr => {
        if (tr.changes) {
          tr.changes.iterChanges(fromA => {
            // 如果前 MAX_DESCRIPTION_LENGTH 个字符变化，则更新文件描述内容
            if (fromA <= MAX_DESCRIPTION_LENGTH) {
              const fullDoc = update.state.doc.toString();
              const doc =
                fullDoc.length > MAX_DESCRIPTION_LENGTH ? fullDoc.substring(0, MAX_DESCRIPTION_LENGTH) : fullDoc;
              // Must using debounce function
              debounceDescriptionUpdate(doc);
            }
          });
        }
      });

      // Immediate state update: only if transitioning to modified
      if (!isModifiedRef.current && currentNote?.id) {
        isModifiedRef.current = true;

        // Update UI state immediately (no delay)
        patchCurrentNote({ isChange: true });

        // Update cache state immediately (no delay)
        updateFileCache(currentNote.id, update.view.state.doc.toString(), true);
      }

      scheduleCacheUpdate(update.view);

      // 通知其他模块，文档变更
      syncOutlineFromView(update.view);
      messagePublish.pub('docChanged', update.view);
    },
    [
      currentNote?.id,
      patchCurrentNote,
      debounceDescriptionUpdate,
      updateFileCache,
      scheduleCacheUpdate,
      syncOutlineFromView
    ]
  );

  const [divRef, editor] = useCodemirror<HTMLDivElement>({
    initialEditorState,
    onEditorDocChange,
    typewriterMode
  });

  const handleWriteFile = useCallback(() => {
    if (!editor || !currentNote?.id) {
      return;
    }

    const content = editor.state.doc.toString();
    const noteId = currentNote.id;
    if (cacheUpdateTimerRef.current) {
      clearTimeout(cacheUpdateTimerRef.current);
      cacheUpdateTimerRef.current = null;
    }
    const saveRevision = nextCacheRevision();
    const wasModifiedBeforeSave = isModifiedRef.current;

    nwSpin.loading(true);
    rendererGateway
      .writeFile({ id: noteId, content, revision: saveRevision })
      .then(res => {
        if (res.status !== 0) {
          message.error(res.message || '保存文件失败');
          isModifiedRef.current = wasModifiedBeforeSave;
          patchCurrentNote({ isChange: wasModifiedBeforeSave });
          if (wasModifiedBeforeSave) {
            updateFileCache(noteId, content, true);
          }
          return;
        }

        // Reset modified state immediately
        isModifiedRef.current = false;
        setLibraryTree(res.data);
        patchCurrentNote({ isChange: false });
      })
      .finally(() => {
        nwSpin.loading(false);
      });
  }, [currentNote, editor, message, nextCacheRevision, patchCurrentNote, setLibraryTree, updateFileCache]);

  useRendererCommand('write-file', handleWriteFile);

  useRendererCommand('toggle-typewriter-mode', (_e, action) => {
    setTypewriterMode(Boolean(action.payload));
  });

  // ============================================================
  // Effect
  // ============================================================
  useEffect(() => {
    setTypewriterMode(runtimeConfig?.menuStatus?.typewriterMode ?? false);
  }, [runtimeConfig?.menuStatus?.typewriterMode]);

  // Effect 1: Read file content when note changes
  useEffect(() => {
    if (isTrulyEmpty(currentNote?.id)) {
      return;
    }

    let shouldUpdate = true;
    const readNote = async () => {
      const { status, data } = await rendererGateway.readFile({ id: currentNote.id });
      if (shouldUpdate && status === 0) {
        setInitialEditorState({ initDoc: data.content });
      }
    };

    readNote();
    return () => {
      shouldUpdate = false;
    };
  }, [currentNote?.id]);

  // Effect 2: Flush cache before editor unmounts (file switch or component unmount)
  useEffect(() => {
    if (isTrulyEmpty(currentNote?.id) || !editor) {
      return;
    }

    // Initialize cache info when editor mounts or note switches
    isModifiedRef.current = currentNote.isChange ?? false;
    prevNoteInfoRef.current = {
      id: currentNote.id
    };

    return () => {
      // Before unmounting, flush pending timer and update cache
      if (cacheUpdateTimerRef.current) {
        clearTimeout(cacheUpdateTimerRef.current);
        cacheUpdateTimerRef.current = null;
      }

      // Always update cache with latest content when switching files
      if (prevNoteInfoRef.current.id) {
        updateFileCache(prevNoteInfoRef.current.id, editor.state.doc.toString(), isModifiedRef.current);
      }
    };
  }, [editor, updateFileCache]);

  useEffect(() => {
    if (!editor) {
      setEditorView(null);
      syncOutlineFromView(null);
      return;
    }

    setEditorView(editor);
    syncOutlineFromView(editor);
    // 通知其他模块编辑器变更
    messagePublish.pub('editorChanged', editor);

    return () => {
      setEditorView(null);
      syncOutlineFromView(null);
    };
  }, [editor, setEditorView, syncOutlineFromView]);

  // ============================================================
  // Render
  // ============================================================
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
      </div>
      {/* put codemirror here */}
      <div ref={divRef} className="next-writer-editor-wrapper"></div>
    </div>
  );
};

export default React.memo(Main);

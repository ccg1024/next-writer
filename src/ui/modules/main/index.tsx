import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { App, Typography } from 'antd';
import { isTrulyEmpty } from 'src/tools/utils';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import useCodemirror, { InitialEditorState } from 'src/ui/hooks/useCodemirror';
import { useRendererIpcAction } from 'src/ui/hooks/use-renderer-ipc-action';
import mainProcess from 'src/ui/libs/main-process';
import { RendererLibraryTree } from '_types';
import { debounceFn } from 'src/ui/libs/utils';
import messagePublish from 'src/ui/libs/pub-sub';
import { nwSpin } from 'src/ui/mix-components/spin';
import { useHomeContext } from 'src/ui/home/module.context';

import './index.less';

const { Title } = Typography;

const MAX_DESCRIPTION_LENGTH = 100 as const;

export interface ExposedHandler {
  queryFile(noteId: string, note: RendererLibraryTree, parent: RendererLibraryTree): void;
}

interface MainProps {
  onLibContentChange?(libItem: RendererLibraryTree): void;
  currentNote: RendererLibraryTree;
}

const editorTransactionActions = ['docChange', 'updateDescription'] as const;
type EditorTransactionAction = {
  type: (typeof editorTransactionActions)[number];
  doc?: string;
};

const Main: FC<MainProps> = props => {
  const { currentNote } = props;
  const { message } = App.useApp();
  const [initialEditorState, setInitialEditorState] = useState<InitialEditorState>(null);
  const { updateRenderLibrary } = useHomeContext();
  const cacheUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRevisionRef = useRef(0);
  // Track whether current file is already marked as modified
  const isModifiedRef = useRef<boolean>(false);
  // Track previous file info for cleanup on switch
  const prevNoteInfoRef = useRef<{ relativePath?: string; id?: string }>({});

  // 处理自定义编辑器事件
  const debounceEditorTransaction = useMemo(() => {
    function transaction(action: EditorTransactionAction) {
      switch (action.type) {
        case 'updateDescription': {
          updateRenderLibrary((_, preNote) => ({ ...preNote, description: action.doc }));
          break;
        }
      }
    }
    return debounceFn(transaction);
  }, [updateRenderLibrary]);

  const headInProcess = useRef<string>('');

  const nextCacheRevision = useCallback(() => {
    cacheRevisionRef.current += 1;
    return cacheRevisionRef.current;
  }, []);

  const updateFileCache = useCallback(
    (path: string, content: string, isChange: boolean) =>
      mainProcess.updateCache({
        path,
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
        const path = currentNote?.relativePath;
        if (path) {
          updateFileCache(path, content, isModifiedRef.current);
        }
        cacheUpdateTimerRef.current = null;
      }, 1000);
    },
    [currentNote?.relativePath, updateFileCache]
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
              debounceEditorTransaction({ type: 'updateDescription', doc });
            }
          });
        }
      });

      // Immediate state update: only if transitioning to modified
      if (!isModifiedRef.current && currentNote?.relativePath) {
        isModifiedRef.current = true;

        // Update UI state immediately (no delay)
        updateRenderLibrary((_, preNote) => ({
          ...preNote,
          isChange: true
        }));

        // Update cache state immediately (no delay)
        updateFileCache(currentNote.relativePath, update.view.state.doc.toString(), true);
      }

      scheduleCacheUpdate(update.view);

      // 通知其他模块，文档变更
      messagePublish.pub('docChanged', update.view);
    },
    [currentNote?.relativePath, updateRenderLibrary, debounceEditorTransaction, updateFileCache, scheduleCacheUpdate]
  );

  const onEditorChange = useCallback((_update: ViewUpdate) => {
    // ..
  }, []);

  const [divRef, editor] = useCodemirror<HTMLDivElement>({ initialEditorState, onEditorDocChange, onEditorChange });

  const handleWriteFile = useCallback(() => {
    if (!editor || !currentNote?.relativePath) {
      return;
    }

    const content = editor.state.doc.toString();
    if (cacheUpdateTimerRef.current) {
      clearTimeout(cacheUpdateTimerRef.current);
      cacheUpdateTimerRef.current = null;
    }
    const saveRevision = nextCacheRevision();
    const wasModifiedBeforeSave = isModifiedRef.current;

    nwSpin.loading(true);
    mainProcess
      .writeFile({ path: currentNote.relativePath, content, nameInRuntime: currentNote.name, revision: saveRevision })
      .then(res => {
        if (res.status !== 0) {
          message.error(res.message || '保存文件失败');
          isModifiedRef.current = wasModifiedBeforeSave;
          updateRenderLibrary((_, preNote) => ({
            ...preNote,
            isChange: wasModifiedBeforeSave
          }));
          if (wasModifiedBeforeSave) {
            updateFileCache(currentNote.relativePath, content, true);
          }
          return;
        }

        // Reset modified state immediately
        isModifiedRef.current = false;

        // Update relative path
        const oldRelativePathToken = (currentNote.relativePath ?? '').split('/');
        oldRelativePathToken.pop();
        oldRelativePathToken.push(currentNote.name);
        const newRelativePath = oldRelativePathToken.join('/');
        // Update prevNoteInfoRef with new path after save
        prevNoteInfoRef.current = {
          ...prevNoteInfoRef.current,
          relativePath: newRelativePath
        };
        // Update with isChange: false
        const newAggregateNote = {
          ...currentNote,
          relativePath: newRelativePath,
          isChange: false
        };
        updateRenderLibrary(newAggregateNote);
        // pubNoteUpdate(newAggregateNote.note);
      })
      .finally(() => {
        nwSpin.loading(false);
      });
  }, [currentNote, editor, message, nextCacheRevision, updateFileCache, updateRenderLibrary]);

  useRendererIpcAction('write-file', handleWriteFile);

  // ============================================================
  // Effect
  // ============================================================
  // Effect 1: Read file content when note changes
  useEffect(() => {
    if (isTrulyEmpty(currentNote?.id)) {
      return;
    }

    // Reset modified state when loading a new file
    isModifiedRef.current = currentNote.isChange ?? false;

    let shouldUpdate = true;
    const readNote = async () => {
      const { status, data } = await mainProcess.readFile({ path: currentNote.relativePath });
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
    prevNoteInfoRef.current = {
      relativePath: currentNote.relativePath,
      id: currentNote.id
    };

    return () => {
      // Before unmounting, flush pending timer and update cache
      if (cacheUpdateTimerRef.current) {
        clearTimeout(cacheUpdateTimerRef.current);
        cacheUpdateTimerRef.current = null;
      }

      // Always update cache with latest content when switching files
      if (prevNoteInfoRef.current.relativePath) {
        updateFileCache(prevNoteInfoRef.current.relativePath, editor.state.doc.toString(), isModifiedRef.current);
      }
    };
  }, [editor, updateFileCache]);

  useEffect(() => {
    if (editor) {
      // 通知其他模块编辑器变更
      messagePublish.pub('editorChanged', editor);
    }
  }, [editor]);

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
              const newAggregateNote = {
                ...currentNote,
                name: headInProcess.current
              };
              // Update aggregateNote
              updateRenderLibrary(newAggregateNote);
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

import React, { FC, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ViewUpdate } from '@codemirror/view';
import { App, Typography } from 'antd';
import { isTrulyEmpty } from 'src/tools/utils';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import useCodemirror, { InitialEditorState } from 'src/ui/hooks/useCodemirror';
import mainProcess from 'src/ui/libs/main-process';
import { RendererLibraryTree, RendererListenerAction } from '_types';
import { debounceFn } from 'src/ui/libs/utils';
import rendererIpcListener, { RendererIpcActionCallback } from '../ipc';
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
  }, []);

  const headInProcess = useRef<string>('');

  const onEditorDocChange = useCallback((update: ViewUpdate) => {
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
      mainProcess.updateCache({
        path: currentNote.relativePath,
        content: update.view.state.doc.toString(),
        isChange: true
      });

      // Start content caching timer after first immediate update
      cacheUpdateTimerRef.current = setTimeout(() => {
        const content = update.view.state.doc.toString();
        if (currentNote?.relativePath) {
          mainProcess.updateCache({
            path: currentNote.relativePath,
            content,
            isChange: isModifiedRef.current
          });
        }
        cacheUpdateTimerRef.current = null;
      }, 1000);
      return; // Skip the debounced update below
    }

    // Content caching: debounced (only for subsequent edits)
    if (!cacheUpdateTimerRef.current) {
      cacheUpdateTimerRef.current = setTimeout(() => {
        const content = update.view.state.doc.toString();
        if (currentNote?.relativePath) {
          mainProcess.updateCache({
            path: currentNote.relativePath,
            content,
            isChange: isModifiedRef.current
          });
        }
        cacheUpdateTimerRef.current = null;
      }, 1000); // Debounce: update after 1 second of inactivity
    }

    // 通知其他模块，文档变更
    messagePublish.pub('docChanged', update.view);
  }, [currentNote, updateRenderLibrary, debounceEditorTransaction]);

  const onEditorChange = useCallback((_update: ViewUpdate) => {
    // ..
  }, []);

  const [divRef, editor] = useCodemirror<HTMLDivElement>({ initialEditorState, onEditorDocChange, onEditorChange });

  // for Ipc action
  const [_ipcAction, dispatchIpcAction] = useReducer(ipcAction, void 0);
  function ipcAction(_: undefined, action: RendererListenerAction) {
    switch (action.type) {
      case 'write-file': {
        const content = editor.state.doc.toString();
        nwSpin.loading(true);
        mainProcess
          .writeFile({ path: currentNote.relativePath, content, nameInRuntime: currentNote.name })
          .then(res => {
            if (res.status !== 0) {
              message.error(res.message || '保存文件失败');
              return;
            }

            // Clear any pending cache updates since file is now saved
            if (cacheUpdateTimerRef.current) {
              clearTimeout(cacheUpdateTimerRef.current);
              cacheUpdateTimerRef.current = null;
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
        break;
      }
    }
  }

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
        mainProcess.updateCache({
          path: prevNoteInfoRef.current.relativePath,
          content: editor.state.doc.toString(),
          isChange: isModifiedRef.current
        });
      }
    };
  }, [editor, currentNote?.id]);

  // Effect 3: Register save file IPC listener
  useEffect(() => {
    const saveFile: RendererIpcActionCallback = (_e, action) => {
      dispatchIpcAction(action);
    };
    saveFile.type = 'write-file';
    rendererIpcListener.register(saveFile);
    return () => {
      rendererIpcListener.deregister(saveFile);
    };
  }, []);

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

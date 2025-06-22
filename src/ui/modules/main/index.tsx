import React, { useCallback, useEffect, useImperativeHandle, useMemo, useReducer, useRef, useState } from 'react';
import { EditorView, ViewUpdate } from '@codemirror/view';
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

import './index.less';

const { Title } = Typography;

const MAX_DESCRIPTION_LENGTH = 100 as const;

export interface ExposedHandler {
  queryFile(noteId: string, note: RendererLibraryTree, parent: RendererLibraryTree): void;
}

interface MainProps {
  onLibContentChange?(libItem: RendererLibraryTree): void;
}

const editorTransactionActions = ['docChange', 'updateDescription'] as const;
type EditorTransactionAction = {
  type: (typeof editorTransactionActions)[number];
  doc?: string;
};

const Main: React.ForwardRefRenderFunction<ExposedHandler, MainProps> = (props, ref) => {
  const { onLibContentChange: pubNoteUpdate } = props;
  const { message } = App.useApp();
  // Should always keep in mind that aggregatNode and the active lib item of sidebar are two objects representing
  // the same state, and these two states should be updated synchronously.
  const [aggregateNote, setAggregateNote] = useState<{
    noteId: string;
    note: RendererLibraryTree;
    parent: RendererLibraryTree;
  }>(null);
  const [initialEditorState, setInitialEditorState] = useState<InitialEditorState>(null);
  const [editorTransaction, setEditorTransaction] = useState<EditorTransactionAction>(null);

  const debounceEditorTransaction = useMemo(() => {
    function transaction(action: EditorTransactionAction) {
      switch (action.type) {
        case 'updateDescription': {
          setAggregateNote(pre => ({ ...pre, note: { ...pre.note, description: action.doc } }));
          setEditorTransaction(action);
          break;
        }
      }
    }
    return debounceFn(transaction);
  }, []);

  const headInProcess = useRef<string>('');

  const onEditorDocChange = useCallback((view: EditorView) => {
    messagePublish.pub('docChanged', view);
  }, []);

  const onEditorChange = useCallback((update: ViewUpdate) => {
    if (update.docChanged) {
      update.transactions.forEach(tr => {
        if (tr.changes) {
          tr.changes.iterChanges(fromA => {
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
    }
  }, []);

  const [divRef, editor] = useCodemirror<HTMLDivElement>({ initialEditorState, onEditorDocChange, onEditorChange });
  // for Ipc action
  const [_ipcAction, dispatchIpcAction] = useReducer(ipcAction, void 0);
  function ipcAction(_: undefined, action: RendererListenerAction) {
    switch (action.type) {
      case 'write-file': {
        const content = editor.state.doc.toString();
        nwSpin.loading(true);
        console.log('write ', aggregateNote);
        mainProcess
          .writeFile({ path: aggregateNote.note.relativePath, content, nameInRuntime: aggregateNote.note.name })
          .then(res => {
            if (res.status !== 0) {
              message.error(res.message || '保存文件失败');
              return;
            }
            // Update relative path
            const oldRelativePathToken = (aggregateNote.note.relativePath ?? '').split('/');
            oldRelativePathToken.pop();
            oldRelativePathToken.push(aggregateNote.note.name);
            // Update
            const newAggregateNote = {
              ...aggregateNote,
              note: { ...aggregateNote.note, relativePath: oldRelativePathToken.join('/') }
            };
            setAggregateNote(newAggregateNote);
            pubNoteUpdate(newAggregateNote.note);
          })
          .finally(() => {
            nwSpin.loading(false);
          });
        break;
      }
    }
  }
  // ============================================================
  // Exposed handler
  // ============================================================
  useImperativeHandle(
    ref,
    () => ({
      /**
       * @param noteId A unique id for each note at runtime
       * @param note The library base struct of current note
       * @param parent The library tree struct of current note parent
       */
      queryFile(noteId, note, parent) {
        if (isTrulyEmpty(noteId)) {
          setAggregateNote(null);
          return;
        }
        setAggregateNote({ noteId, note, parent });
      }
    }),
    []
  );

  // ============================================================
  // Effect
  // ============================================================
  useEffect(() => {
    if (isTrulyEmpty(aggregateNote?.noteId)) {
      return;
    }
    let shouldUpdate = true;
    const readNote = async () => {
      const { status, data } = await mainProcess.readFile({ path: aggregateNote.note.relativePath });
      if (shouldUpdate && status === 0) {
        setInitialEditorState({ initDoc: data.content });
      }
    };

    readNote();
    return () => {
      shouldUpdate = false;
    };
  }, [aggregateNote?.noteId]);

  useEffect(() => {
    if (!editorTransaction) {
      return;
    }
    switch (editorTransaction.type) {
      case 'updateDescription': {
        pubNoteUpdate(aggregateNote.note);
        break;
      }
    }
  }, [editorTransaction]);

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
      messagePublish.pub('editorChanged', editor);
    }
  }, [editor]);

  // ============================================================
  // Render
  // ============================================================
  if (isTrulyEmpty(aggregateNote?.noteId)) {
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
              headInProcess.current = aggregateNote.note.name;
            },
            onChange: text => {
              headInProcess.current = text;
            },
            onEnd: () => {
              const newAggregateNote = {
                ...aggregateNote,
                note: { ...aggregateNote.note, name: headInProcess.current }
              };
              // Update aggregateNote
              setAggregateNote(newAggregateNote);
              pubNoteUpdate(newAggregateNote.note);
              // Cleaning the data in process
              headInProcess.current = '';
            }
          }}
        >
          {aggregateNote.note.name}
        </Title>
      </div>
      {/* put codemirror here */}
      <div ref={divRef} className="next-writer-editor-wrapper"></div>
    </div>
  );
};

export default React.forwardRef(Main);

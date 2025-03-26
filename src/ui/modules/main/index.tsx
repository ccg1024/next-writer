import { EditorView } from '@codemirror/view';
import { Typography } from 'antd';
import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { isTrulyEmpty } from 'src/tools/utils';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import useCodemirror, { InitialEditorState } from 'src/ui/hooks/useCodemirror';
import mainProcess from 'src/ui/libs/main-process';
import { LibraryBase, LibraryTree } from '_types';

import './index.less';

const { Title, Paragraph } = Typography;

export interface ExposedHandler {
  queryFile(noteId: string, note: LibraryBase, parent: LibraryTree): void;
}

const Main: React.ForwardRefRenderFunction<ExposedHandler> = (_, ref) => {
  const [aggregateNote, setAggregateNote] = useState<{ noteId: string; note: LibraryBase; parent: LibraryTree }>(null);
  const [initialEditorState, setInitialEditorState] = useState<InitialEditorState>(null);
  const onEditorDocChange = useCallback((_view: EditorView) => {
    // TODO: some thing to run when file is change
  }, []);
  const [divRef, _editor] = useCodemirror<HTMLDivElement>({ initialEditorState, onEditorDocChange });
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
    const notePath = `${aggregateNote.parent.name}/${aggregateNote.note.name}`;
    const readNote = async () => {
      const { status, data } = await mainProcess.readFile({ path: notePath });
      if (shouldUpdate && status === 0) {
        setInitialEditorState({ initDoc: data.content });
      }
    };

    readNote();
    return () => {
      shouldUpdate = false;
    };
  }, [aggregateNote?.noteId]);

  if (isTrulyEmpty(aggregateNote?.noteId)) {
    return (
      <div className="main-wrapper">
        <VerticalEmpty description="无笔记" style={{ paddingTop: '48px' }} />
      </div>
    );
  }

  return (
    <div className="main-wrapper">
      <div className="main-header">
        <Title level={4} style={{ marginTop: 0 }}>
          title
        </Title>
        <Paragraph>some thine here</Paragraph>
      </div>
      {/* put codemirror here */}
      <div ref={divRef} className="next-writer-editor-wrapper"></div>
    </div>
  );
};

export default React.forwardRef(Main);

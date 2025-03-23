import { EditorView } from '@codemirror/view';
import { Typography } from 'antd';
import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { isTrulyEmpty } from 'src/tools/utils';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import useCodemirror from 'src/ui/hooks/useCodemirror';
import mainProcess from 'src/ui/libs/main-process';

import './index.less';

const { Title, Paragraph } = Typography;

export interface ExposedHandler {
  queryFile(notePath: string): void;
}

const Main: React.ForwardRefRenderFunction<ExposedHandler> = (_, ref) => {
  const [notePath, setNotePath] = useState<string>(null);
  const [content, setContent] = useState<string>('');
  const onEditorDocChange = useCallback((_view: EditorView) => {
    // TODO: some thing to run when file is change
  }, []);
  const [divRef, _editor] = useCodemirror<HTMLDivElement>({ initDoc: content, onEditorDocChange }, [notePath]);
  // ============================================================
  // Exposed handler
  // ============================================================
  useImperativeHandle(
    ref,
    () => ({
      queryFile(notePath) {
        setNotePath(notePath);
      }
    }),
    []
  );

  // ============================================================
  // Effect
  // ============================================================
  useEffect(() => {
    if (isTrulyEmpty(notePath)) {
      return;
    }
    let shouldUpdate = true;
    const readNote = async () => {
      const { status, data } = await mainProcess.readFile({ path: notePath });
      if (shouldUpdate && status === 0) {
        setContent(data.content);
      }
    };

    readNote();
    return () => {
      shouldUpdate = false;
    };
  }, [notePath]);

  if (isTrulyEmpty(notePath)) {
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

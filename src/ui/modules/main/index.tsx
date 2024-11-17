import { EditorView } from '@codemirror/view';
import { Typography } from 'antd';
import React, { useCallback, useImperativeHandle, useState } from 'react';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import useCodemirror from 'src/ui/hooks/useCodemirror';
import { LibraryDetail } from '_types';
import './index.less';

const { Title, Paragraph } = Typography;

export interface ExposedHandler {
  queryFile(lib: LibraryDetail): void;
}

const Main: React.ForwardRefRenderFunction<ExposedHandler> = (_, ref) => {
  // current file
  const [lib, setLib] = useState<LibraryDetail>(null);
  const onEditorDocChange = useCallback((_view: EditorView) => {
    // TODO: some thing to run when file is change
  }, []);
  const [divRef, _editor] = useCodemirror<HTMLDivElement>({ initDoc: lib?.content, onEditorDocChange }, [lib]);
  // ============================================================
  // Exposed handler
  // ============================================================
  useImperativeHandle(
    ref,
    () => ({
      queryFile(lib) {
        setLib(lib);
      }
    }),
    []
  );

  if (!lib) {
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
          {lib.name}
        </Title>
        <Paragraph>{lib.modifiedTime}</Paragraph>
      </div>
      {/* put codemirror here */}
      <div ref={divRef} className="next-writer-editor-wrapper"></div>
    </div>
  );
};

export default React.forwardRef(Main);

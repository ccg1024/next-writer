import { Typography } from 'antd';
import React, { useImperativeHandle, useState } from 'react';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import { LibraryTree } from '_types';
import './index.less';

const { Title, Paragraph } = Typography;

export interface ExposedHandler {
  queryFile(lib: LibraryTree): void;
}

const Main: React.ForwardRefRenderFunction<ExposedHandler> = (_, ref) => {
  // current file
  const [lib, setLib] = useState<LibraryTree>(null);
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
        <VerticalEmpty description="无笔记" style={{ paddingTop: '80px' }} />
      </div>
    );
  }

  return (
    <div className="main-wrapper">
      <div style={{ marginTop: '40px', paddingBottom: '16px' }}>
        <Title level={4} style={{ marginTop: 0 }}>
          {lib.name}
        </Title>
        <Paragraph>{lib.modifiedTime}</Paragraph>
      </div>
      {/* put codemirror here */}
    </div>
  );
};

export default React.forwardRef(Main);

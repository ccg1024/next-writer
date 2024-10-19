import { DeleteOutlined, FolderOutlined, FormOutlined } from '@ant-design/icons';
import { message, Menu, MenuProps, Typography, Row, Col } from 'antd';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { useHomeContext } from 'src/ui/home/module.context';
import mainProcess from 'src/ui/libs/main-process';
import { LibraryTree, LibraryType, NormalObject } from '_types';
import { AddModal, AddModalHandle, DelModal, DelModalHandle, DelModalTarget } from './modal';

import './index.less';
import { motion } from 'framer-motion';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';

const { Text, Title, Paragraph } = Typography;
type MenuItem = Required<MenuProps>['items'][number];

const LibrarySidebar: FC = () => {
  const [libTree, setLibTree] = useState<LibraryTree[]>(null);
  const [selectedLib, setSelectedLib] = useState<LibraryTree>(null);
  const [_loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<NormalObject>(null);

  const addRef = useRef<AddModalHandle>(null);
  const delRef = useRef<DelModalHandle>(null);
  const { setCurrentLib, currentLib } = useHomeContext();

  // ============================================================
  // General settings
  // ============================================================
  const initData = useCallback(() => {
    setLibTree(null);
    setSelectedLib(null);
    setLoading(false);
  }, []);

  const reRequest = useCallback((_parent?: string, reset?: boolean) => {
    if (reset) {
      setCurrentLib({ file: null });
    }
    setConditions({});
  }, []);

  useEffect(() => {
    initData();
    getLibraryTree();
  }, [initData, conditions]);

  // Update selected lib when root change
  useEffect(() => {
    if (currentLib?.root) {
      const seleted = libTree?.find(lib => lib.name === currentLib.root);
      setSelectedLib(seleted);
    }
  }, [currentLib?.root, libTree]);

  // ============================================================
  // Request data
  // ============================================================
  async function getLibraryTree() {
    try {
      setLoading(true);
      const { status, data, message: msg } = await mainProcess.getLibrary();
      if (status === 0) {
        setLibTree(data ?? []);
      } else {
        message.error(msg ?? 'Got error when reading library');
      }
    } catch (err) {
      // ..
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // build ui
  // ============================================================
  // Build menu items
  const _wrapMenu = (): MenuItem[] => {
    const inner = (libs: LibraryTree[]) => {
      if (isEffectArray(libs)) {
        return libs
          .map(lib => {
            if (lib.type === 'folder') {
              return {
                key: lib.name,
                label: <div style={{ backgroundColor: 'transparent' }}>{lib.name}</div>
              };
            }
          })
          .filter(Boolean);
      }
      return [];
    };

    return inner(libTree);
  };

  const onMenuClick: MenuProps['onClick'] = e => {
    setCurrentLib({ root: e.key ?? '' });
  };

  const getDeleteDTO = (type: LibraryType) => {
    if (type === 'file') {
      const fileTokens = currentLib.file.split('/');
      return {
        path: currentLib.file,
        title: fileTokens[fileTokens.length - 1],
        type
      };
    }
  };

  return (
    <>
      <div className="library-sidebar-wrapper">
        <WindowDragBox style={{ height: '40px', flexShrink: 0 }} />
        <div className="library-next-writer">NEXT-WRITER</div>
        <div className="library-sidebar-main">
          <div className="library-sidebar-menu">
            <Menu mode="inline" items={_wrapMenu()} onClick={onMenuClick} />
          </div>
          <div className="library-sidebar-footer" onClick={() => void addRef.current?.open('folder')}>
            <FolderOutlined />
            <Text className="footer-text">添加库</Text>
          </div>
        </div>
      </div>
      <div className="library-detail-wrapper">
        <LibraryDetailHeader
          addFile={() => void addRef.current?.open('file')}
          delFile={() => void delRef.current?.open(getDeleteDTO('file'))}
        />
        {isEffectObject(selectedLib) && isEffectArray(selectedLib.children) ? (
          selectedLib.children
            .map(lib => {
              if (lib.type === 'file') {
                return (
                  <LibraryDetailItem
                    key={lib?.name}
                    lib={lib}
                    parent={selectedLib.name}
                    currentFile={currentLib?.file}
                    setCurrentFile={file => void setCurrentLib({ file })}
                  />
                );
              }
            })
            .filter(Boolean)
        ) : (
          <VerticalEmpty description="无笔记" />
        )}
      </div>
      <AddModal ref={addRef} callback={reRequest} />
      <DelModal ref={delRef} callback={reRequest} />
    </>
  );
};

const LibraryDetailHeader: FC<{ addFile: () => void; delFile: () => void }> = ({ addFile, delFile }) => {
  const { currentLib } = useHomeContext();

  const showDelIcon = () => {
    if (!currentLib?.root || !currentLib?.file) {
      return false;
    }
    const rootTokens = currentLib.root.split('/');
    const fileTokens = currentLib.file.split('/');
    for (let i = 0; i < rootTokens.length; i++) {
      if (rootTokens[i] !== fileTokens?.[i]) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="library-detail-header">
      <Row>
        <Col span={8} style={{ textAlign: 'left' }}>
          {showDelIcon() && (
            <motion.span className="library-detail-add" whileTap={{ scale: 0.8 }} onClick={delFile}>
              <DeleteOutlined />
            </motion.span>
          )}
        </Col>
        <Col span={8} style={{ textAlign: 'center' }}>
          <Text>{currentLib?.root}</Text>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          {currentLib?.root && (
            <motion.span className="library-detail-add" whileTap={{ scale: 0.8 }} onClick={addFile}>
              <FormOutlined />
            </motion.span>
          )}
        </Col>
      </Row>
    </div>
  );
};

const LibraryDetailItem: FC<{
  lib: LibraryTree;
  parent: string;
  currentFile: string;
  setCurrentFile: (file: string) => void;
}> = props => {
  const { lib, parent, currentFile, setCurrentFile } = props;

  const unique = `${parent}/${lib.name}`;

  const onClick = (e: React.MouseEvent) => {
    const id = e.currentTarget?.id;
    if (id) {
      setCurrentFile(id);
    }
  };

  return (
    <div
      id={unique}
      onClick={onClick}
      className={`library-detail-item ${currentFile === unique ? 'library-detail-item-selected' : ''}`}
      onMouseEnter={e => void e.currentTarget?.classList.add('library-detail-item-active')}
      onMouseLeave={e => void e.currentTarget?.classList.remove('library-detail-item-active')}
    >
      <Title level={5} className="library-detail-item-text">
        {lib.name}
      </Title>
      <Paragraph className="library-detail-item-text">{lib.modifiedTime}</Paragraph>
    </div>
  );
};

export default LibrarySidebar;

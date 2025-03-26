import { message, Menu, MenuProps, Typography, Row, Col, Spin } from 'antd';
import { DeleteOutlined, FolderOutlined, FormOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { LibraryDetail, LibraryTree, LibraryType, NormalObject } from '_types';
import { AddModal, AddModalHandle, DelModal, DelModalHandle } from './modal';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import type { ExposedHandler as MainExpose } from '../main';

import './index.less';

const { Text, Title, Paragraph } = Typography;
type MenuItem = Required<MenuProps>['items'][number];

type RenderLib = Omit<LibraryTree, 'type'> & { type: 'folder' };
function isRenderLib(lib: LibraryTree | RenderLib): lib is RenderLib {
  return lib.type === 'folder';
}

type RenderNote = Omit<LibraryTree, 'type'> & { type: 'file' };
function isRenderNote(lib: LibraryTree | RenderNote): lib is RenderNote {
  return lib.type === 'file';
}

// The lib in here means folder, and the lib detail means the files of that folder
interface LibrarySidebarProps {
  onNoteChange: MainExpose['queryFile'];
  storedLibrary: LibraryTree; // Full library info which include every lib and lib detail
}

const LibrarySidebar: FC<LibrarySidebarProps> = ({ onNoteChange: onChange, storedLibrary }) => {
  // For lib side bar of the leftmost
  const [selectedLib, setSelectedLib] = useState<RenderLib>(null);
  const [selectedNote, setSelectedNote] = useState<string>(null);

  const addRef = useRef<AddModalHandle>(null);
  const delRef = useRef<DelModalHandle>(null);

  // ============================================================
  // Wrap callback
  // ============================================================
  const onNoteChange = useCallback(
    (notePath: string, note: LibraryTree, parent: LibraryTree) => {
      setSelectedNote(notePath);
      onChange(notePath, note, parent); // Trigger note change to other sibling component
    },
    [onChange]
  );

  // ============================================================
  // Request data
  // ============================================================
  // Get selected file
  // async function getSelectedFile(_filePath: string, _lib: LibraryTree) {
  // setLoading(true);
  // try {
  //   const { status, data, message: msg } = await mainProcess.queryFile({ path: filePath });
  //   if (status === 0) {
  //     const { content } = data ?? {};
  //     if (detailCallback && typeof detailCallback === 'function') {
  //       detailCallback({ ...lib, content });
  //     }
  //   } else {
  //     message.error(msg);
  //   }
  // } catch (err) {
  //   // ..
  // } finally {
  //   setLoading(false);
  // }
  // }

  // ============================================================
  // build ui
  // ============================================================
  // Build menu items
  const _wrapMenu = (): MenuItem[] => {
    // Currently the UI does not support multi-level nesting
    const inner = (libs: LibraryTree[]) => {
      if (isEffectArray(libs)) {
        return libs
          .filter(lib => lib.type === 'folder')
          .map(lib => ({
            key: lib.name,
            label: (
              <div style={{ backgroundColor: 'transparent' }}>
                <Row>
                  <Col span={20}>{lib.name}</Col>
                  <Col span={4} style={{ textAlign: 'center' }}>
                    <motion.div
                      className="library-sidebar-icon"
                      whileTap={{ scale: 0.8 }}
                      onClick={e => {
                        e.stopPropagation();
                        delRef.current?.open({
                          path: lib.name,
                          title: lib.name,
                          type: 'folder'
                        });
                      }}
                    >
                      <MinusCircleOutlined />
                    </motion.div>
                  </Col>
                </Row>
              </div>
            )
          }));
      }
      return [];
    };

    return inner(storedLibrary?.children || []);
  };

  const onMenuClick: MenuProps['onClick'] = e => {
    setSelectedLib(storedLibrary.children.filter(isRenderLib).find(lib => lib.type === 'folder' && lib.name === e.key));
  };

  // const getDeleteDTO = (_type: LibraryType) => {
  // if (type === 'file') {
  //   const fileTokens = currentLib.file.split('/');
  //   return {
  //     path: currentLib.file,
  //     title: fileTokens[fileTokens.length - 1],
  //     type
  //   };
  // }
  // };

  return (
    <>
      {/* {loading && ( */}
      {/*   <div className="library-sidebar-spin-wrapper"> */}
      {/*     <Spin className="library-sidebar-spin" /> */}
      {/*   </div> */}
      {/* )} */}
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
        <LibDetailHeader lib={selectedLib} />
        <div className="library-detail-item-wrapper">
          {isEffectObject(selectedLib) && isEffectArray(selectedLib.children) ? (
            selectedLib.children
              .filter(isRenderNote)
              .map(note => (
                <NoteItem
                  key={note.name}
                  note={note}
                  parent={selectedLib}
                  activeNote={selectedNote}
                  onNoteClick={onNoteChange}
                />
              ))
          ) : (
            <VerticalEmpty description="无笔记" />
          )}
        </div>
      </div>
      {/* <AddModal ref={addRef} callback={reRequest} /> */}
      {/* <DelModal ref={delRef} callback={reRequest} /> */}
    </>
  );
};

interface LibDetailHeaderProps {
  lib: RenderLib;
}
const LibDetailHeader: FC<LibDetailHeaderProps> = ({ lib }) => {
  // const showDelIcon = () => {
  // if (!currentLib?.root || !currentLib?.file) {
  //   return false;
  // }
  // const rootTokens = currentLib.root.split('/');
  // const fileTokens = currentLib.file.split('/');
  // for (let i = 0; i < rootTokens.length; i++) {
  //   if (rootTokens[i] !== fileTokens?.[i]) {
  //     return false;
  //   }
  // }
  //   return true;
  // };

  return (
    <div className="library-detail-header">
      <Row>
        <Col span={8} style={{ textAlign: 'left' }}>
          {/* {showDelIcon() && ( */}
          {/*   <motion.span className="library-detail-icon" whileTap={{ scale: 0.8 }} onClick={delFile}> */}
          {/*     <DeleteOutlined /> */}
          {/*   </motion.span> */}
          {/* )} */}
        </Col>
        <Col span={8} style={{ textAlign: 'center' }}>
          <Text>{lib?.name}</Text>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          {/* {currentLib?.root && ( */}
          {/*   <motion.span className="library-detail-icon" whileTap={{ scale: 0.8 }} onClick={addFile}> */}
          {/*     <FormOutlined /> */}
          {/*   </motion.span> */}
          {/* )} */}
        </Col>
      </Row>
    </div>
  );
};

interface NoteItemProps {
  note: RenderNote;
  parent: RenderLib;
  activeNote: string; // The unique key
  onNoteClick: MainExpose['queryFile'];
}
const NoteItem: FC<NoteItemProps> = props => {
  const { note, parent, activeNote, onNoteClick } = props;

  const onClick = (id: string) => {
    if (id && activeNote !== id) {
      onNoteClick(id, note, parent);
    }
  };

  return (
    <div
      onClick={() => void onClick(note.id)}
      className={`library-detail-item ${activeNote === note.id ? 'library-detail-item-selected' : ''}`}
      onMouseEnter={e => void e.currentTarget?.classList.add('library-detail-item-active')}
      onMouseLeave={e => void e.currentTarget?.classList.remove('library-detail-item-active')}
    >
      <Title level={5} className="library-detail-item-text">
        {note.name}
      </Title>
      <Paragraph className="library-detail-item-text">{note.modifiedTime}</Paragraph>
    </div>
  );
};

export default LibrarySidebar;

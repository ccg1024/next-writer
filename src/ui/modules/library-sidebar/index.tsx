import { App, Menu, MenuProps, Typography, Row, Col, FormInstance } from 'antd';
import { DeleteOutlined, EditOutlined, FolderOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import React, { FC, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { isEffectArray, isEffectObject, isTrulyEmpty } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { RendererLibraryTree } from '_types';
import InputResolveModal, { InputResolveHandle } from './modal';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import { useRunmode } from 'src/ui/hooks/useRunmode';
import { nwSyntaxHighlight } from 'src/ui/hooks/useCodemirror';
import type { ExposedHandler as MainExpose } from '../main';
import mainProcess from 'src/ui/libs/main-process';
import { generateUniqueId } from 'src/ui/libs/utils';

import './index.less';

const { Text, Title, Paragraph } = Typography;
type MenuItem = Required<MenuProps>['items'][number];

type RenderLib = Omit<RendererLibraryTree, 'type'> & { type: 'folder' };
function isRenderLib(lib: RendererLibraryTree | RenderLib): lib is RenderLib {
  return lib.type === 'folder';
}

type RenderNote = Omit<RendererLibraryTree, 'type'> & { type: 'file' };
function isRenderNote(lib: RendererLibraryTree | RenderNote): lib is RenderNote {
  return lib.type === 'file';
}

/**
 * Generate a unique id for each lib struct (description of the file or folder) at runtime
 */
function generateRuntimeInfo(libTree: RendererLibraryTree, parent: RendererLibraryTree | null) {
  if (isEffectObject(libTree)) {
    // The first level of LibraryTree struct is point to root folder,
    // for example, the default root is ~/Documents/nwriter/
    // the libTree is generated as {children: [{name: 'custom-folder-name'}]}
    if (isTrulyEmpty(libTree.relativePath)) {
      libTree.relativePath = parent ? `${parent.relativePath}/${libTree.name}` : `.`;
    }

    if (isTrulyEmpty(libTree.parent)) {
      libTree.parent = parent;
    }

    if (isTrulyEmpty(libTree.id)) {
      libTree.id = generateUniqueId(libTree.relativePath);
    }

    if (isEffectArray(libTree.children)) {
      libTree.children.forEach(child => generateRuntimeInfo(child, libTree));
    }
  }
}

function innerUpdateLibItem(preLib: RendererLibraryTree, libItem: RendererLibraryTree): RendererLibraryTree {
  let findTarget = false;

  function innerUpdate(preLib: RendererLibraryTree, libItem: RendererLibraryTree): RendererLibraryTree {
    // find target lib
    if (preLib.id === libItem.id) {
      findTarget = true;
      return { ...libItem };
    }

    if (!findTarget && isEffectArray(preLib.children)) {
      preLib.children = preLib.children.map(child => innerUpdate(child, libItem));
    }

    return preLib;
  }

  return innerUpdate(preLib, libItem);
}

// The lib in here means folder, and the lib detail means the files of that folder
interface LibrarySidebarProps {
  onNoteChange: MainExpose['queryFile'];
}

export interface LibrarySidebarExpoused {
  updateLibItem(libItem: RendererLibraryTree): void;
}

/**
 * LibrarySidebar is the left sidebar of the app, which is used to show the library tree and the detail of the selected library.
 */
const LibrarySidebar = React.forwardRef<LibrarySidebarExpoused, LibrarySidebarProps>(
  ({ onNoteChange: onChange }, ref) => {
    // For lib side bar of the leftmost
    const [selectedLib, setSelectedLib] = useState<RenderLib>(null);
    const [selectedNote, setSelectedNote] = useState<RenderNote>(null);
    const [storedLibrary, setStoredLibrary] = useState<RendererLibraryTree>(null);

    const inputResolveRef = useRef<InputResolveHandle>(null);
    const { message } = App.useApp();

    useImperativeHandle(
      ref,
      () => ({
        updateLibItem(libItem: RendererLibraryTree) {
          setStoredLibrary(preStoredLibrary => ({ ...innerUpdateLibItem(preStoredLibrary, libItem) }));
        }
      }),
      []
    );

    // ============================================================
    // Effect
    // ============================================================
    useLayoutEffect(() => {
      mainProcess.readConfig().then(res => {
        const { status, data, message: msg } = res ?? {};

        if (status === 0) {
          generateRuntimeInfo(data.libTree, null);
          setStoredLibrary(data.libTree);
        } else {
          message.error(msg || '读取库信息失败');
        }
      });
    }, []);

    // ============================================================
    // Request to main process
    // ============================================================
    async function addNote(parent: RendererLibraryTree, noteName: string) {
      const fullPath = `${parent.relativePath}/${noteName}`;
      const res = await mainProcess.updateLib({ operate: 'add', type: 'file', path: fullPath });
      if (res.status === 0) {
        const noteToken = res.data;
        generateRuntimeInfo(noteToken, parent);
        parent.children.push(noteToken);
        setStoredLibrary(pre => ({ ...pre }));
        // ..
      } else {
        message.error(res.message || '添加文件失败');
      }
    }

    // ============================================================
    // Wrap callback
    // ============================================================
    const onNoteChange = useCallback(
      (notePath: string, note: RenderNote, parent: RendererLibraryTree) => {
        setSelectedNote(note);
        onChange(notePath, note, parent); // Trigger note change to other sibling component
      },
      [onChange]
    );

    const onAddNoteClick = (lib: RenderLib) => {
      const resolvePromise = new Promise<FormInstance>((resolve, reject) => {
        inputResolveRef.current?.open('file', resolve, reject);
      });
      resolvePromise.then(form => {
        const name = form.getFieldValue('name');
        const hasSameName = selectedLib.children.some(note => note.type === 'file' && note.name === name);
        if (hasSameName) {
          message.error('名称重复');
          return;
        }
        addNote(lib, name);
      });
    };

    // ============================================================
    // build ui
    // ============================================================
    // Build menu items
    const _wrapMenu = (): MenuItem[] => {
      // Currently the UI does not support multi-level nesting
      const inner = (libs: RendererLibraryTree[]) => {
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
      setSelectedLib(
        storedLibrary.children.filter(isRenderLib).find(lib => lib.type === 'folder' && lib.name === e.key)
      );
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
        <div className="library-sidebar-wrapper">
          <WindowDragBox style={{ height: '40px', flexShrink: 0 }} />
          <div className="library-next-writer">NEXT-WRITER</div>
          <div className="library-sidebar-main">
            <div className="library-sidebar-menu">
              <Menu mode="inline" items={_wrapMenu()} onClick={onMenuClick} />
            </div>
            <div className="library-sidebar-footer">
              <FolderOutlined />
              <Text className="footer-text">添加库</Text>
            </div>
          </div>
        </div>
        <div className="library-detail-wrapper">
          <LibDetailHeader lib={selectedLib} note={selectedNote} onEditorClick={onAddNoteClick} />
          <div className="library-detail-item-wrapper">
            {isEffectObject(selectedLib) && isEffectArray(selectedLib.children) ? (
              selectedLib.children
                .filter(isRenderNote)
                .map(note => (
                  <NoteItem key={note.name} note={note} activeNoteId={selectedNote?.id} onNoteClick={onNoteChange} />
                ))
            ) : (
              <VerticalEmpty description="无笔记" />
            )}
          </div>
        </div>
        <InputResolveModal ref={inputResolveRef} />
      </>
    );
  }
);

interface LibDetailHeaderProps {
  lib: RenderLib;
  note: RenderNote;
  onEditorClick: (lib: RenderLib) => void;
}
/**
 * LibDetailHeader is the header of the selected library detail, which shows the name of the library and the edit/delete icon.
 */
const LibDetailHeader: FC<LibDetailHeaderProps> = props => {
  const { lib, note, onEditorClick } = props;
  const showEditIcon = isEffectObject(lib) && lib.type === 'folder';
  const showDeleteIcon = isEffectObject(note) && note.type === 'file';
  return (
    <div className="library-detail-header">
      <Row>
        <Col span={8} style={{ textAlign: 'left' }}>
          {showEditIcon && (
            <motion.span className="library-detail-icon" whileTap={{ scale: 0.8 }} onClick={() => onEditorClick(lib)}>
              <EditOutlined />
            </motion.span>
          )}
        </Col>
        <Col span={8} style={{ textAlign: 'center' }}>
          <Text>{lib?.name}</Text>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          {showDeleteIcon && (
            <motion.span className="library-detail-icon" whileTap={{ scale: 0.8 }}>
              <DeleteOutlined />
            </motion.span>
          )}
        </Col>
      </Row>
    </div>
  );
};

interface NoteItemProps {
  note: RenderNote;
  activeNoteId: string; // The unique key
  onNoteClick: MainExpose['queryFile'];
}
/**
 * NoteItem is the item of the selected library detail, which shows the brief info of the note.
 */
const NoteItem: FC<NoteItemProps> = props => {
  const { note, activeNoteId, onNoteClick } = props;
  const spans = useRunmode('markdown', note.description, nwSyntaxHighlight);

  const onClick = (id: string) => {
    if (id && activeNoteId !== id) {
      onNoteClick(id, note, note.parent);
    }
  };

  return (
    <div
      onClick={() => void onClick(note.id)}
      className={`library-detail-item ${activeNoteId === note.id ? 'library-detail-item-selected' : ''}`}
      onMouseEnter={e => void e.currentTarget?.classList.add('library-detail-item-active')}
      onMouseLeave={e => void e.currentTarget?.classList.remove('library-detail-item-active')}
    >
      <Title level={5} className="library-detail-item-text" ellipsis>
        {note.name}
      </Title>
      <Paragraph className="library-detail-item-text">{note.modifiedTime}</Paragraph>
      <Paragraph className="library-detail-item-text" ellipsis={{ rows: 2 }} style={{ wordBreak: 'break-all' }}>
        {spans.map((span, index) => (
          <span key={index} className={span.style || ''} style={{ fontSize: '14px' }}>
            {span.text}
          </span>
        ))}
      </Paragraph>
    </div>
  );
};

export default LibrarySidebar;

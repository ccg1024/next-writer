import { App, Menu, MenuProps, Typography, Row, Col } from 'antd';
import { DeleteOutlined, EditOutlined, FolderOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { RendererLibraryTree } from '_types';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import { useRunmode } from 'src/ui/hooks/useRunmode';
import { nwSyntaxHighlight } from 'src/ui/hooks/useCodemirror';
import mainProcess from 'src/ui/libs/main-process';
import { nwSpin } from 'src/ui/mix-components/spin';
import { useHomeContext } from 'src/ui/home/module.context';
import { FrowardRenameModal, ExposedHandler as ForwardRenameHandler } from './modal';
import { generateRuntimeInfo } from 'src/ui/libs/utils';
import rendererIpcListener, { RendererIpcActionCallback } from '../ipc';

import './index.less';

const { Text, Title, Paragraph } = Typography;
type MenuItem = Required<MenuProps>['items'][number];

// The lib in here means folder, and the lib detail means the files of that folder
interface LibrarySidebarProps {
  currentLib: RendererLibraryTree;
  setCurrentLib: (lib: RendererLibraryTree) => void;
  currentNote: RendererLibraryTree;
  setCurrentNote: (note: RendererLibraryTree) => void;
}

export interface LibrarySidebarExpoused {
  updateLibItem(libItem: RendererLibraryTree): void;
}

function findNodeById(ids: string[], tree: RendererLibraryTree) {
  if (isEffectArray(ids)) {
    const tempIds = [...ids];
    let tempTree = tree;
    while (tempIds.length > 0 && tempTree) {
      const id = tempIds.shift();
      tempTree = tempTree.children?.find(child => child.id === id);
    }

    return tempTree;
  }

  return void 0;
}

/**
 * LibrarySidebar is the left sidebar of the app, which is used to show the library tree and the detail of the selected library.
 */
const LibrarySidebar: FC<LibrarySidebarProps> = props => {
  // For lib side bar of the leftmost
  const { currentLib, setCurrentLib, currentNote, setCurrentNote } = props;
  const [visibleLib, setVisibleLib] = useState(true);
  const [visibleDetail, setVisbleDetail] = useState(true);
  const { libraryTree, updateRenderLibrary, freshTree } = useHomeContext();
  const renameRef = useRef<ForwardRenameHandler>(null);
  const { message, modal } = App.useApp();
  const { runtimeConfig } = useHomeContext();

  // ============================================================
  // Effect
  // ============================================================
  useEffect(() => {
    const toggleLib: RendererIpcActionCallback = (_e, action) => {
      if (action.type === toggleLib.type) {
        setVisibleLib(!!action.payload);
      }
    };
    toggleLib.type = 'toggle-lib';

    const toggleDetail: RendererIpcActionCallback = (_e, acction) => {
      if (acction.type === toggleDetail.type) {
        setVisbleDetail(!!acction.payload);
      }
    };
    toggleDetail.type = 'toggle-lib-detail';

    rendererIpcListener.register(toggleLib);
    rendererIpcListener.register(toggleDetail);

    return () => {
      rendererIpcListener.deregister(toggleLib);
      rendererIpcListener.deregister(toggleDetail);
    };
  }, []);

  useEffect(() => {
    if (runtimeConfig) {
      if (!runtimeConfig.menuStatus.librarySidebar) {
        setVisibleLib(false);
      }

      if (!runtimeConfig.menuStatus.detailSidebar) {
        setVisbleDetail(false);
      }
    }
  }, [runtimeConfig]);

  // ============================================================
  // Wrap callback
  // ============================================================
  const onNoteChange = useCallback((note: RendererLibraryTree) => {
    setCurrentNote(note);
  }, []);

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
            key: lib.id,
            label: (
              <div style={{ backgroundColor: 'transparent' }}>
                <Row>
                  <Col span={16}>{lib.name}</Col>
                  <Col span={4} style={{ textAlign: 'center' }}>
                    <motion.div
                      className="library-sidebar-icon"
                      whileTap={{ scale: 0.8 }}
                      onClick={e => {
                        e.stopPropagation();
                        if (renameRef.current) {
                          renameRef.current.show(lib.name, (newName: string) => {
                            if (lib.parent.children.find(child => child.name === newName && child.id !== lib.id)) {
                              message.error('名称重复');
                              return;
                            }
                            if (newName !== lib.name) {
                              const runtimeRelativePath = `${lib.parent.relativePath}/${newName}`;
                              nwSpin.loading(true);
                              mainProcess
                                .updateLib({
                                  operate: 'update',
                                  type: 'folder',
                                  path: lib.relativePath,
                                  pathInRuntime: runtimeRelativePath
                                })
                                .then(res => {
                                  if (res && res.status === 0) {
                                    const newLib = { ...lib, name: newName, relativePath: runtimeRelativePath };
                                    // Update child relative path
                                    newLib.children.forEach(child => {
                                      updateNodeRelative(child, newLib);
                                      child.parent = newLib;
                                    });
                                    updateRenderLibrary(newLib);
                                  }
                                })
                                .finally(() => {
                                  nwSpin.loading(false);
                                });
                            }
                          });
                        }
                      }}
                    >
                      <EditOutlined />
                    </motion.div>
                  </Col>
                  <Col span={4} style={{ textAlign: 'center' }}>
                    <motion.div
                      className="library-sidebar-icon"
                      whileTap={{ scale: 0.8 }}
                      onClick={e => {
                        e.stopPropagation();
                        if (isEffectArray(lib.children)) {
                          message.error('存在笔记，无法删除当前库');
                          return;
                        }
                        modal.confirm({
                          title: `确定删除${lib.name}`,
                          onOk: () => {
                            nwSpin.loading(true);
                            mainProcess
                              .updateLib({ operate: 'del', type: 'folder', path: lib.relativePath })
                              .then(res => {
                                if (res && res.status === 0) {
                                  updateRenderLibrary(lib, 'remove');
                                }
                              })
                              .finally(() => {
                                nwSpin.loading(false);
                              });
                          }
                        });
                      }}
                    >
                      <DeleteOutlined />
                    </motion.div>
                  </Col>
                </Row>
              </div>
            )
          }));
      }
      return [];
    };

    return inner(libraryTree?.children || []);
  };

  const onMenuClick: MenuProps['onClick'] = e => {
    const target = findNodeById(e.keyPath, libraryTree);
    if (target) {
      setCurrentLib(target);
    }
  };

  return (
    <>
      <div className="library-sidebar-wrapper" style={{ display: visibleLib ? 'flex' : 'none' }}>
        <WindowDragBox style={{ height: '40px', flexShrink: 0 }} />
        <div className="library-next-writer">NEXT-WRITER</div>
        <div className="library-sidebar-main">
          <div className="library-sidebar-menu">
            <Menu mode="inline" items={_wrapMenu()} onClick={onMenuClick} />
          </div>
          <div
            className="library-sidebar-footer"
            onClick={() => {
              if (renameRef.current) {
                renameRef.current.show(
                  '',
                  (name: string) => {
                    if (libraryTree.children.find(child => child.type === 'folder' && child.name === name)) {
                      message.error('名称重复');
                      return;
                    }

                    nwSpin.loading(true);
                    mainProcess
                      .updateLib({ operate: 'add', type: 'folder', path: `./${name}` })
                      .then(res => {
                        const { data, status } = res;
                        if (status === 0 && isEffectObject(data)) {
                          generateRuntimeInfo(data, libraryTree);
                          libraryTree.children.push(data);
                          freshTree();
                        }
                      })
                      .finally(() => {
                        nwSpin.loading(false);
                      });
                  },
                  { title: '新建库' }
                );
              }
            }}
          >
            <FolderOutlined />
            <Text className="footer-text">添加库</Text>
          </div>
        </div>
      </div>

      {/* middle bar */}
      <div
        className="library-detail-wrapper"
        style={{ paddingTop: !visibleLib ? '32px' : '16px', display: visibleDetail ? 'flex' : 'none' }}
      >
        {!visibleLib && (
          <WindowDragBox style={{ height: '32px', top: 0, left: 0, width: '100%', position: 'absolute' }} />
        )}
        <LibDetailHeader
          lib={currentLib}
          note={currentNote}
          onAddNote={() => {
            if (renameRef.current) {
              renameRef.current.show(
                '',
                name => {
                  name = name.trim();
                  if (currentLib.children.find(child => child.type === 'file' && child.name === name)) {
                    message.error('名称重复');
                    return;
                  }
                  nwSpin.loading(true);
                  mainProcess
                    .updateLib({ operate: 'add', type: 'file', path: `${currentLib.relativePath}/${name}` })
                    .then(res => {
                      if (res && res.status === 0) {
                        const treeNode = res.data;
                        generateRuntimeInfo(treeNode, currentLib);
                        currentLib.children.push(treeNode);
                        freshTree();
                      }
                    })
                    .finally(() => {
                      nwSpin.loading(false);
                    });
                },
                { title: '新建笔记' }
              );
            }
          }}
        />
        <div className="library-detail-item-wrapper">
          {isEffectObject(currentLib) && isEffectArray(currentLib.children) ? (
            currentLib.children
              .filter(item => item.type === 'file')
              .map(note => (
                <NoteItem key={note.name} note={note} activeNoteId={currentNote?.id} onNoteClick={onNoteChange} />
              ))
          ) : (
            <VerticalEmpty description="无笔记" />
          )}
        </div>
      </div>

      {!visibleLib && !visibleDetail && (
        <WindowDragBox style={{ height: '32px', top: 0, left: 0, width: '100%', position: 'fixed' }} />
      )}
      <FrowardRenameModal ref={renameRef} />
    </>
  );
};

interface LibDetailHeaderProps {
  lib: RendererLibraryTree;
  note: RendererLibraryTree;
  onAddNote: () => void;
}
/**
 * LibDetailHeader is the header of the selected library detail, which shows the name of the library and the edit/delete icon.
 */
const LibDetailHeader: FC<LibDetailHeaderProps> = props => {
  const { lib, note, onAddNote } = props;
  const { updateRenderLibrary } = useHomeContext();
  const { modal } = App.useApp();

  const showEditIcon = isEffectObject(lib) && lib.type === 'folder';
  const showDeleteIcon = isEffectObject(note) && note.type === 'file' && lib === note.parent;
  return (
    <div className="library-detail-header">
      <Row>
        <Col span={8} style={{ textAlign: 'left' }}>
          {showEditIcon && (
            <motion.span className="library-detail-icon" whileTap={{ scale: 0.8 }} onClick={onAddNote}>
              <EditOutlined />
            </motion.span>
          )}
        </Col>
        <Col span={8} style={{ textAlign: 'center' }}>
          <Text style={{ fontWeight: 'bold' }}>{lib?.name}</Text>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          {showDeleteIcon && (
            <motion.span
              className="library-detail-icon"
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                modal.confirm({
                  title: `确定删除笔记：${note.name}？`,
                  onOk() {
                    nwSpin.loading(true);
                    mainProcess
                      .updateLib({ operate: 'del', type: 'file', path: note.relativePath })
                      .then(res => {
                        if (res && res.status === 0) {
                          updateRenderLibrary(note, 'remove');
                        }
                      })
                      .finally(() => {
                        nwSpin.loading(false);
                      });
                  }
                });
              }}
            >
              <DeleteOutlined />
            </motion.span>
          )}
        </Col>
      </Row>
    </div>
  );
};

interface NoteItemProps {
  note: RendererLibraryTree;
  activeNoteId: string; // The unique key
  onNoteClick: (note: RendererLibraryTree) => void;
}
/**
 * NoteItem is the item of the selected library detail, which shows the brief info of the note.
 */
const NoteItem: FC<NoteItemProps> = props => {
  const { note, activeNoteId, onNoteClick } = props;
  const spans = useRunmode('markdown', note.description, nwSyntaxHighlight);

  const onClick = (id: string) => {
    if (id && activeNoteId !== id) {
      onNoteClick(note);
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

function updateNodeRelative(treeNode: RendererLibraryTree, parent: RendererLibraryTree) {
  if (treeNode) {
    treeNode.relativePath = `${parent.relativePath}/${treeNode.name}`;

    if (isEffectArray(treeNode.children)) {
      treeNode.children.forEach(child => updateNodeRelative(child, treeNode));
    }
  }
}

export default LibrarySidebar;

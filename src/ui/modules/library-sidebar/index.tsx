import { App, Menu, MenuProps, Typography, Row, Col, Popover } from 'antd';
import { DeleteOutlined, EditOutlined, FolderOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { FC, useCallback, useRef } from 'react';
import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { RendererLibraryTree, RendererRootLibraryTree } from '_types';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import { useRunmode } from 'src/ui/hooks/useRunmode';
import { nwSyntaxHighlight } from 'src/ui/hooks/useCodemirror';
import { nwSpin } from 'src/ui/mix-components/spin';
import { FrowardRenameModal, ExposedHandler as ForwardRenameHandler } from './modal';
import { useRendererCommand } from 'src/ui/shared/renderer-command';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useRuntimeLayout } from 'src/ui/domain/runtime';

import './index.less';

const { Text, Title, Paragraph } = Typography;
type MenuItem = Required<MenuProps>['items'][number];

function findNodeById(ids: string[], tree: RendererRootLibraryTree): RendererLibraryTree | undefined {
  if (!isEffectArray(ids) || !tree) {
    return void 0;
  }

  let children = tree.children;
  let target: RendererLibraryTree | undefined;
  const tempIds = [...ids];
  while (tempIds.length > 0) {
    const id = tempIds.shift();
    target = children?.find(child => child.id === id);
    if (!target) {
      return void 0;
    }
    children = target.children;
  }

  return target;
}

/**
 * LibrarySidebar is the left sidebar of the app, which is used to show the library tree and the detail of the selected library.
 */
const LibrarySidebar: FC = () => {
  // For lib side bar of the leftmost
  const { libraryTree, currentLib, currentNote } = useLibraryState();
  const { setLibraryTree, setCurrentLib, setCurrentNote, createLibrary, renameLibrary, deleteLibrary, createNote } =
    useLibraryActions();
  const { librarySidebarVisible, detailSidebarVisible, setLibrarySidebarVisible, setDetailSidebarVisible } =
    useRuntimeLayout();
  const renameRef = useRef<ForwardRenameHandler>(null);
  const { message, modal } = App.useApp();

  // ============================================================
  // Effect
  // ============================================================
  useRendererCommand('toggle-lib', (_e, action) => {
    setLibrarySidebarVisible(!!action.payload);
  });

  useRendererCommand('toggle-lib-detail', (_e, action) => {
    setDetailSidebarVisible(!!action.payload);
  });

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
              <div className="library-sidebar-menu-item">
                <Text className="library-sidebar-menu-item-name" title={lib.name}>
                  {lib.name}
                </Text>
                <div className="library-sidebar-menu-item-actions">
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
                            nwSpin.loading(true);
                            renameLibrary(lib, newName)
                              .then(res => {
                                if (res && res.status === 0) {
                                  setLibraryTree(res.data);
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
                          deleteLibrary(lib)
                            .then(res => {
                              if (res && res.status === 0) {
                                setLibraryTree(res.data);
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
                </div>
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
      <div className="library-sidebar-wrapper" style={{ display: librarySidebarVisible ? 'flex' : 'none' }}>
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
                    createLibrary(name)
                      .then(res => {
                        const { data, status } = res;
                        if (status === 0 && isEffectObject(data)) {
                          setLibraryTree(data);
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
        style={{
          paddingTop: !librarySidebarVisible ? '32px' : '16px',
          display: detailSidebarVisible ? 'flex' : 'none'
        }}
      >
        {!librarySidebarVisible && (
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
                  createNote(currentLib, name)
                    .then(res => {
                      if (res && res.status === 0) {
                        setLibraryTree(res.data);
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

      {!librarySidebarVisible && !detailSidebarVisible && (
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
  const { setLibraryTree, deleteNote } = useLibraryActions();
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
                    deleteNote(note)
                      .then(res => {
                        if (res && res.status === 0) {
                          setLibraryTree(res.data);
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
    <Popover
      arrow={false}
      mouseEnterDelay={2}
      placement="rightTop"
      content={
        <div className="popover-content">
          <Title level={5} className="popover-title" ellipsis>
            {note.name}
          </Title>
          {spans.map((span, index) => (
            <span key={index} className={`${span.style || ''} popover-text`}>
              {span.text}
            </span>
          ))}
        </div>
      }
    >
      <div
        onClick={() => void onClick(note.id)}
        className={`library-detail-item ${activeNoteId === note.id ? 'library-detail-item-selected' : ''}`}
      >
        <div className="library-detail-item-title-row">
          <Title level={5} className="library-detail-item-text" ellipsis>
            {note.name}
          </Title>
          {note.isChange && <span className="unsaved-indicator" />}
        </div>
        <Paragraph className="library-detail-item-text">{note.modifiedTime}</Paragraph>
        <Paragraph className="library-detail-item-text" ellipsis={{ rows: 2 }} style={{ wordBreak: 'break-all' }}>
          {spans.map((span, index) => (
            <span key={index} className={span.style || ''} style={{ fontSize: '14px' }}>
              {span.text}
            </span>
          ))}
        </Paragraph>
      </div>
    </Popover>
  );
};

export default LibrarySidebar;

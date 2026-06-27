import type { RefObject } from 'react';
import { DeleteOutlined, EditOutlined, FolderOutlined } from '@ant-design/icons';
import { App, Menu, MenuProps, Typography } from 'antd';
import { motion } from 'framer-motion';
import type { RendererLibraryTree, RendererRootLibraryTree } from '_types';
import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { useLibraryActions } from 'src/ui/domain/library';
import { nwSpin } from 'src/ui/mix-components/spin';
import { findLibraryNodeByIdPath } from './library-tree-selectors';
import type { ForwardRenameHandler } from './rename-modal';

const { Text } = Typography;
type MenuItem = Required<MenuProps>['items'][number];

type LibraryListProps = {
  libraryTree: RendererRootLibraryTree;
  visible: boolean;
  renameRef: RefObject<ForwardRenameHandler>;
  onSelectLibrary: (lib: RendererLibraryTree) => void;
};

export function LibraryList(props: LibraryListProps) {
  const { libraryTree, visible, renameRef, onSelectLibrary } = props;
  const { setLibraryTree, createLibrary, renameLibrary, deleteLibrary } = useLibraryActions();
  const { message, modal } = App.useApp();

  const buildMenuItems = (): MenuItem[] => {
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
    const target = findLibraryNodeByIdPath(e.keyPath, libraryTree);
    if (target) {
      onSelectLibrary(target);
    }
  };

  return (
    <div className="library-sidebar-wrapper" style={{ display: visible ? 'flex' : 'none' }}>
      <WindowDragBox style={{ height: '40px', flexShrink: 0 }} />
      <div className="library-next-writer">NEXT-WRITER</div>
      <div className="library-sidebar-main">
        <div className="library-sidebar-menu">
          <Menu mode="inline" items={buildMenuItems()} onClick={onMenuClick} />
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
  );
}

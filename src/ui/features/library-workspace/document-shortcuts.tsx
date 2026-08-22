import { useCallback, useEffect, useState } from 'react';
import { PushpinFilled, PushpinOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { App, Button, Empty, List, Modal, Spin, Typography } from 'antd';
import type { RendererLibraryTree, WorkspaceMetadata } from '_types';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { findRendererNodeById } from 'src/ui/libs/renderer-tree';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';

const { Text } = Typography;

type DocumentShortcutsProps = {
  open: boolean;
  onClose: () => void;
};

type ShortcutSectionProps = {
  title: string;
  ids: string[];
  metadata: WorkspaceMetadata;
  findNote: (id: string) => RendererLibraryTree | null;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string, value: boolean) => void;
  onTogglePinned: (id: string, value: boolean) => void;
};

/** 展示置顶、收藏和最近打开文档，并通过主进程元数据服务执行快捷操作。 */
export function DocumentShortcuts({ open, onClose }: DocumentShortcutsProps) {
  const { message } = App.useApp();
  const { libraryTree } = useLibraryState();
  const { setCurrentLib, setCurrentNote } = useLibraryActions();
  const [metadata, setMetadata] = useState<WorkspaceMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMetadata = useCallback(async () => {
    setLoading(true);
    const response = await rendererGateway.getWorkspaceMetadata();
    setLoading(false);
    if (response.status !== 0) {
      message.error(response.message || '读取快捷文档失败');
      return;
    }
    setMetadata(response.data);
  }, [message]);

  useEffect(() => {
    if (open) {
      void loadMetadata();
    }
  }, [loadMetadata, open]);

  const findNote = useCallback((id: string) => findRendererNodeById(libraryTree, id), [libraryTree]);

  const openDocument = useCallback(
    (id: string) => {
      const note = findNote(id);
      if (!note) {
        message.warning('该文档已失效');
        void loadMetadata();
        return;
      }
      if (note.parent && 'type' in note.parent) {
        setCurrentLib(note.parent);
      }
      setCurrentNote(note);
      onClose();
    },
    [findNote, loadMetadata, message, onClose, setCurrentLib, setCurrentNote]
  );

  const updateMetadata = useCallback(
    async (request: Parameters<typeof rendererGateway.updateWorkspaceMetadata>[0]) => {
      const response = await rendererGateway.updateWorkspaceMetadata(request);
      if (response.status !== 0) {
        message.error(response.message || '更新快捷文档失败');
        return;
      }
      setMetadata(response.data);
    },
    [message]
  );

  const commonProps = metadata
    ? {
        metadata,
        findNote,
        onOpen: openDocument,
        onToggleFavorite: (id: string, value: boolean): void =>
          void updateMetadata({ action: 'set-favorite', id, value }),
        onTogglePinned: (id: string, value: boolean): void => void updateMetadata({ action: 'set-pinned', id, value })
      }
    : null;

  return (
    <Modal title="快捷文档" open={open} footer={null} width={640} onCancel={onClose}>
      <Spin spinning={loading}>
        {metadata && commonProps ? (
          <div className="document-shortcuts">
            <ShortcutSection title="置顶" ids={metadata.pinnedIds} {...commonProps} />
            <ShortcutSection title="收藏" ids={metadata.favoriteIds} {...commonProps} />
            <div className="document-shortcuts-section-title">
              <Text strong>最近打开</Text>
              {metadata.recent.length > 0 && (
                <Button type="link" size="small" onClick={() => void updateMetadata({ action: 'clear-recent' })}>
                  清除记录
                </Button>
              )}
            </div>
            <ShortcutSection title="" ids={metadata.recent.map(item => item.id)} {...commonProps} />
          </div>
        ) : (
          !loading && <Empty description="暂无快捷文档" />
        )}
      </Spin>
    </Modal>
  );
}

function ShortcutSection(props: ShortcutSectionProps) {
  const { title, ids, metadata, findNote, onOpen, onToggleFavorite, onTogglePinned } = props;
  return (
    <section className="document-shortcuts-section">
      {title && (
        <div className="document-shortcuts-section-title">
          <Text strong>{title}</Text>
        </div>
      )}
      <List
        size="small"
        dataSource={ids}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文档" /> }}
        renderItem={id => {
          const note = findNote(id);
          if (!note) {
            return null;
          }
          const favorite = metadata.favoriteIds.includes(id);
          const pinned = metadata.pinnedIds.includes(id);
          return (
            <List.Item
              className="document-shortcuts-item"
              onClick={() => onOpen(id)}
              actions={[
                <Button
                  key="favorite"
                  type="text"
                  title={favorite ? '取消收藏' : '收藏'}
                  aria-label={favorite ? '取消收藏' : '收藏'}
                  icon={favorite ? <StarFilled /> : <StarOutlined />}
                  onClick={event => {
                    event.stopPropagation();
                    onToggleFavorite(id, !favorite);
                  }}
                />,
                <Button
                  key="pin"
                  type="text"
                  title={pinned ? '取消置顶' : '置顶'}
                  aria-label={pinned ? '取消置顶' : '置顶'}
                  icon={pinned ? <PushpinFilled /> : <PushpinOutlined />}
                  onClick={event => {
                    event.stopPropagation();
                    onTogglePinned(id, !pinned);
                  }}
                />
              ]}
            >
              <List.Item.Meta title={note.name} description={metadata.recent.find(item => item.id === id)?.path} />
            </List.Item>
          );
        }}
      />
    </section>
  );
}

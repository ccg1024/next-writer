import type { RefObject } from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { App, Col, Row, Typography } from 'antd';
import { motion } from 'framer-motion';
import type { RendererLibraryTree } from '_types';
import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { VerticalEmpty } from 'src/ui/components/antd/preset/empty';
import { useLibraryActions } from 'src/ui/domain/library';
import { nwSpin } from 'src/ui/mix-components/spin';
import { NoteListItem } from './note-list-item';
import type { ForwardRenameHandler } from './rename-modal';

const { Text } = Typography;

type NoteListProps = {
  currentLib: RendererLibraryTree;
  currentNote: RendererLibraryTree;
  detailVisible: boolean;
  libraryVisible: boolean;
  renameRef: RefObject<ForwardRenameHandler>;
  onSelectNote: (note: RendererLibraryTree) => void;
};

export function NoteList(props: NoteListProps) {
  const { currentLib, currentNote, detailVisible, libraryVisible, renameRef, onSelectNote } = props;
  const { setLibraryTree, createNote } = useLibraryActions();
  const { message } = App.useApp();

  return (
    <div
      className="library-detail-wrapper"
      style={{
        paddingTop: !libraryVisible ? '32px' : '16px',
        display: detailVisible ? 'flex' : 'none'
      }}
    >
      {!libraryVisible && (
        <WindowDragBox style={{ height: '32px', top: 0, left: 0, width: '100%', position: 'absolute' }} />
      )}
      <NoteListHeader
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
              <NoteListItem key={note.name} note={note} activeNoteId={currentNote?.id} onNoteClick={onSelectNote} />
            ))
        ) : (
          <VerticalEmpty description="无笔记" />
        )}
      </div>
    </div>
  );
}

interface NoteListHeaderProps {
  lib: RendererLibraryTree;
  note: RendererLibraryTree;
  onAddNote: () => void;
}

const NoteListHeader = (props: NoteListHeaderProps) => {
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

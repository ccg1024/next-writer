import { Popover, Typography } from 'antd';
import type { FC } from 'react';
import type { RendererLibraryTree } from '_types';
import { nwSyntaxHighlight } from 'src/ui/hooks/useCodemirror';
import { useRunmode } from 'src/ui/hooks/useRunmode';

const { Title, Paragraph } = Typography;

interface NoteListItemProps {
  note: RendererLibraryTree;
  activeNoteId: string;
  onNoteClick: (note: RendererLibraryTree) => void;
}

export const NoteListItem: FC<NoteListItemProps> = props => {
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

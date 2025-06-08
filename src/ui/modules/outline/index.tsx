import { Line } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useState } from 'react';
import messagePublish from 'src/ui/libs/pub-sub';
import { HeadField, outlintField } from 'src/ui/plugins/fieldPlugin/outline';
import renderStore from '../store';
import './index.less';

// Using state field to store head info. and when editor update, trigger a publish event to here
// Using debounce to performance render

const Outline = () => {
  const [headList, setHeadList] = useState<HeadField[]>([]);
  useEffect(() => {
    function handle(view: EditorView) {
      const field = view.state.field(outlintField);
      setHeadList([...field.map(f => ({ ...f, text: f.text.replace(/^#+ /, '') }))]);
    }

    messagePublish.sub('docChanged', handle);
    messagePublish.sub('editorChanged', handle);

    return () => {
      messagePublish.unsub('docChanged', handle);
      messagePublish.unsub('editorChanged', handle);
    };
  }, []);

  const handleHeadClick = (line: Line) => {
    if (line) {
      const editor = renderStore.getEditor();
      editor.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, {
          y: 'start',
          yMargin: 17.5 // No reason was found for the 17.5px offset
        })
      });
    }
  };

  return (
    <div className="next-writer-outline-wrapper">
      <div className="next-writer-outline-content">
        {headList.map(head => (
          <div
            key={`${head.line.number} - ${head.text}`}
            className="next-writer-outline-item"
            onClick={() => handleHeadClick(head.line)}
          >
            {head.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Outline;

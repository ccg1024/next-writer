import { Line } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useState } from 'react';
import messagePublish from 'src/ui/libs/pub-sub';
import { HeadField, outlintField } from 'src/ui/plugins/fieldPlugin/outline';
import rendererIpcListener, { RendererIpcActionCallback } from '../ipc';
import renderStore from '../store';
import './index.less';

type RenderHeadField = HeadField & {
  renderLevel: number;
};

// Using state field to store head info. and when editor update, trigger a publish event to here
// Using debounce to performance render

const Outline = () => {
  const [headList, setHeadList] = useState<RenderHeadField[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handle(view: EditorView) {
      const field = view.state.field(outlintField);
      const tiers: number[] = [];
      field.forEach(f => {
        if (!tiers.includes(f.level)) {
          tiers.push(f.level);
        }
      });
      tiers.sort();
      setHeadList([
        ...field.map(f => {
          return { ...f, text: f.text.replace(/^#+ /, ''), renderLevel: tiers.indexOf(f.level) };
        })
      ]);
    }

    messagePublish.sub('docChanged', handle);
    messagePublish.sub('editorChanged', handle);

    return () => {
      messagePublish.unsub('docChanged', handle);
      messagePublish.unsub('editorChanged', handle);
    };
  }, []);

  useEffect(() => {
    const toggleToc: RendererIpcActionCallback = (_e, action) => {
      if (action.type === 'toggle-toc') {
        setVisible(!!action.payload);
      }
    };
    toggleToc.type = 'toggle-toc';
    rendererIpcListener.register(toggleToc);
    return () => {
      rendererIpcListener.deregister(toggleToc);
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
    <div className="next-writer-outline-wrapper" style={{ display: visible ? 'block' : 'none' }}>
      <div className="next-writer-outline-head">大纲</div>
      <div className="next-writer-outline-content">
        {headList.map(head => (
          <div
            key={`${head.line.number} - ${head.text}`}
            className="next-writer-outline-item"
            onClick={() => handleHeadClick(head.line)}
          >
            <span style={{ paddingLeft: head.renderLevel * 10 }}>{head.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Outline;

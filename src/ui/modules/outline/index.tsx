import { useRendererCommand } from 'src/ui/shared/renderer-command';
import { useEditorActions, useEditorState } from 'src/ui/domain/editor';
import { useRuntimeLayout } from 'src/ui/domain/runtime';
import './index.less';

const Outline = () => {
  const { headList } = useEditorState();
  const { scrollToLine } = useEditorActions();
  const { tocVisible, setTocVisible } = useRuntimeLayout();

  useRendererCommand('toggle-toc', (_e, action) => {
    setTocVisible(!!action.payload);
  });

  return (
    <div className="next-writer-outline-wrapper" style={{ display: tocVisible ? 'block' : 'none' }}>
      <div className="next-writer-outline-head">大纲</div>
      <div className="next-writer-outline-content">
        {headList.map(head => (
          <div
            key={`${head.line.number} - ${head.text}`}
            className="next-writer-outline-item"
            onClick={() => scrollToLine(head.line)}
          >
            <span style={{ paddingLeft: head.renderLevel * 10 }}>{head.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Outline;

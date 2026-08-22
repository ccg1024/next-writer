import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { App, Button, Checkbox, Empty, Input, List, Modal, Spin, Typography } from 'antd';
import { EditorView } from '@codemirror/view';
import type { WorkspaceSearchResult } from '_types';
import { useEditorState } from 'src/ui/domain/editor';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { findRendererNodeById } from 'src/ui/libs/renderer-tree';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import { useRendererCommand } from 'src/ui/shared/renderer-command';

const { Text } = Typography;
const SEARCH_PAGE_SIZE = 50;

type PendingLocation = {
  result: WorkspaceSearchResult;
  previousEditor: EditorView | null;
};

type WorkspaceSearchProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

/** 工作区搜索浮层：请求主进程索引，并将选中结果映射回文库与 CodeMirror 位置。 */
export function WorkspaceSearch({ open, onOpen, onClose }: WorkspaceSearchProps) {
  const { message } = App.useApp();
  const { libraryTree, currentNote } = useLibraryState();
  const { setCurrentLib, setCurrentNote } = useLibraryActions();
  const { editor } = useEditorState();
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [fuzzy, setFuzzy] = useState(true);
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);
  const requestSequence = useRef(0);

  useRendererCommand('search-workspace', onOpen);

  const search = useCallback(
    async (offset: number) => {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setResults([]);
        setTotal(0);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const sequence = ++requestSequence.current;
      setLoading(true);
      const response = await rendererGateway.searchWorkspace({
        query: normalizedQuery,
        caseSensitive,
        fuzzy,
        offset,
        limit: SEARCH_PAGE_SIZE
      });
      if (sequence !== requestSequence.current) {
        return;
      }
      setLoading(false);
      if (response.status !== 0) {
        message.error(response.message || '搜索工作区失败');
        return;
      }
      setResults(previous => (offset === 0 ? response.data.results : [...previous, ...response.data.results]));
      setTotal(response.data.total);
      setHasMore(response.data.hasMore);
    },
    [caseSensitive, fuzzy, message, query]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => void search(0), 180);
    return () => clearTimeout(timer);
  }, [open, search]);

  useEffect(() => {
    if (
      !pendingLocation ||
      currentNote?.id !== pendingLocation.result.id ||
      !editor ||
      editor === pendingLocation.previousEditor
    ) {
      return;
    }

    const lineNumber = Math.min(Math.max(1, pendingLocation.result.line), editor.state.doc.lines);
    const line = editor.state.doc.line(lineNumber);
    const position = Math.min(line.to, line.from + Math.max(0, pendingLocation.result.column - 1));
    const matchLength = pendingLocation.result.matchEnd - pendingLocation.result.matchStart;
    const selectionEnd =
      pendingLocation.result.field === 'filename' ? position : Math.min(line.to, position + matchLength);
    editor.dispatch({
      selection: { anchor: position, head: selectionEnd },
      effects: EditorView.scrollIntoView(position, { y: 'center', yMargin: 24 })
    });
    editor.focus();
    setPendingLocation(null);
  }, [currentNote?.id, editor, pendingLocation]);

  const openResult = (result: WorkspaceSearchResult) => {
    const target = findRendererNodeById(libraryTree, result.id);
    if (!target) {
      message.warning('该搜索结果已失效，请等待索引更新后重试');
      return;
    }

    if (target.parent && 'type' in target.parent) {
      setCurrentLib(target.parent);
    }
    setPendingLocation({ result, previousEditor: currentNote?.id === target.id ? null : editor });
    setCurrentNote(target);
    onClose();
  };

  return (
    <Modal title="搜索工作区" open={open} footer={null} width={720} onCancel={onClose} destroyOnClose={false}>
      <Input
        autoFocus
        allowClear
        prefix={<SearchOutlined />}
        placeholder="搜索文件名、标题或正文"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onPressEnter={() => void search(0)}
      />
      <div className="workspace-search-options">
        <Checkbox checked={caseSensitive} onChange={event => setCaseSensitive(event.target.checked)}>
          区分大小写
        </Checkbox>
        <Checkbox checked={fuzzy} onChange={event => setFuzzy(event.target.checked)}>
          简单模糊匹配
        </Checkbox>
        {!!query.trim() && <Text type="secondary">{total} 条结果</Text>}
      </div>
      <Spin spinning={loading && results.length === 0}>
        <List
          className="workspace-search-results"
          dataSource={results}
          locale={{ emptyText: query.trim() && !loading ? <Empty description="没有匹配结果" /> : null }}
          renderItem={result => (
            <List.Item className="workspace-search-result" onClick={() => openResult(result)}>
              <List.Item.Meta
                title={
                  <span>
                    {result.title || result.name}
                    <Text type="secondary" className="workspace-search-location">
                      {result.path}:{result.line}
                    </Text>
                  </span>
                }
                description={<SearchContext result={result} />}
              />
            </List.Item>
          )}
          loadMore={
            hasMore ? (
              <div className="workspace-search-more">
                <Button loading={loading} onClick={() => void search(results.length)}>
                  继续加载
                </Button>
              </div>
            ) : null
          }
        />
      </Spin>
    </Modal>
  );
}

function SearchContext({ result }: { result: WorkspaceSearchResult }) {
  return (
    <span className="workspace-search-context">
      {result.context.slice(0, result.matchStart)}
      <mark>{result.context.slice(result.matchStart, result.matchEnd)}</mark>
      {result.context.slice(result.matchEnd)}
    </span>
  );
}

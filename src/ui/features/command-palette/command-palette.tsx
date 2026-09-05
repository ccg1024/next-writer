import { useEffect, useMemo, useState } from 'react';
import { App, Empty, Input, Modal, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useCommandRegistry } from 'src/ui/domain/command';

import './index.less';

const { Text } = Typography;
const CATEGORY_LABELS = {
  action: '操作',
  'recent-document': '最近打开',
  document: '文档',
  theme: '主题'
};

/** 统一的键盘优先命令面板，结果数据全部来自命令注册表。 */
export function CommandPalette() {
  const { message } = App.useApp();
  const { registry, revision, paletteOpen, openPalette, closePalette, execute } = useCommandRegistry();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = useMemo(() => registry.list(query, 100), [query, registry, revision]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLocaleLowerCase() === 'p') {
        event.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPalette]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      window.setTimeout(() => document.querySelector<HTMLInputElement>('.command-palette input')?.focus(), 0);
    }
  }, [paletteOpen]);

  useEffect(() => setSelectedIndex(0), [query]);

  const run = async (index: number) => {
    const result = results[index];
    if (!result || !result.availability.enabled || registry.isExecuting(result.command.id)) return;
    const execution = await execute(result.command.id);
    if (execution.success) closePalette();
    if (execution.success === false) message.error(execution.message);
  };

  return (
    <Modal
      className="command-palette"
      title="命令面板"
      open={paletteOpen}
      footer={null}
      width={680}
      onCancel={closePalette}
      afterClose={() => setQuery('')}
    >
      <Input
        aria-label="搜索命令、文档或主题"
        prefix={<SearchOutlined />}
        placeholder="搜索命令、文档或主题"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex(value => Math.min(results.length - 1, value + 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex(value => Math.max(0, value - 1));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            void run(selectedIndex);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            closePalette();
          }
        }}
      />
      <div className="command-palette-results" role="listbox">
        {results.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配结果" />
        ) : (
          results.map((result, index) => {
            const { command, availability } = result;
            const disabled = !availability.enabled || registry.isExecuting(command.id);
            return (
              <button
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                aria-disabled={disabled}
                className={`command-palette-item${index === selectedIndex ? ' selected' : ''}`}
                key={command.id}
                disabled={disabled}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => void run(index)}
              >
                <span className="command-palette-item-main">
                  <Text>{command.title}</Text>
                  {availability.reason && <Text type="secondary">{availability.reason}</Text>}
                </span>
                <span>
                  {command.shortcut && <Tag>{command.shortcut}</Tag>}
                  <Tag bordered={false}>{CATEGORY_LABELS[command.category]}</Tag>
                </span>
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}

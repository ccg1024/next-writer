import { DownOutlined, FileAddOutlined, FolderAddOutlined, MinusSquareOutlined, RedoOutlined } from '@ant-design/icons';
import { GetProps, message, Tree, TreeDataNode } from 'antd';
import { Key } from 'antd/es/table/interface';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { isEffectArray } from 'src/tools/utils';
import { WindowDragBox } from 'src/ui/components/drag';
import { useHomeContext } from 'src/ui/home/module.context';
import mainProcess from 'src/ui/libs/main-process';
import { LibraryTree, LibraryType, NormalObject } from '_types';
import './index.less';
import { AddModal, AddModalHandle, DelModal, DelModalHandle, DelModalTarget } from './modal';

type DirectoryTreeProps = GetProps<typeof Tree.DirectoryTree>;
type NextWriterTree = TreeDataNode & Partial<Omit<LibraryTree, 'children'>>;

const { DirectoryTree } = Tree;

const LibraryTitle: FC<{ title: string }> = ({ title }) => {
  return <span className="library-sidebar-title">{title}</span>;
};

const LibraryItem: FC<{ node: DelModalTarget; callback: (node: DelModalTarget) => void }> = props => {
  const { node, callback } = props;
  return (
    <div className="library-sidebar-item-wrapper">
      {node.title}
      <div
        className="library-sidebar-del-wrapper"
        onClick={e => {
          e.stopPropagation();
          callback(node);
        }}
      >
        <span className="reactive-icon">
          <MinusSquareOutlined />
        </span>
      </div>
    </div>
  );
};

const LibrarySidebar = () => {
  const [libTree, setLibTree] = useState<LibraryTree[]>(null);
  const [expandKeys, setExpandKeys] = useState<Key[]>(['']);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>(['']);
  const [_loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<NormalObject>(null);

  const addRef = useRef<AddModalHandle>(null);
  const delRef = useRef<DelModalHandle>(null);
  const { setCurrentLib, currentLib } = useHomeContext();

  // ============================================================
  // General settings
  // ============================================================
  const initData = useCallback(() => {
    setLibTree(null);
    setLoading(false);
  }, []);

  const reRequest = useCallback((parent?: string, reset?: boolean) => {
    if (parent || parent === '') {
      setExpandKeys(pre => [...pre, parent]);
    }
    if (reset) {
      setCurrentLib({ root: '', file: null });
    }
    setConditions({});
  }, []);

  useEffect(() => {
    initData();
    getLibraryTree();
  }, [initData, conditions]);

  // ============================================================
  // Request data
  // ============================================================
  async function getLibraryTree() {
    try {
      setLoading(true);
      const { status, data, message: msg } = await mainProcess.getLibrary();
      if (status === 0) {
        setLibTree(data ?? []);
      } else {
        message.error(msg ?? 'Got error when reading library');
      }
    } catch (err) {
      // ..
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // build ui
  // ============================================================
  const handleReactive = (type: LibraryType) => {
    addRef.current?.open(type);
  };

  const handleDelIcon = (node: DelModalTarget) => {
    delRef.current?.open(node);
  };

  const getParent = (current: string) => {
    const tokens = current?.split('/');
    tokens.pop();
    return tokens.join('/');
  };

  const getParents = (current: string) => {
    const parent = getParent(current);
    const parentToken = parent.split('/');
    const res: string[] = [''];
    if (isEffectArray(parentToken)) {
      parentToken.reduce((pre, cur) => {
        const sum = pre === '' ? cur : `${pre}/${cur}`;
        res.push(sum);
        return sum;
      }, '');
    }
    return res;
  };

  const libraryHead = (
    <div className="library-sidebar-lib-head">
      <LibraryTitle title="资源库" />
      <div className="library-sidebar-reactive-icon-wrapper" onClick={e => e.stopPropagation()}>
        <span className="reactive-icon" onClick={() => handleReactive('file')}>
          <FileAddOutlined />
        </span>
        <span className="reactive-icon" onClick={() => handleReactive('folder')}>
          <FolderAddOutlined />
        </span>
        <span
          className="reactive-icon"
          onClick={() => {
            setExpandKeys(pre => Array.from(new Set([...pre, ...getParents(currentLib?.file ?? '')])));
            setSelectedKeys([currentLib?.file ?? '']);
          }}
        >
          <RedoOutlined />
        </span>
      </div>
    </div>
  );

  const wrapMenu = (): NextWriterTree[] => {
    const inner = (libs: LibraryTree[], parent: LibraryTree) => {
      if (isEffectArray(libs)) {
        return libs
          .map(lib => {
            let children: NextWriterTree[] = null;
            if (isEffectArray(lib.children)) {
              children = inner(lib.children, lib);
            }
            const _key = parent ? `${parent.name}/${lib.name}` : lib.name;
            return {
              ...lib,
              key: _key,
              title: <LibraryItem node={{ title: lib.name, path: _key, type: lib.type }} callback={handleDelIcon} />,
              children: children,
              isLeaf: lib.type === 'file'
            };
          })
          .sort((a, b) => {
            if (a.type === 'file' && b.type === 'folder') {
              return 1;
            } else if (a.type === 'folder' && b.type === 'file') {
              return -1;
            }
            return 0;
          });
      }
      return [];
    };

    const formattedLib = inner(libTree, null);

    return [
      {
        key: '',
        title: libraryHead,
        isLeaf: false,
        type: 'folder',
        children: formattedLib
      }
    ];
  };

  const onSelect: DirectoryTreeProps['onSelect'] = (keys, info) => {
    const selected = keys?.[0] as string;
    if ((info.node as NextWriterTree)?.type === 'file') {
      setCurrentLib({ file: selected, root: getParent(selected) ?? '' });
    }
    if ((info.node as NextWriterTree)?.type === 'folder') {
      setCurrentLib({ root: selected });
    }
    setSelectedKeys(keys);
  };

  const onExpand: DirectoryTreeProps['onExpand'] = keys => {
    setExpandKeys(keys);
  };

  const wrappedMenu = wrapMenu();

  return (
    <div className="library-sidebar-wrapper">
      <WindowDragBox style={{ height: '40px' }} />
      <div className="library-next-writer">NEXT-WRITER</div>
      <DirectoryTree
        treeData={wrappedMenu}
        showIcon={false}
        switcherIcon={<DownOutlined />}
        className="library-sidebar-directory-tree"
        selectedKeys={selectedKeys}
        onSelect={onSelect}
        expandedKeys={expandKeys}
        onExpand={onExpand}
      />
      <AddModal ref={addRef} callback={reRequest} />
      <DelModal ref={delRef} callback={reRequest} />
    </div>
  );
};

export default LibrarySidebar;

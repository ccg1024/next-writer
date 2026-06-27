import React, { useImperativeHandle, useState } from 'react';
import { Button, Form, Input, Modal } from 'antd';
import { getPromise } from 'src/tools/utils';

type RenameModalConfig = {
  title?: React.ReactNode;
};

export interface ForwardRenameHandler {
  show(oldName: string, callback?: (newName: string) => void, config?: RenameModalConfig): Promise<{ newName: string }>;
}

type StoreCallback = (name: string) => void;

const renameModalStore: {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  callback?: StoreCallback;
} = {
  resolve: null,
  reject: null,
  callback: null
};

const RenameModal: React.ForwardRefRenderFunction<ForwardRenameHandler> = (_, ref) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<RenameModalConfig>(null);
  const [form] = Form.useForm();

  useImperativeHandle(
    ref,
    () => ({
      show(oldName, callback, config) {
        form.resetFields();
        form.setFieldValue('name', oldName);
        const [promise, resolve, reject] = getPromise<{ newName: string }>();
        renameModalStore.resolve = resolve;
        renameModalStore.reject = reject;
        renameModalStore.callback = callback;
        setOpen(true);
        setConfig(config);
        return promise;
      }
    }),
    [form]
  );

  const close = () => {
    setOpen(false);
    renameModalStore.callback = null;
    renameModalStore.reject = null;
    renameModalStore.resolve = null;
  };

  return (
    <Modal
      title={config?.title ?? '重命名'}
      open={open}
      footer={[
        <Button key="cancle" onClick={close}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={async () => {
            try {
              await form.validateFields();
              const newName = form.getFieldValue('name');
              if (renameModalStore.callback) {
                renameModalStore.callback(newName);
              }
              if (renameModalStore.resolve) {
                renameModalStore.resolve(newName);
              }

              close();
            } catch (_) {
              // ..
            }
          }}
        >
          确认
        </Button>
      ]}
      onCancel={close}
    >
      <Form form={form}>
        <Form.Item name="name" rules={[{ required: true, message: '不能为空' }]} required>
          <Input placeholder="请输入" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const ForwardRenameModal = React.forwardRef(RenameModal);

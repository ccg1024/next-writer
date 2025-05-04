import React, { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Form, Input, Button, FormInstance } from 'antd';
import { LibraryType } from '_types';

export interface InputResolveHandle {
  open(type: LibraryType, resolve: (form: FormInstance) => void, reject: (reason?: unknown) => void): void;
}

/**
 * Trigger a modal to resolve input
 */
const InputResolveModal = React.forwardRef<InputResolveHandle>((_props, ref) => {
  const [visible, setVisible] = useState(false);
  const [optionType, setOptionType] = useState<LibraryType>(null);
  const [form] = Form.useForm();
  const promiseRef = useRef<{ resolve: (form: FormInstance) => void; reject: (reason?: unknown) => void }>(null);

  // ============================================================
  // Exposed handler
  // ============================================================
  useImperativeHandle(
    ref,
    () => ({
      open(type, resolve, reject) {
        setVisible(true);
        setOptionType(type);
        promiseRef.current = { resolve, reject };
      }
    }),
    []
  );

  // ============================================================
  // General settings
  // ============================================================
  useLayoutEffect(() => {
    if (visible && form) {
      form.resetFields();
    }
  }, [visible]);

  // ============================================================
  // Build ui
  // ============================================================
  const closeModal = () => {
    setVisible(false);
  };

  return (
    <Modal
      title={optionType === 'file' ? '添加文件' : '添加库'}
      open={visible}
      onCancel={closeModal}
      footer={
        <>
          <Button onClick={closeModal}>取消</Button>
          <Button
            type="primary"
            onClick={() => {
              promiseRef.current?.resolve(form);
              closeModal();
            }}
          >
            确认
          </Button>
        </>
      }
      destroyOnClose
    >
      <div>
        <Form form={form}>
          <Form.Item
            name="name"
            rules={[
              {
                required: true,
                message: '请输入名称'
              }
            ]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
});

export default InputResolveModal;

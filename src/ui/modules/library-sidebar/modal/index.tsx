import React, { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Form, Input, Button, FormInstance, Typography } from 'antd';
import { LibraryType, RendererLibraryTree } from '_types';

const { Text } = Typography;

type OperateOpt = {
  isDelete: boolean;
  lib?: RendererLibraryTree;
  note?: RendererLibraryTree;
};

export interface InputResolveHandle {
  open(
    type: LibraryType,
    resolve: (form: FormInstance) => void,
    reject: (reason?: unknown) => void,
    opt?: OperateOpt
  ): void;
}

/**
 * Trigger a modal to resolve input
 */
const InputResolveModal = React.forwardRef<InputResolveHandle>((_props, ref) => {
  const [visible, setVisible] = useState(false);
  const [optionType, setOptionType] = useState<LibraryType>(null);
  const [operateOpt, setOperateOpt] = useState<OperateOpt>(null);
  const [form] = Form.useForm();
  const promiseRef = useRef<{ resolve: (form: FormInstance) => void; reject: (reason?: unknown) => void }>(null);

  // ============================================================
  // Exposed handler
  // ============================================================
  useImperativeHandle(
    ref,
    () => ({
      open(type, resolve, reject, opt) {
        setVisible(true);
        setOptionType(type);
        setOperateOpt(opt ?? null);
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

  const title = () => {
    if (operateOpt?.isDelete) {
      return optionType === 'file' ? '删除文件' : '删除库';
    }

    return optionType === 'file' ? '添加文件' : '添加库';
  };

  const modalContent = () => {
    if (operateOpt?.isDelete) {
      if (optionType === 'file') {
        return <Text>确定删除笔记：{operateOpt?.note?.name}</Text>;
      }

      return <Text>确定删除库：{operateOpt?.lib?.name}</Text>;
    }

    return (
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
    );
  };

  return (
    <Modal
      title={title()}
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
        <Form form={form}>{modalContent()}</Form>
      </div>
    </Modal>
  );
});

export default InputResolveModal;

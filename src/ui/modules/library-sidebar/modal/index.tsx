import { Modal, Form, Input, Button, message, Typography } from 'antd';
import React, { useEffect, useImperativeHandle, useState } from 'react';
import { useHomeContext } from 'src/ui/home/module.context';
import mainProcess from 'src/ui/libs/main-process';
import { LibraryType } from '_types';

const { Paragraph } = Typography;

export interface AddModalHandle {
  open(type: LibraryType): void;
}

interface AddModalProps {
  callback: (parent?: string, reset?: boolean, type?: LibraryType) => void;
}

export const AddModal = React.forwardRef<AddModalHandle, AddModalProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [optionType, setOptionType] = useState<LibraryType>(null);
  const [form] = Form.useForm();

  const { currentLib } = useHomeContext();

  // ============================================================
  // Exposed handler
  // ============================================================
  useImperativeHandle(
    ref,
    () => ({
      open(type) {
        setVisible(true);
        setOptionType(type);
      }
    }),
    []
  );

  // ============================================================
  // General settings
  // ============================================================
  useEffect(() => {
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

  const handleSubmit = async () => {
    try {
      const formData = await form.validateFields();
      const { status, message: msg } =
        (await mainProcess.addLibOrFile({
          type: optionType,
          path: optionType === 'folder' ? '' : (currentLib?.root ?? ''),
          title: formData.name
        })) ?? {};
      if (status === 0) {
        props.callback && props.callback();
        closeModal();
      } else {
        message.error(msg ?? 'Some thing error when add library or file');
      }
    } catch (err) {
      console.log(typeof err === 'string' ? err : err?.message);
    }
  };

  return (
    <Modal
      title={optionType === 'file' ? '添加文件' : '添加库'}
      open={visible}
      onCancel={closeModal}
      footer={
        <>
          <Button onClick={closeModal}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
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

export type DelModalTarget = {
  path: string;
  title: string;
  type: LibraryType;
};

export interface DelModalHandle {
  open(target: DelModalTarget): void;
}

interface DelModalProps {
  callback: (parent?: string, reset?: boolean, type?: LibraryType) => void;
}

export const DelModal = React.forwardRef<DelModalHandle, DelModalProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<DelModalTarget>(null);

  const { currentLib } = useHomeContext();
  // ============================================================
  // Exposed handle
  // ============================================================
  useImperativeHandle(
    ref,
    () => ({
      open(target) {
        setVisible(true);
        setTarget(target);
      }
    }),
    []
  );

  // ============================================================
  // Build ui
  // ============================================================
  const closeModal = () => {
    setVisible(false);
  };

  const delOption = async () => {
    if (target) {
      try {
        // Should not pass title to main process, since main process try to join path and title
        const { status, message: msg } = await mainProcess.delLibOrFile({ ...target, title: '' });
        if (status === 0) {
          const shouldReset = target.type === 'file' ? true : currentLib.root === target.path;
          props.callback && props.callback(null, shouldReset, target.type);
          closeModal();
        } else {
          message.error(msg ?? 'Some thing wrong when delete file or lib');
        }
      } catch (err) {
        // ..
      }
    }
  };

  return (
    <Modal
      title={`删除${target?.type === 'file' ? '文件' : '库'}`}
      open={visible}
      width={400}
      onCancel={closeModal}
      footer={
        <>
          <Button onClick={closeModal}>取消</Button>
          <Button type="primary" onClick={delOption}>
            确定
          </Button>
        </>
      }
      destroyOnClose
    >
      <div>
        <Paragraph>
          确定删除{target?.type === 'file' ? '文件' : '库'}
          {target?.title}
        </Paragraph>
      </div>
    </Modal>
  );
});

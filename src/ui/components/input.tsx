import React, { FC, useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { CloseIcon, Mask, Spinner } from './utils'
import { PubSubData, RenderNewFileType } from 'src/types/renderer'
import { fileAndFolderNameCheck, Post } from '../libs/utils'
import { AddFileBody } from '_common_type'

const InputWraper = styled.div`
  padding: 10px;
  border-radius: var(--nw-border-radius-sm);
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50vw;
  background-color: white;
  box-sizing: border-box;
`
const ErrorMessage = styled.div`
  color: red;
  line-height: 1em;
  margin-top: 5px;
  box-sizing: border-box;
`

type GlobalInputProps = {
  placehover?: string
}
export const GlobalInput: FC<GlobalInputProps> = (props): JSX.Element => {
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [editable, setEditable] = useState(true)
  const [_placehover, _setPlacehover] = useState('')
  const replyInfo = useRef<RenderNewFileType>({
    pathType: 'file',
    replyType: '',
    replyChannel: '',
    pathPrefix: '.'
  })
  const { placehover } = props
  const formClass = css`
    position: relative;
  `
  const inputClass = css`
    border-radius: var(--nw-border-radius-sm);
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
    font-size: 1em;
    &:focus {
      outline-color: #4299e1;
    }
  `
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // remove preview error
    setError('')
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    const inputInfo = formData.get('globalInput')

    if (!inputInfo) {
      setError(`${_placehover}不能为空!`)
      return
    }

    if (!fileAndFolderNameCheck(inputInfo as string)) {
      setError(`${_placehover}只能为数字、字母、中文`)
      return
    }

    if (!replyInfo.current) throw 'the reply channel is empty'

    const postData: AddFileBody = {
      path: [replyInfo.current.pathPrefix, inputInfo].join('/'),
      option: replyInfo.current.pathType
    }

    Post('render-to-main-to-render', {
      type: 'add-file-from-render',
      data: postData
    })
      .then(res => {
        if (res.data !== 'success')
          setError('The response body data not equal success')

        PubSub.publish(replyInfo.current.replyChannel, {
          type: replyInfo.current.replyType,
          data: {
            pathType: replyInfo.current.pathType,
            pathName: inputInfo,
            parent: replyInfo.current.pathPrefix
          }
        } as PubSubData)
        setVisible(false)
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
        setEditable(true)
      })

    // show waiting ui and disable input edit
    setLoading(true)
    setEditable(false)
  }

  function pubsubListen(_: string, data: PubSubData) {
    // Listen to other component messages
    // and return input information in form submit.
    // data.data represents the component that
    // sends the message and form will use is to reply message.
    if (!data) return

    const _data = data.data as RenderNewFileType

    replyInfo.current = _data
    // remove preview error
    setError('')
    setVisible(true)
    _setPlacehover(_data.pathType === 'file' ? '文件名' : '文件夹名')
  }

  useEffect(() => {
    const token = PubSub.subscribe('nw-input-pubsub', pubsubListen)

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [])

  return (
    <>
      {visible && (
        <>
          <Mask />
          <InputWraper>
            <div
              className={css`
                width: 100%;
                height: 20px;
                display: flex;
                justify-content: end;
                &:hover {
                  cursor: pointer;
                }
              `}
            >
              <CloseIcon onClick={() => setVisible(false)} />
            </div>
            <form onSubmit={onSubmit} className={formClass}>
              <input
                type="text"
                placeholder={_placehover ? _placehover : placehover}
                className={inputClass}
                name="globalInput"
                disabled={!editable}
              />
              {loading && (
                <Spinner
                  className="right-center-absolute"
                  style={{ right: '10px' }}
                />
              )}
            </form>
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </InputWraper>
        </>
      )}
    </>
  )
}

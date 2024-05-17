import React, { FC, useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { CloseIcon, Mask, Spinner } from './utils'
import { fileAndFolderNameCheck, Post } from '../libs/utils'
import { AddFileItem } from '_types'
import { TWO_WAY_CHANNEL } from 'src/config/ipc'
import { pub, sub, unsub, RenderNewFileType } from '../libs/pubsub'

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
  const [inputInfo, setInputInfo] = useState<string>(null)
  const replyInfo = useRef<RenderNewFileType>({
    pathType: 'file',
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

    if (!replyInfo.current || !replyInfo.current.replyChannel)
      throw 'the reply channel is empty'

    const postData: AddFileItem = {
      path: [replyInfo.current.pathPrefix, inputInfo].join('/'),
      option: replyInfo.current.pathType
    }

    Post(TWO_WAY_CHANNEL, {
      type: 'add-file-from-render',
      data: postData
    })
      .then(res => {
        if (!res) return
        if (res.data.status !== 'success')
          setError('The response body data not equal success')

        pub(replyInfo.current.replyChannel, {
          type: replyInfo.current.replyType,
          data: {
            pathType: replyInfo.current.pathType,
            pathName: inputInfo as string,
            parent: replyInfo.current.pathPrefix
          }
        })
        // PubSub.publish(replyInfo.current.replyChannel, {
        //   type: replyInfo.current.replyType,
        //   data: {
        //     pathType: replyInfo.current.pathType,
        //     pathName: inputInfo,
        //     parent: replyInfo.current.pathPrefix
        //   }
        // } as PubSubData)
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

  // function pubsubListen(_: string, payload: PubSubData) {
  //   // Listen to other component messages
  //   // and return input information in form submit.
  //   // data.data represents the component that
  //   // sends the message and form will use is to reply message.
  //   if (!payload) return
  //
  //   const _data = payload.data as RenderNewFileType
  //
  //   replyInfo.current = _data
  //   // remove preview error
  //   setError('')
  //   setVisible(true)
  //   _setPlacehover(_data.pathType === 'file' ? '文件名' : '文件夹名')
  // }

  useEffect(() => {
    // const token = PubSub.subscribe('nw-input-pubsub', pubsubListen)
    const token = sub('nw-input-pubsub', (_, payload) => {
      if (!payload) return
      const { pathType, replyType, replyChannel, pathPrefix } = payload.data
      replyInfo.current = {
        pathType,
        replyChannel,
        replyType,
        pathPrefix
      }

      setError('')
      setVisible(true)
      _setPlacehover(pathType === 'file' ? '文件名' : '文件夹名')
      setInputInfo(`路径: ${pathPrefix.split('/').join(' > ')}`)
    })

    return () => {
      unsub(token)
      // PubSub.unsubscribe(token)
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
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
              `}
            >
              <div
                style={{ lineHeight: 1, fontSize: '0.8em', paddingLeft: '2px' }}
              >
                {inputInfo}
              </div>
              <CloseIcon onClick={() => setVisible(false)} />
            </div>
            <form onSubmit={onSubmit} className={formClass}>
              <input
                type="text"
                placeholder={_placehover ? _placehover : placehover}
                className={inputClass}
                name="globalInput"
                disabled={!editable}
                autoFocus
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

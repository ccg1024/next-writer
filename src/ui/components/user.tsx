import { FC, useEffect, useRef } from 'react'
import { css } from '@emotion/css'
import { TiUser, TiDocumentAdd, TiFolderAdd } from 'react-icons/ti'
import { AnimateClickDiv, InlineFlex } from './utils'
import { useHoverShow } from '../hooks/useHoverShow'
import { PubSubData, RenderNewFileType } from 'src/types/renderer'

const User: FC = (): JSX.Element => {
  const refUser = useRef<HTMLDivElement>(null)

  const visible = useHoverShow<HTMLDivElement>({
    target: refUser
  })

  function triggerInput(type: string) {
    PubSub.publish('nw-input-pubsub', {
      data: {
        pathType: type,
        replyChannel: 'nw-user-pubsub',
        replyType: 'nw-user-pubsub-reply',
        pathPrefix: '.'
      } as RenderNewFileType
    })
  }

  useEffect(() => {
    function listener(_: string, data: PubSubData) {
      if (!data) return

      if (data.type === 'nw-user-pubsub-reply') {
        // reply message
        const replyData = data.data

        // send message to filesystem component
        PubSub.publish('nw-filesystem-pubsub', {
          type: 'nw-filesystem-add',
          data: replyData
        })
      }
    }
    // listen GlobalInput reply.
    const token = PubSub.subscribe('nw-user-pubsub', listener)

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [])

  const addEffect = visible && (
    <div
      className={css`
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
      `}
    >
      <InlineFlex>
        <AnimateClickDiv
          onClick={() => {
            triggerInput('file')
          }}
          child={<TiDocumentAdd className="icon-hover" />}
        />
        <AnimateClickDiv
          onClick={() => {
            triggerInput('folder')
          }}
          child={<TiFolderAdd className="icon-hover" />}
        />
      </InlineFlex>
    </div>
  )

  return (
    <div className="user-main no-select">
      <div ref={refUser} className="user-content">
        <InlineFlex>
          <TiUser className="fixed-flex-item" />
          <span className="text-hide">用户信息</span>
        </InlineFlex>
        {addEffect}
      </div>
    </div>
  )
}

export default User

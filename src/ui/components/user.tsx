import { FC, useRef } from 'react'
import { css } from '@emotion/css'
import { TiUser, TiDocumentAdd, TiFolderAdd } from 'react-icons/ti'
import { AnimateClickDiv, InlineFlex } from './utils'
import { useHoverShow } from '../hooks/useHoverShow'

const User: FC = (): JSX.Element => {
  const refUser = useRef<HTMLDivElement>(null)

  const visible = useHoverShow<HTMLDivElement>({
    target: refUser
  })
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
        <AnimateClickDiv child={<TiDocumentAdd className="icon-hover" />} />
        <AnimateClickDiv child={<TiFolderAdd className="icon-hover" />} />
      </InlineFlex>
    </div>
  )

  return (
    <div className="user-main no-select">
      <div ref={refUser} className="user-content">
        <InlineFlex>
          <TiUser />
          <span>用户信息</span>
        </InlineFlex>
        {addEffect}
      </div>
    </div>
  )
}

export default User

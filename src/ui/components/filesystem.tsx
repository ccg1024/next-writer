import { FC } from 'react'
import { TiFolder } from 'react-icons/ti'
import { InlineFlex } from './utils'

const Filesystem: FC = (): JSX.Element => {
  return (
    <div className="filesystem-main no-select">
      <div className="filesystem-content">
        <div className="filesystem-item">
          <InlineFlex>
            <TiFolder />
            <span>文件1</span>
          </InlineFlex>
        </div>

        <div className="filesystem-item">
          <InlineFlex>
            <TiFolder />
            <span>文件2</span>
          </InlineFlex>
        </div>
      </div>
    </div>
  )
}

export default Filesystem

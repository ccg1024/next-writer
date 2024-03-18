import { FC, useState } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { AnimateHoverBox } from './utils'
import { useWorkStation } from '../hooks/useComponentEffect'
import { reversePath } from '../libs/utils'

interface Props {
  currentFile: string
}

const BroadCast: FC<Props> = (props): JSX.Element => {
  const [showHover, setShowHover] = useState(false)

  function makeBroadcast(path: string) {
    return path.split('/').reverse().join('/')
  }
  function toggleHover() {
    setShowHover(v => !v)
  }
  return (
    <div className="broadcast-main">
      <div className="broadcast-content" onClick={toggleHover}>
        {props.currentFile ? makeBroadcast(props.currentFile) : 'next Writer'}
      </div>
      <AnimateHoverBox
        visible={showHover}
        x="right"
        y="top"
        yOffset={'20px'}
        nTranslate={'100%, 0'}
        zIndex={100}
      >
        <WorkstationMonitor rendererStation={props.currentFile} />
      </AnimateHoverBox>
    </div>
  )
}

type WorkstationMonitorProps = {
  rendererStation: string
}
type BasicHeadProps = {
  head: string
  className?: string
}

const BasicHead: FC<BasicHeadProps> = props => (
  <span className={props.className}>{props.head || 'next Writer'}: </span>
)

const WorkstationMonitorItem = styled.div`
  display: flex;
  gap: 10px;
  white-space: nowrap;
  justify-content: space-between;
`
const WorkstationMonitorHead = styled(BasicHead)`
  font-weight: bold;
`

const Ellipsis = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const WorkstationMonitor: FC<WorkstationMonitorProps> = props => {
  const { rendererStation } = props
  const workstation = useWorkStation(rendererStation)

  const mainer = workstation ? reversePath(workstation) : 'EMPTY'
  const renderer = rendererStation ? reversePath(rendererStation) : 'EMPTY'
  return (
    <div
      className={css`
        box-sizing: border-box;
      `}
    >
      <WorkstationMonitorItem>
        <WorkstationMonitorHead head="Status" />
        <span
          className={css`
            font-weight: bold;
            color: ${workstation === rendererStation ? 'green' : 'red'};
          `}
        >
          {workstation === rendererStation ? 'OK' : 'ERROR'}
        </span>
      </WorkstationMonitorItem>
      <WorkstationMonitorItem>
        <WorkstationMonitorHead head="Mainer" />
        <Ellipsis>{mainer}</Ellipsis>
      </WorkstationMonitorItem>
      <WorkstationMonitorItem>
        <WorkstationMonitorHead head="Renderer" />
        <Ellipsis>{renderer}</Ellipsis>
      </WorkstationMonitorItem>
    </div>
  )
}

export default BroadCast

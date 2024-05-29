import { FC, useState } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { TiDocumentText } from 'react-icons/ti'
import { InlineFlex, Spinner } from './utils'
import { useWorkStation } from '../hooks/useComponentEffect'
import { reversePath } from '../libs/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useLibraryContext } from '../contexts/library-context'

const BroadCast: FC = (): JSX.Element => {
  const [showHover, setShowHover] = useState(false)
  const { currentFile } = useLibraryContext()
  const { station: workstation, loading, equal } = useWorkStation(currentFile)

  function makeBroadcast(path: string) {
    return path.split('/').reverse().join(' > ')
  }
  function toggleHover() {
    setShowHover(v => !v)
  }
  return (
    <div className="broadcast-main">
      <div
        className={css({
          padding: '10px',
          backgroundColor: equal
            ? 'var(--nw-color-blackAlpha-50)'
            : 'var(--nw-color-redAlpha-600)',
          borderRadius: '5px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          userSelect: 'none',
          ':hover': {
            backgroundColor: equal
              ? 'var(--nw-color-blackAlpha-100)'
              : 'var(--nw-color-redAlpha-800)'
          }
        })}
        onClick={toggleHover}
      >
        <InlineFlex>
          <TiDocumentText className="fixed-flex-item" />
          <span className="text-hide">
            {currentFile ? makeBroadcast(currentFile) : 'Next Writer'}
          </span>
        </InlineFlex>
      </div>
      <AnimatePresence initial={false} mode="wait">
        {showHover && (
          <motion.div
            initial={{ right: '25px', opacity: 0 }}
            animate={{ right: '5px', opacity: 1 }}
            exit={{ right: '25px', opacity: 0 }}
            className={css({
              position: 'absolute',
              zIndex: 100,
              top: 0,
              right: '5px',
              transform: 'translateX(100%)',
              backgroundColor: 'white',
              boxShadow: 'var(--nw-box-shadow-md)',
              padding: '10px',
              borderRadius: 'var(--nw-border-radius-md)'
            })}
          >
            <WorkstationMonitor
              rendererStation={currentFile}
              workstation={workstation}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* <AnimateHoverBox */}
      {/*   visible={showHover} */}
      {/*   x="right" */}
      {/*   y="top" */}
      {/*   yOffset={'20px'} */}
      {/*   nTranslate={'100%, 0'} */}
      {/*   zIndex={100} */}
      {/* > */}
      {/*   <WorkstationMonitor rendererStation={props.currentFile} /> */}
      {/* </AnimateHoverBox> */}
      {loading && (
        <div
          className={css({
            position: 'absolute',
            top: '50%',
            right: '10px',
            transform: 'translateY(-50%)'
          })}
        >
          <Spinner />
        </div>
      )}
    </div>
  )
}

type WorkstationMonitorProps = {
  rendererStation: string
  workstation: string
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
  const { rendererStation, workstation } = props

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

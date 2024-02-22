import { FC, MutableRefObject, useEffect, useRef } from 'react'

type ResizerProps = {
  parentRef: MutableRefObject<HTMLDivElement>
  borderSize?: number
  borderColor?: string
  minWidth?: number
}
const Resizer: FC<ResizerProps> = (props): JSX.Element => {
  const { parentRef, borderSize, borderColor, minWidth } = props
  const resizerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (parentRef.current && resizerRef.current) {
      const parent = parentRef.current
      const resizer = resizerRef.current
      let isResizing = false

      // add event listner
      resizer.addEventListener('mousedown', handleMouseDown)

      /*eslint no-inner-declarations: [0]*/
      function handleMouseDown() {
        isResizing = true
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
      }
      function handleMouseUp() {
        isResizing = false
        document.removeEventListener('mousemove', handleMouseMove)
      }
      function handleMouseMove(event: MouseEvent) {
        if (isResizing) {
          const newWidth = event.clientX - parent.getBoundingClientRect().left
          if (typeof minWidth !== 'number' || minWidth <= newWidth) {
            parent.style.width = `${newWidth}px`
          }
        }
      }

      return () => {
        resizer.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [minWidth])

  return (
    <div
      ref={resizerRef}
      style={{
        width: borderSize && borderSize > 0 ? `${borderSize}px` : '2px',
        height: '100%',
        cursor: 'ew-resize',
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: borderColor ? borderColor : 'unset',
        userSelect: 'none'
      }}
    ></div>
  )
}

export default Resizer

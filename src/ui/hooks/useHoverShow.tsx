import { MutableRefObject, useEffect, useState } from 'react'

interface Props<T> {
  target: MutableRefObject<T | null>
}
export const useHoverShow = <T extends Element>(props: Props<T>): boolean => {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const { current } = props.target

    if (!current) return

    const mouseEnter = () => {
      setTimeout(() => {
        if (!current.matches(':hover')) return
        setVisible(true)
      }, 200)
    }
    const mouseLeave = () => {
      setVisible(false)
    }

    current.addEventListener('mouseenter', mouseEnter)
    current.addEventListener('mouseleave', mouseLeave)

    return () => {
      current.removeEventListener('mouseenter', mouseEnter)
      current.removeEventListener('mouseleave', mouseLeave)
    }
  }, [])

  return visible
}

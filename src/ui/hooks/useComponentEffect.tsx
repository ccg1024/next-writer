import { useEffect, useState } from 'react'
import { Post } from '../libs/utils'

export const useWorkStation = (rendererStation: string) => {
  const [station, setStation] = useState('')

  useEffect(() => {
    Post('render-to-main-to-render', {
      type: 'read-current-workstation'
    })
      .then(res => {
        const { data } = res
        if (data) setStation(data as string)
      })
      .catch(err => {
        throw err
      })
  }, [rendererStation])

  return station
}

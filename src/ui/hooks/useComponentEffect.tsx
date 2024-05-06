import { useEffect, useState } from 'react'
import { TWO_WAY_CHANNEL } from 'src/config/ipc'
import { Post } from '../libs/utils'

export const useWorkStation = (rendererStation: string) => {
  const [station, setStation] = useState('')

  useEffect(() => {
    Post(TWO_WAY_CHANNEL, {
      type: 'read-current-workstation'
    })
      .then(res => {
        if (!res) return
        const { workPlatform } = res.data
        if (workPlatform) setStation(workPlatform)
      })
      .catch(err => {
        throw err
      })
  }, [rendererStation])

  return station
}

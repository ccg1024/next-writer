import { useEffect, useState } from 'react'
import { TWO_WAY_CHANNEL } from 'src/config/ipc'
import { Post, reversePath } from '../libs/utils'

export const useWorkStation = (rendererStation: string) => {
  const [station, setStation] = useState('')
  const [loading, setLoading] = useState(false)
  const [equal, setEqual] = useState(true)

  useEffect(() => {
    setLoading(true)
    Post(TWO_WAY_CHANNEL, {
      type: 'read-current-workstation'
    })
      .then(res => {
        if (!res) return
        const { workPlatform } = res.data
        if (workPlatform) {
          const mainer = workPlatform ? reversePath(workPlatform) : 'EMPTY'
          const renderer = rendererStation
            ? reversePath(rendererStation)
            : 'EMPTY'
          setStation(workPlatform)
          setEqual(mainer === renderer)
        }
      })
      .catch(err => {
        throw err
      })
      .finally(() => {
        setLoading(false)
      })
  }, [rendererStation])

  return { station, loading, equal }
}

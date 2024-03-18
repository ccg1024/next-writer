import { useEffect, useState } from 'react'

export const useWorkStation = (rendererStation: string) => {
  const [station, setStation] = useState('')

  useEffect(() => {
    window.ipc._invoke_get_info('workstation').then((_station: string) => {
      if (_station) setStation(_station)
    })
  }, [rendererStation])

  return station
}

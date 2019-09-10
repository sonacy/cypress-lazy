import { Button, Card } from 'antd'
import React, { useEffect, useState } from 'react'
import { generate } from 'src/code-generator/CodeGenerator'

let chromePort: chrome.runtime.Port | null = null

const App = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [code, setCode] = useState('')
  const [recording, setRecording] = useState([])

  useEffect(() => {
    chromePort = chrome.runtime.connect()
    loadState(() => {
      if (isRecording) {
        console.log('opened in recording state, fetching recording events')
        chrome.storage.local.get(['recording', 'code'], ({ recording }) => {
          console.log('loaded recording', recording)
        })
      }
    })
  }, [])

  useEffect(() => {
    storeState()
  }, [code, isPaused, isRecording])

  const sendMessage = (msg: string) => {
    if (chromePort) {
      chromePort.postMessage(msg)
    }
  }

  const toggleRecord = () => {
    if (isRecording) {
      stop()
    } else {
      start()
    }
    setIsRecording(a => !a)
  }

  const togglePause = () => {
    if (isPaused) {
      sendMessage('resume')
      setIsPaused(false)
    } else {
      sendMessage('pause')
      setIsPaused(true)
    }
  }

  const start = () => {
    cleanUp()
    console.log('start recorder, popup app')
    sendMessage('start')
  }

  const stop = () => {
    console.log('stop recorder')
    sendMessage('stop')
    window.localStorage.setItem('messageStarted', '0')

    chrome.storage.local.get(['recording'], ({ recording }) => {
      if (recording) {
        setRecording(recording)
        const newCode = generate(recording)
        alert(newCode)
        setCode(newCode)

        chrome.storage.local.set({ 'firstRun': 0 })
      }
    })
  }

  const restart = () => {
    console.log('restart')
    cleanUp()
    sendMessage('cleanUp')
  }

  const cleanUp = () => {
    setCode('')
    setIsPaused(false)
    setIsRecording(false)
    setRecording([])
  }

  const loadState = (cb: () => void) => {
    chrome.storage.local.get(['controls', 'code'], ({ controls, code }) => {
      console.log('loaded controls', controls)
      if (controls) {
        setIsRecording(controls.isRecording)
        setIsPaused(controls._isPaused)
      }

      if (code) {
        setCode(code)
      }
      cb()
    })
  }

  const storeState = () => {
    chrome.storage.local.set({
      code: code,
      controls: {
        isRecording: isRecording,
        isPaused: isPaused,
      },
    })
  }

  return (
    <Card
      title="Cypress Lazy"
      size="default"
      style={{
        width: 400,
        height: 300,
      }}
    >
      <pre>{code}</pre>
      <div
        style={{
          height: 80,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          onClick={toggleRecord}
          type={isRecording ? 'danger' : 'primary'}
        >
          {isRecording ? 'Stop' : 'Record'}
        </Button>
        <Button onClick={togglePause} type="ghost">
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </Card>
  )
}

export default App

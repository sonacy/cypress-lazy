import { Button, Card } from 'antd'
import React, { useEffect, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { generate } from 'src/code-generator/CodeGenerator'

let chromePort: chrome.runtime.Port | null = null

const App = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [code, setCode] = useState('')
  const [recording, setRecording] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

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
    if (!isRecording && code) {
      setShowResult(true)
    } else {
      setShowResult(false)
    }
  }, [code, isRecording])

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

  const getActions = () => {
    return showResult
      ? [
          <Button key="restart" onClick={restart} type="primary">
            Restart
          </Button>,
          !isCopying ? (
            <CopyToClipboard text={code} onCopy={() => setIsCopying(true)}>
              <Button type="ghost">copy to clipboard</Button>
            </CopyToClipboard>
          ) : (
            <span>copy success!</span>
          ),
        ]
      : [
          <Button
            key="record"
            onClick={toggleRecord}
            type={isRecording ? 'danger' : 'primary'}
          >
            {isRecording ? 'Stop' : 'Record'}
          </Button>,
          <Button key="resume" onClick={togglePause} type="ghost">
            {isPaused ? 'Resume' : 'Pause'}
          </Button>,
        ]
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
      setIsCopying(false)
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
        height: 400,
      }}
      actions={getActions()}
    >
      <pre
        style={{
          height: 250,
          overflow: 'scroll',
        }}
      >
        {code}
      </pre>
    </Card>
  )
}

export default App

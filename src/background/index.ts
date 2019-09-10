import pptrActions from 'src/code-generator/pptr-actions'

let recording: any[] = []
let badgeState = ''
let isPaused = false

const cleanUp = (cb?: () => void) => {
  recording = []
  chrome.browserAction.setBadgeText({ text: '' })
  chrome.storage.local.remove('recording', () => {
    console.debug('stored recording cleared')
    if (cb) cb()
  })
}

const injectScript = () => {
  chrome.tabs.executeScript(
    {
      file: 'content.js',
      allFrames: false,
    },
    result => {
      console.log(result)
    }
  )
}

const recordCurrentUrl = (href: string) => {
  handleMessage({
    selector: undefined,
    value: undefined,
    action: pptrActions.GOTO,
    href,
  })
}

const recordCurrentViewportSize = (value: any) => {
  handleMessage({
    selector: undefined,
    value,
    action: pptrActions.VIEWPORT,
  })
}

const recordNavigation = (url?: string) => {
  handleMessage({
    selector: undefined,
    value: undefined,
    href: url,
    action: pptrActions.NAVIGATION,
  })
}

const handleControlMessage = (msg: any) => {
  // console.debug('handleControlMessage', msg);
  if (msg.control === 'event-recorder-started')
    chrome.browserAction.setBadgeText({ text: badgeState })
  if (msg.control === 'get-viewport-size')
    recordCurrentViewportSize(msg.coordinates)
  if (msg.control === 'get-current-url') recordCurrentUrl(msg.href)
}

const handleMessage = (msg: any, sender?: chrome.runtime.MessageSender) => {
  console.log('handleMessage', msg)
  if (msg.control) return handleControlMessage(msg)

  msg.frameId = sender ? sender.frameId : null
  msg.frameUrl = sender ? sender.url : null

  if (!isPaused) {
    recording.push(msg)
    chrome.storage.local.set({ recording: recording }, () => {
      console.debug('stored recording updated')
    })
  }
}

const handleNavigation = ({
  frameId,
}: chrome.webNavigation.WebNavigationFramedCallbackDetails) => {
  console.log('handleNavigation')

  injectScript()
  if (frameId === 0) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      recordNavigation(tabs[0].url)
    })
  }
}

const handleWait = () => {
  console.log('handleWait')
  chrome.browserAction.setBadgeText({ text: 'wait' })
}

const start = () => {
  cleanUp(() => {
    badgeState = 'rec'
    injectScript()

    chrome.runtime.onMessage.addListener(handleMessage)
    chrome.webNavigation.onCompleted.addListener(handleNavigation)
    chrome.webNavigation.onBeforeNavigate.addListener(handleWait)

    chrome.browserAction.setIcon({ path: './images/icon-green.png' })
    chrome.browserAction.setBadgeText({ text: badgeState })
    chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' })
  })
}

const stopB = () => {
  badgeState = recording.length > 0 ? '1' : ''

  chrome.runtime.onMessage.removeListener(handleMessage)
  chrome.webNavigation.onCompleted.removeListener(handleNavigation)
  chrome.webNavigation.onBeforeNavigate.removeListener(handleWait)

  chrome.browserAction.setIcon({ path: './images/icon-black.png' })
  chrome.browserAction.setBadgeText({ text: badgeState })
  chrome.browserAction.setBadgeBackgroundColor({ color: '#45C8F1' })

  chrome.storage.local.set({ recording }, () => {
    console.debug('recording stored')
  })
}

const pause = () => {
  badgeState = '❚❚'
  chrome.browserAction.setBadgeText({ text: badgeState })
  isPaused = true
}

const resume = () => {
  badgeState = 'rec'
  chrome.browserAction.setBadgeText({ text: badgeState })
  isPaused = false
}

const boot = () => {
  chrome.runtime.onConnect.addListener(port => {
    port.onMessage.addListener(msg => {
      const bgPage = chrome.extension.getBackgroundPage()

      if (bgPage) {
        bgPage.console.log('msg: ', msg)
      }
      if (msg === 'start') start()
      if (msg === 'stop') stopB()
      if (msg === 'cleanUp') cleanUp()
      if (msg === 'pause') pause()
      if (msg === 'resume') resume()
    })
  })
}

boot()

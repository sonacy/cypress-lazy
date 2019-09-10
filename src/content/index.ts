import finder from '@medv/finder'

import eventsToRecord from '../code-generator/dom-events-to-record'

export interface IEvent {
  selector?: string
  value?: any
  tagName?: string
  targetType?: string
  action?: string
  keyCode?: number
  href?: string
  coordinates?: ReturnType<typeof getCoordinates>
  targetObject?: Object
}

let eventLog: IEvent[] = []
let previousEvent: any = null
let dataAttribute: any = null

const contentStart = () => {
  chrome.storage.local.get(['options'], ({ options }) => {
    if (options && options.code && options.code.dataAttribute) {
      dataAttribute = options.code.dataAttribute
    }

    const events = Object.keys(eventsToRecord).map(
      k => (eventsToRecord as any)[k]
    )
    if (!window.pptRecorderAddedControlListeners) {
      addAllListeners(events)
      window.pptRecorderAddedControlListeners = true
    }

    if (
      !window.document.pptRecorderAddedControlListeners &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.addListener(getCurrentUrl)
      chrome.runtime.onMessage.addListener(getViewPortSize)
      window.document.pptRecorderAddedControlListeners = true
    }

    chrome.storage.local.get('firstRun', function(items) {
      if (!items.hasOwnProperty('firstRun')) {
        chrome.storage.local.set({
          'firstRun': 0,
        })
        items.firstRun = 0
      }

      if (items.hasOwnProperty('firstRun') && !items.firstRun) {
        sendMessage({
          control: 'get-viewport-size',
          coordinates: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        })
        sendMessage({
          control: 'get-current-url',
          href: window.location.href,
        })
        chrome.storage.local.set({
          'firstRun': 1,
        })
      }
    })

    sendMessage({
      control: 'event-recorder-started',
    })
    console.debug('Cypress Recorder in-page EventRecorder started')
  })
}

const addAllListeners = (events: string[]) => {
  events.forEach(type => {
    window.addEventListener(type, recordEvent, true)
  })
}

const sendMessage = (msg: any) => {
  console.debug('sending message', msg)
  try {
    // poor man's way of detecting whether this script was injected by an actual extension, or is loaded for
    // testing purposes
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.sendMessage(msg)
    } else {
      eventLog.push(msg)
    }
  } catch (err) {
    console.debug('caught error', err)
  }
}

const getCurrentUrl = (msg: any) => {
  if (msg.control && msg.control === 'get-current-url') {
    console.debug('sending current url:', window.location.href)
    sendMessage({
      control: msg.control,
      href: window.location.href,
    })
  }
}

const getViewPortSize = (msg: any) => {
  if (msg.control && msg.control === 'get-viewport-size') {
    console.debug('sending current viewport size')
    sendMessage({
      control: msg.control,
      coordinates: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    })
  }
}

const recordEvent = (e: any) => {
  if (previousEvent && previousEvent.timeStamp === e.timeStamp) return
  previousEvent = e

  const selector =
    e.target.hasAttribute && e.target.hasAttribute(dataAttribute)
      ? formatDataSelector(e.target, dataAttribute)
      : finder(e.target, {
          seedMinLength: 5,
          optimizedMinLength: 10,
        })

  const msg = {
    selector: selector,
    value: e.target.value,
    tagName: e.target.tagName,
    targetType: e.target.type,
    action: e.type,
    keyCode: e.keyCode ? e.keyCode : null,
    href: e.target.href ? e.target.href : null,
    coordinates: getCoordinates(e),
    targetObject: e.target,
  }
  sendMessage(msg)
}

const getCoordinates = (evt: any) => {
  const eventsWithCoordinates: any = {
    mouseup: true,
    mousedown: true,
    mousemove: true,
    mouseover: true,
  }
  return eventsWithCoordinates[evt.type]
    ? {
        x: evt.clientX,
        y: evt.clientY,
      }
    : null
}

const formatDataSelector = (element: HTMLElement, attribute: string) => {
  return `[${attribute}=${element.getAttribute(attribute)}]`
}

contentStart()

import { IEvent } from 'src/content'

const wrapDescribeHeader = `describe('cypress lazy', function() {\n`

const wrapDescribeFooter = `})`

const wrapItHeader = ` it('lazy operation', function() {\n`

const wrapItFooter = ` })\n`

export const defaults = {
  wrapDescribe: true,
  blankLinesBetweenlines: true,
  dataAttribute: '',
}

export const generate = (events: IEvent[]) => {
  return getHeader() + parseEvents(events) + getFooter()
}

const getHeader = () => {
  const newLine = `\n`

  const describeHeader = wrapDescribeHeader + newLine
  return describeHeader + wrapItHeader + newLine
}

const getFooter = () => {
  const newLine = `\n`

  const describeFooter = wrapDescribeFooter + newLine
  return wrapItFooter + newLine + describeFooter
}

const parseEvents = (events: IEvent[]) => {
  let result = ''
  const lines = []

  for (let i = 0; i < events.length; i++) {
    const {
      action,
      selector,
      value,
      href,
      keyCode,
      tagName,
      targetType,
    } = events[i]

    switch (action) {
      case 'keydown':
        if (keyCode === 9) {
          // tab key
          lines.push(handleKeyDown(selector, value))
        }
        break
      case 'click':
        lines.push(handleClick(selector))
        break
      case 'change':
        if (tagName === 'SELECT') {
          lines.push(handleChange(tagName, selector, value))
        }
        if (tagName === 'INPUT') {
          if (targetType) {
            lines.push(handleChange(tagName, selector, value, targetType))
          } else {
            lines.push(handleChange(tagName, selector, value))
          }
        }
        break
      case 'goto*':
        lines.push(handleGoto(href))
        break
      case 'viewport*':
        lines.push(handleViewport(value.width, value.height))
        break
      case 'navigation*':
        lines.push(handleGoto(href))
        break
    }
  }

  const indent = '    '
  let newLine = `\n`

  if (lines.length > 0) {
    newLine = `\n \n`
  }

  for (let block of lines) {
    result += indent + block + newLine
  }

  return result
}

const handleKeyDown = (selector?: string, value?: string) => {
  if (selector && value) return `cy.get('${selector}').type('${value}')`
  return ''
}

const handleClick = (selector?: string) => {
  if (selector) return `cy.get('${selector}').click()`
  return ''
}

const handleChange = (
  tagName?: string,
  selector?: string,
  value?: string,
  targetType?: string
) => {
  if (tagName === 'INPUT') {
    if (targetType === 'checkbox') {
      return `cy.get('${selector}').check('${value}')`
    }
    return `cy.get('${selector}').type('${value}')`
  }
  if (tagName) return `cy.get('${selector}').select('${value}')`
}

const handleGoto = (href?: string) => {
  if (href) {
    return `cy.visit('${href}')`
  }

  return href
}

const handleViewport = (width?: number, height?: number) => {
  return `cy.viewport(${width}, ${height})`
}

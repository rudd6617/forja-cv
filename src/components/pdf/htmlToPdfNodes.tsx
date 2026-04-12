import { Text, View, Link } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { ReactElement } from 'react'

interface ParseContext {
  accentColor: string
}

// Minimal HTML parser — handles the subset Quill produces:
// <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <br>, .ql-indent-N

export function htmlToPdfNodes(
  html: string,
  baseStyle: Style,
  ctx: ParseContext,
): ReactElement {
  if (!html || html.trim() === '') {
    return <Text style={baseStyle}> </Text>
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const nodes = Array.from(doc.body.childNodes)

  if (nodes.length === 0) {
    return <Text style={baseStyle}> </Text>
  }

  const elements = nodes.map((node, i) => renderNode(node, i, baseStyle, ctx))
  return <View>{elements}</View>
}

function renderNode(
  node: Node,
  key: number,
  baseStyle: Style,
  ctx: ParseContext,
): ReactElement {
  if (node.nodeType === Node.TEXT_NODE) {
    return <Text key={key} style={baseStyle}>{node.textContent ?? ''}</Text>
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return <Text key={key} style={baseStyle} />
  }

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()

  switch (tag) {
    case 'p':
      return (
        <Text key={key} style={{ ...baseStyle, marginBottom: 1 }}>
          {renderInlineChildren(el, baseStyle, ctx)}
        </Text>
      )

    case 'ul':
      return (
        <View key={key} style={{ marginBottom: 2 }}>
          {Array.from(el.children).map((li, i) =>
            renderListItem(li as HTMLElement, i, 'disc', baseStyle, ctx),
          )}
        </View>
      )

    case 'ol':
      return (
        <View key={key} style={{ marginBottom: 2 }}>
          {Array.from(el.children).map((li, i) =>
            renderListItem(li as HTMLElement, i, 'decimal', baseStyle, ctx),
          )}
        </View>
      )

    case 'br':
      return <Text key={key} style={baseStyle}>{'\n'}</Text>

    default:
      // Fallback: treat as inline text
      return (
        <Text key={key} style={baseStyle}>
          {renderInlineChildren(el, baseStyle, ctx)}
        </Text>
      )
  }
}

function renderListItem(
  li: HTMLElement,
  index: number,
  listType: 'disc' | 'decimal',
  baseStyle: Style,
  ctx: ParseContext,
): ReactElement {
  const indent = getIndentLevel(li)
  const bullet = listType === 'disc' ? '\u2022' : `${index + 1}.`

  return (
    <View
      key={index}
      style={{
        flexDirection: 'row',
        paddingLeft: indent * 12,
        marginBottom: 1,
      }}
    >
      <Text style={{ ...baseStyle, width: listType === 'disc' ? 8 : 14, flexShrink: 0 }}>
        {bullet}
      </Text>
      <Text style={{ ...baseStyle, flex: 1 }}>
        {renderInlineChildren(li, baseStyle, ctx)}
      </Text>
    </View>
  )
}

function getIndentLevel(el: HTMLElement): number {
  const cls = el.className
  const match = cls.match(/ql-indent-(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function renderInlineChildren(
  el: HTMLElement,
  baseStyle: Style,
  ctx: ParseContext,
): (ReactElement | string)[] {
  return Array.from(el.childNodes).map((child, i) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return child.textContent ?? ''
    }

    if (child.nodeType !== Node.ELEMENT_NODE) return ''

    const childEl = child as HTMLElement
    const tag = childEl.tagName.toLowerCase()

    if (tag === 'strong' || tag === 'b') {
      return (
        <Text key={i} style={{ fontWeight: 'bold' }}>
          {renderInlineChildren(childEl, baseStyle, ctx)}
        </Text>
      )
    }

    if (tag === 'em' || tag === 'i') {
      return (
        <Text key={i} style={{ fontStyle: 'italic' }}>
          {renderInlineChildren(childEl, baseStyle, ctx)}
        </Text>
      )
    }

    if (tag === 'u') {
      return (
        <Text key={i} style={{ textDecoration: 'underline' }}>
          {renderInlineChildren(childEl, baseStyle, ctx)}
        </Text>
      )
    }

    if (tag === 'a') {
      const href = childEl.getAttribute('href') ?? '#'
      return (
        <Link key={i} src={href} style={{ color: ctx.accentColor, textDecoration: 'none' }}>
          {childEl.textContent ?? ''}
        </Link>
      )
    }

    if (tag === 'br') {
      return '\n'
    }

    // Nested block inside inline context — recurse
    return (
      <Text key={i}>
        {renderInlineChildren(childEl, baseStyle, ctx)}
      </Text>
    )
  })
}

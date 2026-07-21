// @react-pdf/layout reads node.props.hyphenationPenalty (getLayoutOptions) but
// the shipped TextProps type omits it. Remove once upstream types include it.
import '@react-pdf/renderer'

declare module '@react-pdf/renderer' {
  interface TextProps {
    hyphenationPenalty?: number
  }
}

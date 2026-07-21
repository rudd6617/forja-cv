import { describe, expect, it } from 'vitest'
import { normalizeQuillLists } from './html'

describe('normalizeQuillLists', () => {
  it('converts a bullet-only ol to ul', () => {
    const html = '<ol><li data-list="bullet">a</li><li data-list="bullet">b</li></ol>'
    expect(normalizeQuillLists(html)).toBe(
      '<ul><li data-list="bullet">a</li><li data-list="bullet">b</li></ul>',
    )
  })

  it('keeps an ordered ol as ol', () => {
    const html = '<ol><li data-list="ordered">a</li></ol>'
    expect(normalizeQuillLists(html)).toBe('<ol><li data-list="ordered">a</li></ol>')
  })

  it('splits mixed runs into consecutive lists in order', () => {
    const html =
      '<ol>' +
      '<li data-list="ordered">1</li><li data-list="ordered">2</li>' +
      '<li data-list="bullet">a</li>' +
      '<li data-list="ordered">3</li>' +
      '</ol>'
    expect(normalizeQuillLists(html)).toBe(
      '<ol><li data-list="ordered">1</li><li data-list="ordered">2</li></ol>' +
        '<ul><li data-list="bullet">a</li></ul>' +
        '<ol><li data-list="ordered">3</li></ol>',
    )
  })

  it('removes ql-ui spans', () => {
    const html =
      '<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>a</li></ol>'
    expect(normalizeQuillLists(html)).toBe('<ul><li data-list="bullet">a</li></ul>')
  })

  it('preserves indent classes and inline markup', () => {
    const html =
      '<ol><li data-list="bullet" class="ql-indent-1"><strong>a</strong></li></ol>'
    expect(normalizeQuillLists(html)).toBe(
      '<ul><li data-list="bullet" class="ql-indent-1"><strong>a</strong></li></ul>',
    )
  })

  it('leaves html without data-list untouched', () => {
    const html = '<p>hi</p><ul><li>a</li></ul><ol><li>1</li></ol>'
    expect(normalizeQuillLists(html)).toBe(html)
  })

  it('keeps surrounding content in place', () => {
    const html = '<p>before</p><ol><li data-list="bullet">a</li></ol><p>after</p>'
    expect(normalizeQuillLists(html)).toBe(
      '<p>before</p><ul><li data-list="bullet">a</li></ul><p>after</p>',
    )
  })
})

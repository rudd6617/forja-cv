import {
  Document,
  Page,
  View,
  Text,
  Link,
  Svg,
  Path,
  Font,
} from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { ResumeData, ResumeItem } from '../../types/resume'
import {
  COLOR_THEMES,
  type FontValue,
  type ColorValue,
  type LayoutValue,
} from '../../types/theme'
import { htmlToPdfNodes } from './htmlToPdfNodes'
import { stripHtml } from '../../utils/html'
import { LINKEDIN_PATH, GITHUB_PATH } from '../../constants/icons'

// ─── Font Registration ───
// All fonts must support CJK — built-in Helvetica/Times-Roman don't.
// Sans-serif variants use Noto Sans TC, serif uses Noto Serif TC.

Font.register({
  family: 'Noto Sans TC',
  fonts: [
    { src: '/fonts/NotoSansTC-Regular.ttf' },
    { src: '/fonts/NotoSansTC-Bold.ttf', fontWeight: 'bold' },
  ],
})

Font.register({
  family: 'Noto Serif TC',
  fonts: [
    { src: '/fonts/NotoSerifTC-Regular.ttf' },
    { src: '/fonts/NotoSerifTC-Bold.ttf', fontWeight: 'bold' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

const FONT_MAP: Record<FontValue, string> = {
  'gill-sans': 'Noto Sans TC',
  'inter': 'Noto Sans TC',
  'noto-sans-tc': 'Noto Sans TC',
  'georgia': 'Noto Serif TC',
}

// ─── Types ───

interface PdfCtx {
  font: string
  colors: (typeof COLOR_THEMES)[number]
}

// ─── Shared Components ───

function SectionTitle({ children, ctx }: { children: string; ctx: PdfCtx }) {
  return (
    <View style={{ borderBottomWidth: 2, borderBottomColor: ctx.colors.accent, paddingBottom: 4, marginBottom: 8 }} minPresenceAhead={40}>
      <Text style={{
        fontFamily: ctx.font,
        color: ctx.colors.accent,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}>
        {stripHtml(children)}
      </Text>
    </View>
  )
}

function HtmlField({ html, style, ctx }: { html: string | undefined; style: Style; ctx: PdfCtx }) {
  if (!html) return null
  return htmlToPdfNodes(html, { fontFamily: ctx.font, ...style }, { accentColor: ctx.colors.accent })
}

function ContactSection({ section, ctx }: { section: ResumeData['user']['contact']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      {section.list.filter(item => item.isShow).map(item => (
        <View key={item.id} style={{ marginBottom: 2 }} wrap={false}>
          <HtmlField html={item.paragraph} style={{ fontSize: 9, color: ctx.colors.text, lineHeight: 1.5 }} ctx={ctx} />
        </View>
      ))}
    </View>
  )
}

function SocialItem({ item, ctx, gap }: { item: ResumeItem; ctx: PdfCtx; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap ?? 4 }}>
      {item.icon === 'linkedin' && <LinkedInIcon color={ctx.colors.accent} />}
      {item.icon === 'github' && <GitHubIcon color={ctx.colors.accent} />}
      {item.link ? (
        <Link src={item.link} style={{ color: ctx.colors.accent, fontSize: 9, textDecoration: 'none', fontFamily: ctx.font }}>
          {stripHtml(item.type ?? '')}
        </Link>
      ) : (
        <HtmlField html={item.type} style={{ fontSize: 9, color: ctx.colors.accent }} ctx={ctx} />
      )}
    </View>
  )
}

function SocialSection({ section, ctx }: { section: ResumeData['user']['social']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      {section.list.filter(item => item.isShow).map(item => (
        <View key={item.id} style={{ marginBottom: 4 }} wrap={false}>
          <SocialItem item={item} ctx={ctx} />
        </View>
      ))}
    </View>
  )
}

function EducationSection({ section, ctx }: { section: ResumeData['user']['education']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      {section.list.filter(item => item.isShow).map(item => (
        <View key={item.id} style={{ marginBottom: 6 }} wrap={false}>
          <HtmlField html={item.title} style={{ fontSize: 9, color: ctx.colors.heading, fontWeight: 'bold' }} ctx={ctx} />
          <HtmlField html={item.subtitle} style={{ fontSize: 9, color: ctx.colors.muted }} ctx={ctx} />
          <HtmlField html={item.paragraph} style={{ fontSize: 9, color: ctx.colors.muted, marginTop: 1 }} ctx={ctx} />
        </View>
      ))}
    </View>
  )
}

function ExperienceEntry({ item, ctx }: { item: ResumeItem; ctx: PdfCtx }) {
  if (!item.isShow) return null
  return (
    <View style={{ marginBottom: 12 }} wrap={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
        <HtmlField html={item.title} style={{ fontSize: 12, color: ctx.colors.heading, fontWeight: 'bold' }} ctx={ctx} />
        <HtmlField html={item.subtitle2} style={{ fontSize: 9, color: ctx.colors.muted, flexShrink: 0 }} ctx={ctx} />
      </View>
      <HtmlField html={item.subtitle1} style={{ fontSize: 10, color: ctx.colors.accent }} ctx={ctx} />
      <View style={{ marginTop: 4 }}>
        <HtmlField html={item.paragraph} style={{ fontSize: 10, color: ctx.colors.text, lineHeight: 1.6 }} ctx={ctx} />
      </View>
    </View>
  )
}

function ExperienceSection({ section, ctx }: { section: ResumeData['user']['experience']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      {section.list.filter(item => item.isShow).map(item => (
        <ExperienceEntry key={item.id} item={item} ctx={ctx} />
      ))}
    </View>
  )
}

function ProjectSection({ section, ctx }: { section: ResumeData['user']['project']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View style={{ marginTop: 14 }}>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      {section.list.filter(item => item.isShow).map(item => (
        <ExperienceEntry key={item.id} item={item} ctx={ctx} />
      ))}
    </View>
  )
}

function SkillSection({ section, ctx }: { section: ResumeData['user']['skill']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      {section.list.filter(item => item.isShow).map(item => (
        <View key={item.id} style={{ marginBottom: 6 }} wrap={false}>
          <HtmlField html={item.title} style={{ fontSize: 9, color: ctx.colors.heading, fontWeight: 'bold' }} ctx={ctx} />
          <HtmlField html={item.paragraph} style={{ fontSize: 9, color: ctx.colors.muted, marginTop: 1 }} ctx={ctx} />
        </View>
      ))}
    </View>
  )
}

function CertificateSection({ section, ctx }: { section: ResumeData['user']['certificate']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      {section.list.filter(item => item.isShow).map(item => (
        <View key={item.id} style={{ marginBottom: 6 }} wrap={false}>
          <HtmlField html={item.title} style={{ fontSize: 9, color: ctx.colors.heading, fontWeight: 'bold' }} ctx={ctx} />
          <HtmlField html={item.subtitle} style={{ fontSize: 9, color: ctx.colors.muted }} ctx={ctx} />
          <HtmlField html={item.subtitle2} style={{ fontSize: 9, color: ctx.colors.muted }} ctx={ctx} />
        </View>
      ))}
    </View>
  )
}

function Header({ about, ctx, children }: { about: ResumeData['user']['about']; ctx: PdfCtx; children?: React.ReactNode }) {
  if (!about.isShow) return null
  return (
    <View style={{ paddingHorizontal: 36, paddingTop: 28, paddingBottom: 6 }}>
      <Text style={{ fontFamily: ctx.font, fontSize: 24, fontWeight: 'bold', color: ctx.colors.heading, letterSpacing: -0.5 }}>
        {stripHtml(about.name)}
      </Text>
      <Text style={{ fontFamily: ctx.font, fontSize: 13, color: ctx.colors.accent, marginTop: 2 }}>
        {stripHtml(about.jobTitle)}
      </Text>
      {children}
    </View>
  )
}

function Summary({ summary, ctx }: { summary: ResumeData['user']['summary']; ctx: PdfCtx }) {
  if (!summary.isShow) return null
  return (
    <View style={{ paddingHorizontal: 36, paddingBottom: 8 }}>
      {summary.hashtags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {summary.hashtags.map((tag) => (
            <View key={tag} style={{ backgroundColor: ctx.colors.accentBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
              <Text style={{ fontFamily: ctx.font, fontSize: 9, color: ctx.colors.accent, fontWeight: 'bold' }}>
                {stripHtml(tag)}
              </Text>
            </View>
          ))}
        </View>
      )}
      <HtmlField html={summary.paragraph} style={{ fontSize: 10, color: ctx.colors.text, lineHeight: 1.6 }} ctx={ctx} />
    </View>
  )
}

function Divider({ ctx }: { ctx: PdfCtx }) {
  return <View style={{ marginHorizontal: 36, marginBottom: 12, borderTopWidth: 1, borderTopColor: ctx.colors.border }} />
}

function Sidebar({ contact, social, education, skill, certificate, ctx }: {
  contact: ResumeData['user']['contact']
  social: ResumeData['user']['social']
  education: ResumeData['user']['education']
  skill: ResumeData['user']['skill']
  certificate: ResumeData['user']['certificate']
  ctx: PdfCtx
}) {
  return (
    <>
      <ContactSection section={contact} ctx={ctx} />
      <SocialSection section={social} ctx={ctx} />
      <EducationSection section={education} ctx={ctx} />
      <SkillSection section={skill} ctx={ctx} />
      <CertificateSection section={certificate} ctx={ctx} />
    </>
  )
}

// ─── Layouts ───

function LayoutSidebar({ data, ctx, side }: { data: ResumeData; ctx: PdfCtx; side: 'left' | 'right' }) {
  const { about, summary, experience, project, education, contact, social, skill, certificate } = data.user
  const sidebarBorder = side === 'left'
    ? { paddingRight: 16, borderRightWidth: 1, borderRightColor: ctx.colors.border }
    : { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: ctx.colors.border }
  const sidebarView = (
    <View style={{ width: '22%', flexShrink: 0, ...sidebarBorder }}>
      <Sidebar contact={contact} social={social} education={education} skill={skill} certificate={certificate} ctx={ctx} />
    </View>
  )
  const mainView = (
    <View style={{ width: '78%' }}>
      <ExperienceSection section={experience} ctx={ctx} />
      <ProjectSection section={project} ctx={ctx} />
    </View>
  )
  return (
    <>
      <Header about={about} ctx={ctx} />
      <Summary summary={summary} ctx={ctx} />
      <Divider ctx={ctx} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 36, paddingBottom: 28, gap: 24 }}>
        {side === 'left' ? <>{sidebarView}{mainView}</> : <>{mainView}{sidebarView}</>}
      </View>
    </>
  )
}

function InlineContact({ contact, social, ctx }: {
  contact: ResumeData['user']['contact']
  social: ResumeData['user']['social']
  ctx: PdfCtx
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
      {contact.isShow && contact.list.filter(item => item.isShow).map(item => (
        <HtmlField key={item.id} html={item.paragraph} style={{ fontSize: 9, color: ctx.colors.muted }} ctx={ctx} />
      ))}
      {social.isShow && social.list.filter(item => item.isShow).map(item => (
        <SocialItem key={item.id} item={item} ctx={ctx} gap={3} />
      ))}
    </View>
  )
}

function InlineEducation({ section, ctx }: { section: ResumeData['user']['education']; ctx: PdfCtx }) {
  if (!section.isShow) return null
  return (
    <View style={{ marginTop: 14 }}>
      <SectionTitle ctx={ctx}>{section.name}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {section.list.filter(item => item.isShow).map(item => (
          <View key={item.id} style={{ flexDirection: 'row', gap: 4, alignItems: 'baseline' }} wrap={false}>
            <Text style={{ fontFamily: ctx.font, fontSize: 10, color: ctx.colors.heading, fontWeight: 'bold' }}>
              {stripHtml(item.title ?? '')}
            </Text>
            <Text style={{ fontFamily: ctx.font, fontSize: 10, color: ctx.colors.muted }}>
              {stripHtml(item.subtitle ?? '')}
            </Text>
            <Text style={{ fontFamily: ctx.font, fontSize: 10, color: ctx.colors.muted }}>
              {stripHtml(item.paragraph ?? '')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function LayoutTopHeader({ data, ctx }: { data: ResumeData; ctx: PdfCtx }) {
  const { about, summary, experience, project, education, contact, social, skill, certificate } = data.user
  return (
    <>
      <Header about={about} ctx={ctx}>
        <InlineContact contact={contact} social={social} ctx={ctx} />
      </Header>
      <Summary summary={summary} ctx={ctx} />
      <View style={{ paddingHorizontal: 36, paddingBottom: 28 }}>
        <ExperienceSection section={experience} ctx={ctx} />
        <ProjectSection section={project} ctx={ctx} />
        <InlineEducation section={education} ctx={ctx} />
        <SkillSection section={skill} ctx={ctx} />
        <CertificateSection section={certificate} ctx={ctx} />
      </View>
    </>
  )
}

function LayoutSingleColumn({ data, ctx }: { data: ResumeData; ctx: PdfCtx }) {
  const { about, summary, experience, project, education, contact, social, skill, certificate } = data.user
  return (
    <>
      <Header about={about} ctx={ctx} />
      <Summary summary={summary} ctx={ctx} />
      <View style={{ paddingHorizontal: 36, paddingBottom: 28 }}>
        <ExperienceSection section={experience} ctx={ctx} />
        <ProjectSection section={project} ctx={ctx} />
        <InlineEducation section={education} ctx={ctx} />
        <SkillSection section={skill} ctx={ctx} />
        <CertificateSection section={certificate} ctx={ctx} />
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <ContactSection section={contact} ctx={ctx} />
          </View>
          <View style={{ flex: 1 }}>
            <SocialSection section={social} ctx={ctx} />
          </View>
        </View>
      </View>
    </>
  )
}

function LayoutRightSidebar(props: { data: ResumeData; ctx: PdfCtx }) {
  return <LayoutSidebar {...props} side="right" />
}

function LayoutLeftSidebar(props: { data: ResumeData; ctx: PdfCtx }) {
  return <LayoutSidebar {...props} side="left" />
}

const LAYOUTS: Record<LayoutValue, React.ComponentType<{ data: ResumeData; ctx: PdfCtx }>> = {
  'right-sidebar': LayoutRightSidebar,
  'left-sidebar': LayoutLeftSidebar,
  'top-header': LayoutTopHeader,
  'single-column': LayoutSingleColumn,
}

// ─── Document ───

interface PdfDocumentProps {
  data: ResumeData
  fontFamily: FontValue
  colorTheme: ColorValue
  layout: LayoutValue
}

export function PdfDocument({ data, fontFamily, colorTheme, layout }: PdfDocumentProps) {
  const fontName = FONT_MAP[fontFamily]
  const theme = COLOR_THEMES.find(c => c.value === colorTheme) ?? COLOR_THEMES[0]
  const ctx: PdfCtx = { font: fontName, colors: theme }

  const LayoutComponent = LAYOUTS[layout]

  return (
    <Document title={data.title || 'Resume'}>
      <Page size="A4" style={{ fontFamily: fontName, color: theme.text, fontSize: 10 }}>
        <LayoutComponent data={data} ctx={ctx} />
      </Page>
    </Document>
  )
}

// ─── Helpers ───

function LinkedInIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}>
      <Path fill={color} d={LINKEDIN_PATH} />
    </Svg>
  )
}

function GitHubIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}>
      <Path fill={color} d={GITHUB_PATH} />
    </Svg>
  )
}

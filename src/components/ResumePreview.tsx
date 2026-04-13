import type { CSSProperties } from 'react'
import type { ResumeData, ResumeItem } from '../types/resume'
import {
  FONT_OPTIONS,
  COLOR_THEMES,
  type FontValue,
  type ColorValue,
  type LayoutValue,
} from '../types/theme'
import { HtmlContent } from './HtmlContent'
import { LINKEDIN_PATH, GITHUB_PATH } from '../constants/icons'

function safeHref(url: string | undefined): string {
  if (!url) return '#'
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url
  } catch { /* ignore */ }
  return '#'
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3
      className="cv-accent text-[10px] font-bold tracking-[0.15em] uppercase pb-1.5 mb-3"
      style={{ borderBottom: '2px solid var(--cv-accent)' }}
    >
      {children}
    </h3>
  )
}

function ContactSection({ section }: { section: ResumeData['user']['contact'] }) {
  if (!section.isShow) return null
  return (
    <div className="sidebar-section mb-5">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <HtmlContent
            key={item.id}
            html={item.paragraph ?? ''}
            className="leading-snug [&>p]:mb-0.5"
          />
        ))}
    </div>
  )
}

function SocialSection({ section }: { section: ResumeData['user']['social'] }) {
  if (!section.isShow) return null
  return (
    <div className="sidebar-section mb-5">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <a
            key={item.id}
            href={safeHref(item.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="cv-accent flex items-center gap-1.5 mb-1.5 hover:opacity-70 transition-opacity"
          >
            {item.icon === 'linkedin' && <LinkedInIcon />}
            {item.icon === 'github' && <GitHubIcon />}
            <HtmlContent html={item.type ?? ''} className="[&>p]:m-0" />
          </a>
        ))}
    </div>
  )
}

function EducationSection({
  section,
}: {
  section: ResumeData['user']['education']
}) {
  if (!section.isShow) return null
  return (
    <div className="sidebar-section mb-5">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <div key={item.id} className="mb-2">
            <HtmlContent
              html={item.title ?? ''}
              className="cv-heading font-semibold [&>p]:m-0"
            />
            <HtmlContent
              html={item.subtitle ?? ''}
              className="cv-muted [&>p]:m-0"
            />
            <HtmlContent
              html={item.paragraph ?? ''}
              className="cv-muted [&>p]:m-0 mt-0.5"
            />
          </div>
        ))}
    </div>
  )
}

function ExperienceEntry({ item }: { item: ResumeItem }) {
  if (!item.isShow) return null
  return (
    <div className="experience-entry mb-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <HtmlContent
          html={item.title ?? ''}
          className="cv-heading text-[15px] font-semibold [&>p]:m-0"
        />
        <HtmlContent
          html={item.subtitle2 ?? ''}
          className="cv-muted text-[11px] shrink-0 [&>p]:m-0"
        />
      </div>
      <HtmlContent
        html={item.subtitle1 ?? ''}
        className="cv-accent text-[13px] [&>p]:m-0"
      />
      <HtmlContent
        html={item.paragraph ?? ''}
        className="resume-content mt-1.5 text-[13px] leading-[1.6]"
      />
    </div>
  )
}

function ExperienceSection({
  section,
}: {
  section: ResumeData['user']['experience']
}) {
  if (!section.isShow) return null
  return (
    <div>
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <ExperienceEntry key={item.id} item={item} />
        ))}
    </div>
  )
}

function ProjectSection({
  section,
}: {
  section: ResumeData['user']['project']
}) {
  if (!section.isShow) return null
  return (
    <div className="mt-5">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <ExperienceEntry key={item.id} item={item} />
        ))}
    </div>
  )
}

function SkillSection({
  section,
}: {
  section: ResumeData['user']['skill']
}) {
  if (!section.isShow) return null
  return (
    <div className="sidebar-section mb-5">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <div key={item.id} className="mb-2">
            <HtmlContent
              html={item.title ?? ''}
              className="cv-heading font-semibold [&>p]:m-0"
            />
            <HtmlContent
              html={item.paragraph ?? ''}
              className="cv-muted [&>p]:m-0 mt-0.5"
            />
          </div>
        ))}
    </div>
  )
}

function CertificateSection({
  section,
}: {
  section: ResumeData['user']['certificate']
}) {
  if (!section.isShow) return null
  return (
    <div className="sidebar-section mb-5">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <div key={item.id} className="mb-2">
            <HtmlContent
              html={item.title ?? ''}
              className="cv-heading font-semibold [&>p]:m-0"
            />
            <HtmlContent
              html={item.subtitle ?? ''}
              className="cv-muted [&>p]:m-0"
            />
            <HtmlContent
              html={item.subtitle2 ?? ''}
              className="cv-muted [&>p]:m-0"
            />
          </div>
        ))}
    </div>
  )
}

interface ResumePreviewProps {
  data: ResumeData
  fontFamily: FontValue
  colorTheme: ColorValue
  layout: LayoutValue
}

function Header({ about, children }: { about: ResumeData['user']['about']; children?: React.ReactNode }) {
  if (!about.isShow) return null
  return (
    <div className="px-10 pt-8 pb-2">
      <HtmlContent
        html={about.name}
        className="cv-heading text-[28px] font-bold tracking-tight [&>p]:m-0"
      />
      <HtmlContent
        html={about.jobTitle}
        className="cv-accent text-[16px] mt-0.5 [&>p]:m-0"
      />
      {children}
    </div>
  )
}

function Summary({ summary }: { summary: ResumeData['user']['summary'] }) {
  if (!summary.isShow) return null
  return (
    <div className="px-10 pb-3">
      {summary.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {summary.hashtags.map((tag) => (
            <HtmlContent
              key={tag}
              html={tag}
              className="cv-accent cv-accent-bg text-[11px] font-medium px-2 py-0.5 rounded [&>p]:m-0"
            />
          ))}
        </div>
      )}
      <HtmlContent
        html={summary.paragraph}
        className="resume-content text-[13px] leading-[1.6]"
      />
    </div>
  )
}

function Divider() {
  return (
    <div
      className="mx-10 mb-4"
      style={{ borderTop: '1px solid var(--cv-border)' }}
    />
  )
}

function Sidebar({ contact, social, education, skill, certificate }: {
  contact: ResumeData['user']['contact']
  social: ResumeData['user']['social']
  education: ResumeData['user']['education']
  skill: ResumeData['user']['skill']
  certificate: ResumeData['user']['certificate']
}) {
  return (
    <>
      <ContactSection section={contact} />
      <SocialSection section={social} />
      <EducationSection section={education} />
      <SkillSection section={skill} />
      <CertificateSection section={certificate} />
    </>
  )
}

function LayoutRightSidebar({ data }: { data: ResumeData }) {
  const { about, summary, experience, project, education, contact, social, skill, certificate } = data.user
  return (
    <>
      <Header about={about} />
      <Summary summary={summary} />
      <Divider />
      <div className="flex px-10 pb-8 gap-8">
        <div className="w-[78%]">
          <ExperienceSection section={experience} />
          <ProjectSection section={project} />
        </div>
        <div
          className="w-[22%] shrink-0 text-[11px] leading-snug pl-6"
          style={{ borderLeft: '1px solid var(--cv-border)' }}
        >
          <Sidebar contact={contact} social={social} education={education} skill={skill} certificate={certificate} />
        </div>
      </div>
    </>
  )
}

function LayoutLeftSidebar({ data }: { data: ResumeData }) {
  const { about, summary, experience, project, education, contact, social, skill, certificate } = data.user
  return (
    <>
      <Header about={about} />
      <Summary summary={summary} />
      <Divider />
      <div className="flex px-10 pb-8 gap-8">
        <div
          className="w-[22%] shrink-0 text-[11px] leading-snug pr-6"
          style={{ borderRight: '1px solid var(--cv-border)' }}
        >
          <Sidebar contact={contact} social={social} education={education} skill={skill} certificate={certificate} />
        </div>
        <div className="w-[78%]">
          <ExperienceSection section={experience} />
          <ProjectSection section={project} />
        </div>
      </div>
    </>
  )
}

function InlineContact({ contact, social }: {
  contact: ResumeData['user']['contact']
  social: ResumeData['user']['social']
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] cv-muted">
      {contact.isShow && contact.list
        .filter((item) => item.isShow)
        .map((item) => (
          <HtmlContent
            key={item.id}
            html={item.paragraph ?? ''}
            className="[&>p]:m-0 [&>p]:inline [&>p+p]:before:content-['_·_']"
          />
        ))}
      {social.isShow && social.list
        .filter((item) => item.isShow)
        .map((item) => (
          <a
            key={item.id}
            href={safeHref(item.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="cv-accent flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            {item.icon === 'linkedin' && <LinkedInIcon />}
            {item.icon === 'github' && <GitHubIcon />}
            <HtmlContent html={item.type ?? ''} className="[&>p]:m-0" />
          </a>
        ))}
    </div>
  )
}

function InlineEducation({ section }: { section: ResumeData['user']['education'] }) {
  if (!section.isShow) return null
  return (
    <div className="text-[12px]">
      <SectionTitle>{section.name}</SectionTitle>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {section.list
          .filter((item) => item.isShow)
          .map((item) => (
            <span key={item.id} className="flex items-baseline gap-1.5">
              <HtmlContent html={item.title ?? ''} className="cv-heading font-semibold [&>p]:m-0 [&>p]:inline" />
              <HtmlContent html={item.subtitle ?? ''} className="cv-muted [&>p]:m-0 [&>p]:inline" />
              <HtmlContent html={item.paragraph ?? ''} className="cv-muted [&>p]:m-0 [&>p]:inline" />
            </span>
          ))}
      </div>
    </div>
  )
}

function LayoutTopHeader({ data }: { data: ResumeData }) {
  const { about, summary, experience, project, education, contact, social, skill, certificate } = data.user
  return (
    <>
      <Header about={about}>
        <div className="mt-2">
          <InlineContact contact={contact} social={social} />
        </div>
      </Header>
      <Summary summary={summary} />
      <div className="px-10 pb-8">
        <ExperienceSection section={experience} />
        <ProjectSection section={project} />
        <div className="mt-5">
          <InlineEducation section={education} />
        </div>
        <SkillSection section={skill} />
        <CertificateSection section={certificate} />
      </div>
    </>
  )
}

function LayoutSingleColumn({ data }: { data: ResumeData }) {
  const { about, summary, experience, project, education, contact, social, skill, certificate } = data.user
  return (
    <>
      <Header about={about} />
      <Summary summary={summary} />
      <div className="px-10 pb-8">
        <ExperienceSection section={experience} />
        <ProjectSection section={project} />
        <div className="mt-5">
          <InlineEducation section={education} />
        </div>
        <SkillSection section={skill} />
        <CertificateSection section={certificate} />
        <div className="flex gap-8 text-[11px] leading-snug mt-4">
          <div className="flex-1">
            <ContactSection section={contact} />
          </div>
          <div className="flex-1">
            <SocialSection section={social} />
          </div>
        </div>
      </div>
    </>
  )
}

const LAYOUTS: Record<LayoutValue, React.ComponentType<{ data: ResumeData }>> = {
  'right-sidebar': LayoutRightSidebar,
  'left-sidebar': LayoutLeftSidebar,
  'top-header': LayoutTopHeader,
  'single-column': LayoutSingleColumn,
}

export function ResumePreview({ data, fontFamily, colorTheme, layout }: ResumePreviewProps) {
  const font = FONT_OPTIONS.find((f) => f.value === fontFamily) ?? FONT_OPTIONS[0]
  const color = COLOR_THEMES.find((c) => c.value === colorTheme) ?? COLOR_THEMES[0]

  const cssVars: CSSProperties & Record<string, string> = {
    '--cv-accent': color.accent,
    '--cv-accent-bg': color.accentBg,
    '--cv-heading': color.heading,
    '--cv-text': color.text,
    '--cv-muted': color.muted,
    '--cv-border': color.border,
    fontFamily: font.css,
    color: color.text,
  }

  const LayoutComponent = LAYOUTS[layout]

  return (
    <div
      className="resume-page w-full max-w-[210mm] min-h-[297mm] bg-white shadow-lg mx-auto my-4 lg:my-8"
      style={cssVars}
    >
      <LayoutComponent data={data} />
    </div>
  )
}

function LinkedInIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d={LINKEDIN_PATH} />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d={GITHUB_PATH} />
    </svg>
  )
}

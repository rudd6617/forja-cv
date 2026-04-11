import type { ResumeData, ResumeItem } from '../types/resume'
import { HtmlContent } from './HtmlContent'

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
    <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase border-b border-gray-300 pb-1 mb-3">
      {children}
    </h3>
  )
}

function ContactSection({ section }: { section: ResumeData['user']['contact'] }) {
  if (!section.isShow) return null
  return (
    <div className="sidebar-section mb-6">
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
    <div className="sidebar-section mb-6">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <a
            key={item.id}
            href={safeHref(item.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 mb-1.5"
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
    <div className="sidebar-section mb-6">
      <SectionTitle>{section.name}</SectionTitle>
      {section.list
        .filter((item) => item.isShow)
        .map((item) => (
          <div key={item.id} className="mb-3">
            <HtmlContent
              html={item.title ?? ''}
              className="font-semibold [&>p]:m-0"
            />
            <HtmlContent
              html={item.subtitle ?? ''}
              className="text-gray-600 [&>p]:m-0"
            />
            <HtmlContent
              html={item.paragraph ?? ''}
              className="text-gray-500 [&>p]:m-0"
            />
          </div>
        ))}
    </div>
  )
}

function ExperienceEntry({ item }: { item: ResumeItem }) {
  if (!item.isShow) return null
  return (
    <div className="experience-entry mb-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <HtmlContent
          html={item.title ?? ''}
          className="text-base font-semibold [&>p]:m-0"
        />
        <HtmlContent
          html={item.subtitle2 ?? ''}
          className="text-xs text-gray-500 shrink-0 [&>p]:m-0"
        />
      </div>
      <HtmlContent
        html={item.subtitle1 ?? ''}
        className="text-sm text-gray-600 [&>p]:m-0"
      />
      <HtmlContent
        html={item.paragraph ?? ''}
        className="resume-content mt-2 text-sm leading-relaxed"
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

export function ResumePreview({ data }: { data: ResumeData }) {
  const { about, summary, experience, education, contact, social } = data.user

  return (
    <div className="resume-page w-full max-w-[210mm] min-h-[297mm] bg-white shadow-lg mx-auto my-4 lg:my-8 print:my-0 print:shadow-none print:w-[210mm]">
      {about.isShow && (
        <div className="px-10 pt-8 pb-4">
          <HtmlContent
            html={about.name}
            className="text-3xl font-bold text-gray-900 [&>p]:m-0"
          />
          <HtmlContent
            html={about.jobTitle}
            className="text-lg text-gray-600 mt-1 [&>p]:m-0"
          />
        </div>
      )}

      {summary.isShow && (
        <div className="px-10 pb-4">
          {summary.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {summary.hashtags.map((tag) => (
                <HtmlContent
                  key={tag}
                  html={tag}
                  className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded [&>p]:m-0"
                />
              ))}
            </div>
          )}
          <HtmlContent
            html={summary.paragraph}
            className="resume-content text-sm leading-relaxed text-gray-700"
          />
        </div>
      )}

      <div className="flex px-10 pb-8 gap-6">
        <div className="w-4/5">
          <ExperienceSection section={experience} />
        </div>
        <div className="w-1/5 shrink-0 text-xs leading-tight">
          <ContactSection section={contact} />
          <SocialSection section={social} />
          <EducationSection section={education} />
        </div>
      </div>
    </div>
  )
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

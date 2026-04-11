export interface ResumeItem {
  id: string
  isShow: boolean
  isCollapsed: boolean
  isEditing: boolean
  title?: string
  subtitle?: string
  subtitle1?: string
  subtitle2?: string
  paragraph?: string
  icon?: 'linkedin' | 'github' | string
  type?: string
  link?: string
}

export interface ResumeSection {
  isShow: boolean
  name: string
  list: ResumeItem[]
  isEditing?: boolean
}

export interface AboutSection {
  isShow: boolean
  isEditing: boolean
  name: string
  jobTitle: string
}

export interface SummarySection {
  isShow: boolean
  isEditing: boolean
  hashtags: string[]
  paragraph: string
}

export const SECTION_KEYS = [
  'experience', 'education', 'contact', 'social',
  'project', 'skill', 'certificate',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

export interface ResumeData {
  title: string
  toolbar?: unknown
  user: {
    template: number
    splitIndex: number
    about: AboutSection
    summary: SummarySection
    experience: ResumeSection
    project: ResumeSection
    skill: ResumeSection
    education: ResumeSection
    certificate: ResumeSection
    contact: ResumeSection
    social: ResumeSection
  }
}

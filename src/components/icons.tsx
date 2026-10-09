import type { SVGProps } from 'react'

/** 内联 SVG 图标，currentColor 着色，随模板 textColor/accentColor 变化 */

type P = SVGProps<SVGSVGElement>

/** Reference silhouettes redrawn with matching fine strokes and rounded ends. */
export function ProfileShareIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9v10a1 1 0 0 0 1 1h14" />
    <path d="M9 15c0-5 3-7 11-7m-4-4 4 4-4 4" />
  </svg>
}

export function ProfileEditIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m16 3 4 4-12 12-5 1 1-5L16 3Z" />
    <path d="m13 6 4 4M13 20h7" />
  </svg>
}

const base: P = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  'aria-hidden': true,
}

export function MaimaiIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 13.5c.8-1.6 2.2-2.5 4-2.5s3.2.9 4 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8.6" r="1.9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function WechatIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M9.5 4C5.9 4 3 6.5 3 9.6c0 1.8 1 3.4 2.5 4.4l-.6 2 2.2-1.1c.4.1.9.2 1.4.2h.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.8 8.5c3.1.3 5.7 2.4 5.7 5.1 0 1.5-.8 2.8-2.1 3.7l.5 1.7-1.9-1c-.4.1-.8.2-1.2.2-3.1 0-5.6-2.1-5.6-4.8s2.5-4.8 5.6-4.8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MailIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PhoneIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M6.2 3.8c.6-.6 1.5-.5 2 .2l1.4 1.9c.4.6.4 1.4-.1 1.9l-.9.9c.7 1.6 2 2.9 3.6 3.6l.9-.9c.5-.5 1.3-.5 1.9-.1l1.9 1.4c.7.5.8 1.4.2 2l-1 1c-.6.6-1.5.9-2.3.7-3.4-.9-6.1-3.6-7-7-.2-.8.1-1.7.7-2.3l.7-.7z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LinkIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path
        d="M10 14a4 4 0 0 0 5.7 0l2.1-2.1a4 4 0 0 0-5.7-5.7l-1 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 10a4 4 0 0 0-5.7 0l-2.1 2.1a4 4 0 0 0 5.7 5.7l1-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ArrowRightIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15m-6-7 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const CONTACT_ICONS = {
  maimai: MaimaiIcon,
  wechat: WechatIcon,
  email: MailIcon,
  phone: PhoneIcon,
} as const

export const CONTACT_LABELS = {
  maimai: '脉脉',
  wechat: '微信',
  email: '邮箱',
  phone: '电话',
} as const

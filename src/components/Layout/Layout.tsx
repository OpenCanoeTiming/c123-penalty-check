import type { ReactNode } from 'react'
import styles from './Layout.module.css'

interface LayoutProps {
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function Layout({ header, children, footer }: LayoutProps) {
  return (
    <div className={styles.layout}>
      {/* A div, not <header>: the header slot holds the DS AppHeader, which
          is the banner landmark itself - a <header> here nests two banners. */}
      <div className={styles.header}>{header}</div>
      <main className={styles.main}>{children}</main>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </div>
  )
}

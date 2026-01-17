import type { ReactNode } from 'react'
import styles from './Layout.module.css'

interface LayoutProps {
  header: ReactNode
  raceBar?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function Layout({ header, raceBar, toolbar, children, footer }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>{header}</header>
      {raceBar && <div className={styles.raceBar}>{raceBar}</div>}
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <main className={styles.main}>{children}</main>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </div>
  )
}

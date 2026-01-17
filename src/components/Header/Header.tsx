import type { ReactNode } from 'react'
import {
  Header as DSHeader,
  HeaderBrand,
  HeaderTitle,
  HeaderActions,
  HeaderStatus,
} from '@opencanoetiming/timing-design-system'

interface HeaderProps {
  title?: string
  raceInfo?: string
  connectionStatus: ReactNode
  actions?: ReactNode
}

export function Header({
  title = 'C123 Scoring',
  raceInfo,
  connectionStatus,
  actions,
}: HeaderProps) {
  return (
    <DSHeader>
      <HeaderBrand>
        <HeaderTitle subtitle={raceInfo}>{title}</HeaderTitle>
      </HeaderBrand>
      <HeaderActions>
        {actions}
      </HeaderActions>
      <HeaderStatus>
        {connectionStatus}
      </HeaderStatus>
    </DSHeader>
  )
}

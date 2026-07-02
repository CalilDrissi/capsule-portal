import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { useNavigate } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

/** Carbon breadcrumb trail for detail pages (replaces ad-hoc "Back" buttons). */
export default function PageBreadcrumb({ items }: { items: Crumb[] }) {
  const navigate = useNavigate()
  return (
    <Breadcrumb noTrailingSlash className="capsule-breadcrumb">
      {items.map((c, i) => {
        const isLast = i === items.length - 1
        return (
          <BreadcrumbItem key={c.label} isCurrentPage={isLast}>
            {isLast || !c.to ? (
              c.label
            ) : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  navigate(c.to as string)
                }}
              >
                {c.label}
              </a>
            )}
          </BreadcrumbItem>
        )
      })}
    </Breadcrumb>
  )
}

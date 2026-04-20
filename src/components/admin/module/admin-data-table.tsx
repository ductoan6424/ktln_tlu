import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import type {
  AdminCellValues,
  AdminColumnDefinition,
  AdminRecord,
} from "@/lib/admin/admin-types"

import { AdminEmptyState } from "@/components/admin/module/admin-empty-state"

interface AdminDataTableProps<Cells extends AdminCellValues> {
  columns: readonly AdminColumnDefinition<Cells>[]
  records: readonly AdminRecord<Cells>[]
  emptyState?: {
    title: string
    description: string
    actionLabel?: string
    actionHref?: string
  }
}

export function AdminDataTable<Cells extends AdminCellValues>({
  columns,
  records,
  emptyState,
}: AdminDataTableProps<Cells>) {
  if (records.length === 0) {
    return (
      <AdminEmptyState
        title={emptyState?.title ?? "Chua co du lieu"}
        description={emptyState?.description ?? "Khong co ban ghi nao de hien thi."}
        actionLabel={emptyState?.actionLabel}
        actionHref={emptyState?.actionHref}
      />
    )
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-border last:border-b-0">
                {columns.map((column) => {
                  const value = String(record.cells[column.key] ?? "")
                  const content =
                    column.key === "title" && record.href ? (
                      <Link href={record.href} className="font-medium text-foreground hover:underline">
                        {value}
                      </Link>
                    ) : (
                      <span className={column.key === "title" ? "font-medium text-foreground" : ""}>
                        {value}
                      </span>
                    )

                  return (
                    <td
                      key={column.key}
                      className="px-4 py-4 text-sm text-muted-foreground"
                      style={{ textAlign: column.align }}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

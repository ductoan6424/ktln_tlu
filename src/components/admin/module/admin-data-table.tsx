import Link from "next/link"

import { AdminEmptyState } from "@/components/admin/module/admin-empty-state"
import { Card, CardContent } from "@/components/ui/card"
import type {
  AdminCellValues,
  AdminColumnDefinition,
  AdminRecord,
} from "@/lib/admin/admin-types"

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
        title={emptyState?.title ?? "Chưa có dữ liệu"}
        description={emptyState?.description ?? "Không có bản ghi nào để hiển thị."}
        actionLabel={emptyState?.actionLabel}
        actionHref={emptyState?.actionHref}
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border md:hidden">
          {records.map((record) => {
            const titleValue = String(record.cells.title ?? record.title)
            const detailColumns = columns.filter((column) => column.key !== "title")
            const titleContent = record.href ? (
              <Link href={record.href} className="font-semibold text-foreground hover:underline">
                {titleValue}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{titleValue}</span>
            )

            return (
              <article key={record.id} className="flex flex-col gap-3 p-4">
                <div className="min-w-0">
                  <h2 className="truncate text-sm">{titleContent}</h2>
                  {record.subtitle ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{record.subtitle}</p>
                  ) : null}
                </div>

                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {detailColumns.map((column) => {
                    const value = String(record.cells[column.key] ?? "")
                    if (!value) return null

                    return (
                      <div key={column.key} className="flex items-start justify-between gap-3">
                        <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {column.header}
                        </dt>
                        <dd className="min-w-0 break-words text-right text-sm text-foreground">
                          {value}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </article>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-muted/50">
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
              <tr key={record.id} className="border-b border-border transition-colors hover:bg-primary/5 last:border-b-0">
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
                      className="p-4 text-sm text-muted-foreground"
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
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Plus, Save, ShieldCheck, Trash2 } from "lucide-react"

import {
  createCommunityRule,
  deleteCommunityRule,
  updateCommunityRule,
} from "@/actions/community-moderation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  facebookDangerButton,
  facebookPrimaryButton,
  facebookSecondaryButton,
  manageEmpty,
  manageInput,
  manageItem,
  manageSoftItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"

type CommunityRuleItem = {
  id: string
  title: string
  description: string
  position: number
}

export function CommunityRulesPanel({
  rules,
  targetType,
  targetId,
}: {
  rules: CommunityRuleItem[]
  targetType?: "GROUP" | "CLUB" | "COURSE"
  targetId?: string
}) {
  const { refresh } = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const canEdit = Boolean(targetType && targetId)

  return (
    <Card className={`${manageSurface} gap-0 py-0`}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#050505]">Quy định</h2>
            <p className="text-sm text-[#65676b]">
              Các quy định thành viên phải đồng ý trước khi tham gia.
            </p>
          </div>
        </div>

        {canEdit ? (
          <form
            className={`${manageSoftItem} grid gap-3`}
            action={(formData) => {
              startTransition(async () => {
                const result = await createCommunityRule({
                  targetType: targetType!,
                  targetId: targetId!,
                  title: String(formData.get("title") ?? ""),
                  description: String(formData.get("description") ?? ""),
                  position: rules.length,
                })
                setMessage(
                  result.success
                    ? "Đã thêm quy định."
                    : result.error ?? "Không thể thêm.",
                )
                if (result.success) refresh()
              })
            }}
          >
            <Input
              name="title"
              placeholder="Tiêu đề quy định"
              required
              className={manageInput}
            />
            <Textarea
              name="description"
              placeholder="Mô tả quy định"
              required
              className={manageInput}
            />
            <Button
              className={`${facebookPrimaryButton} justify-self-start`}
              type="submit"
              disabled={pending}
            >
              <Plus data-icon="inline-start" />
              Thêm quy định
            </Button>
          </form>
        ) : null}

        {rules.length > 0 ? (
          <div className="space-y-3">
            {rules.map((rule) => (
              <article key={rule.id} className={manageItem}>
                <p className="text-xs font-semibold text-[#1877f2]">
                  #{rule.position + 1}
                </p>
                <h3 className="mt-1 font-semibold text-[#050505]">{rule.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#65676b]">
                  {rule.description}
                </p>

                {canEdit ? (
                  <div className="mt-4 grid gap-2 border-t border-[#e4e6eb] pt-3">
                    <form
                      className="grid gap-2"
                      action={(formData) => {
                        startTransition(async () => {
                          const result = await updateCommunityRule({
                            targetType: targetType!,
                            targetId: targetId!,
                            ruleId: rule.id,
                            title: String(formData.get("title") ?? ""),
                            description: String(formData.get("description") ?? ""),
                          })
                          setMessage(
                            result.success
                              ? "Đã lưu quy định."
                              : result.error ?? "Không thể lưu.",
                          )
                          if (result.success) refresh()
                        })
                      }}
                    >
                      <input type="hidden" name="ruleId" value={rule.id} />
                      <Input
                        name="title"
                        defaultValue={rule.title}
                        className={manageInput}
                      />
                      <Textarea
                        name="description"
                        defaultValue={rule.description}
                        className={manageInput}
                      />
                      <Button
                        className={`${facebookSecondaryButton} justify-self-start`}
                        size="sm"
                        type="submit"
                        disabled={pending}
                      >
                        <Save data-icon="inline-start" />
                        Lưu
                      </Button>
                    </form>

                    <form
                      action={() => {
                        startTransition(async () => {
                          const result = await deleteCommunityRule({
                            targetType: targetType!,
                            targetId: targetId!,
                            ruleId: rule.id,
                          })
                          setMessage(
                            result.success
                              ? "Đã xoá quy định."
                              : result.error ?? "Không thể xoá.",
                          )
                          if (result.success) refresh()
                        })
                      }}
                    >
                      <input type="hidden" name="ruleId" value={rule.id} />
                      <Button
                        size="sm"
                        variant="outline"
                        type="submit"
                        disabled={pending}
                        className={facebookDangerButton}
                      >
                        <Trash2 data-icon="inline-start" />
                        Xoá
                      </Button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className={manageEmpty}>Chưa có quy định nào.</p>
        )}

        {message ? <p className="text-sm text-[#65676b]">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

"use client";
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SearchSelection, type SearchSelectionOption } from "@/lib/search-selection";
export type Data = Record<string, any>;
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  uppercase?: boolean;
  onChange?: (value: string) => void;
  options?: {
    value: string;
    label: string;
  }[];
  searchOptions?: readonly SearchSelectionOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  default?: string | number | boolean;
};
function uppercaseInput(input: HTMLInputElement) {
  const value = input.value;
  const upper = value.toUpperCase();
  if (value === upper) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const direction = input.selectionDirection;
  input.value = upper;
  if (start !== null && end !== null)
    input.setSelectionRange(
      value.slice(0, start).toUpperCase().length,
      value.slice(0, end).toUpperCase().length,
      direction ?? undefined,
    );
}
export function Form({
  fields,
  submit,
  onSubmit,
  initial = {},
  busy = false,
  afterFields,
}: {
  fields: Field[];
  submit: string;
  onSubmit: (v: Data) => Promise<void>;
  initial?: Data;
  busy?: boolean;
  afterFields?: React.ReactNode;
}) {
  const { t } = useI18n();
  const composing = useRef(new Set<string>());
  const shape: Record<string, z.ZodType> = {};
  for (const f of fields) {
    if (f.type === "number")
      shape[f.name] = z.coerce
        .number({ error: t("Vui lòng nhập số hợp lệ.") })
        .min(f.min ?? 0, t("Giá trị nhỏ hơn mức tối thiểu cho phép."))
        .max(f.max ?? 1e12, t("Giá trị vượt mức tối đa cho phép."));
    else if (f.type === "checkbox") shape[f.name] = z.boolean().default(false);
    else if (f.type === "password")
      shape[f.name] = z
        .string()
        .min(1, t("Vui lòng nhập mật khẩu."))
        .max(f.max ?? 128, t("Nội dung quá dài."));
    else if (f.required !== false)
      shape[f.name] = z
        .string()
        .trim()
        .min(1, t("Vui lòng nhập trường này."))
        .max(f.max ?? 2048, t("Nội dung quá dài."));
    else shape[f.name] = z.string().default("");
  }
  const defaults = Object.fromEntries(
    fields.map((f) => [
      f.name,
      initial[f.name] ??
        f.default ??
        (f.type === "checkbox" ? false : (f.options?.[0]?.value ?? "")),
    ]),
  );
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Data>({
    resolver: zodResolver(z.object(shape)) as any,
    defaultValues: defaults,
  });
  const signature = JSON.stringify(initial);
  useEffect(() => {
    reset(
      Object.fromEntries(
        fields.map((f) => [
          f.name,
          initial[f.name] ??
            f.default ??
            (f.type === "checkbox" ? false : (f.options?.[0]?.value ?? "")),
        ]),
      ),
    );
  }, [signature, reset]);
  return (
    <form className="stack" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid2">
        {fields.map((f) => (
          <div
            className={"field " + (f.type === "textarea" ? "full" : "")}
            key={f.name}
          >
            <label htmlFor={"f-" + f.name}>{t(f.label)}</label>
            {f.searchOptions ? (
              <Controller name={f.name} control={control} render={({ field }) => (
                <SearchSelection id={"f-" + f.name} value={String(field.value || "")} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} options={f.searchOptions} invalid={!!errors[f.name]} describedBy={errors[f.name] ? "error-" + f.name : undefined} placeholder={t(f.placeholder || "Tìm và chọn")} messages={{ loading: t("Đang tìm…"), empty: t("Không tìm thấy kết quả."), error: t("Không thể tìm kiếm. Vui lòng thử lại.") }} />
              )} />
            ) : f.options ? (
              <select id={"f-" + f.name} className="inp" {...register(f.name)}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.label)}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                id={"f-" + f.name}
                className="inp"
                {...register(f.name)}
                maxLength={f.max}
              />
            ) : (
              <input
                id={"f-" + f.name}
                className={f.type === "checkbox" ? "check-input" : "inp"}
                type={f.type || "text"}
                min={f.min}
                max={f.max}
                step={f.step}
                placeholder={f.placeholder ? t(f.placeholder) : undefined}
                {...register(f.name)}
                autoCapitalize={f.uppercase ? "characters" : undefined}
                onChange={(event) => {
                  if (f.uppercase && !composing.current.has(f.name))
                    uppercaseInput(event.currentTarget);
                  void register(f.name).onChange(event);
                  f.onChange?.(event.currentTarget.value);
                }}
                onCompositionStart={f.uppercase ? () => composing.current.add(f.name) : undefined}
                onCompositionEnd={f.uppercase ? (event) => {
                  composing.current.delete(f.name);
                  uppercaseInput(event.currentTarget);
                  void register(f.name).onChange(event);
                } : undefined}
              />
            )}{" "}
            {errors[f.name] && (
              <span id={"error-" + f.name} className="err">{t(String(errors[f.name]?.message))}</span>
            )}
          </div>
        ))}
      </div>
      {afterFields}
      <div>
        <button type="submit" className="btn" disabled={busy || isSubmitting}>
          {isSubmitting ? t("Đang xử lý…") : t(submit)}
        </button>
      </div>
    </form>
  );
}
export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="card">
      {title && <h2 className="card-title">{t(title)}</h2>}
      {children}
    </section>
  );
}
export function Empty({ text = "Chưa có dữ liệu." }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="empty">
      <div className="empty-mark">♧</div>
      <h3>{t(text)}</h3>
      <p>{t("Hoạt động mới sẽ xuất hiện tại đây.")}</p>
    </div>
  );
}
export function Status({ value, label }: { value: string; label?: string }) {
  const { t } = useI18n();
  if (value === "demo") return null;
  const labels: Data = {
    pending: t("Chờ xử lý"),
    approved: t("Đã duyệt"),
    rejected: t("Từ chối"),
    processing: t("Đang xử lý"),
    paid: t("Đã chuyển khoản"),
    completed: t("Hoàn thành"),
    preview: t("Bản xem trước"),
    queued: t("Đã xếp hàng"),
    failed: t("Lỗi"),
    not_configured: t("Chưa cấu hình"),
    available: t("Đang chạy"),
    temporarily_unavailable: t("Tạm gián đoạn"),
    valid: t("Hợp lệ"),
    invalid: t("Lỗi dữ liệu"),
    unmatched: t("Chưa khớp"),
    duplicate: t("Trùng"),
    adjustment: t("Cần điều chỉnh"),
    applied: t("Đã nhập"),
  };
  return (
    <span
      className={
        "pill " +
        ([
          "approved",
          "paid",
          "completed",
          "available",
          "applied",
          "valid",
        ].includes(value)
          ? "ok"
          : ["rejected", "failed", "invalid"].includes(value)
            ? "no"
            : "wait")
      }
    >
      {label || labels[value] || value}
    </span>
  );
}
export function Table({
  rows,
  columns,
  scrollLabel,
}: {
  rows: Data[];
  scrollLabel?: string;
  columns: {
    label: string;
    render: (r: Data) => React.ReactNode;
  }[];
}) {
  const { t } = useI18n();
  if (!rows.length) return <Empty />;
  return (
    <div className="scroll-x" tabIndex={scrollLabel ? 0 : undefined} role={scrollLabel ? "region" : undefined} aria-label={scrollLabel}>
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={t(c.label)}>{t(c.label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r.number || i}>
              {columns.map((c) => (
                <td key={t(c.label)}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return (
    <dialog ref={ref} className="modal" aria-label={t(title)} onCancel={onClose}>
      <div className="row between">
        <h2>{t(title)}</h2>
        <button
          className="btn sm ghost"
          onClick={onClose}
          aria-label={t("Đóng")}
        >
          {t("×")}
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  );
}

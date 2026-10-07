"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePagedQuery } from "@/lib/paged-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  History,
  Wallet,
} from "lucide-react";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { xu } from "./leaderboard";
import { Status } from "./ui";

const tabs = [
  {
    id: "xu",
    label: "Biến động Xu",
    endpoint: "/wallet/transactions",
    icon: History,
  },
  {
    id: "withdrawals",
    label: "Rút tiền",
    endpoint: "/withdrawals",
    icon: Wallet,
  },
  { id: "gifts", label: "Đổi quà", endpoint: "/gift-redemptions", icon: Gift },
] as const;
type Tab = (typeof tabs)[number]["id"];
type HistoryRow =
  | components["schemas"]["Transaction"]
  | components["schemas"]["LegacyCoinTransaction"]
  | components["schemas"]["Withdrawal"]
  | components["schemas"]["GiftRedemption"];

function Pages({
  page,
  hasNext,
  busy,
  onPage,
}: {
  page: number;
  hasNext: boolean;
  busy: boolean;
  onPage: (page: number) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="row between pager" aria-label={t("Phân trang lịch sử")}>
      <button
        className="btn sm ghost"
        disabled={page === 1 || busy}
        onClick={() => onPage(page - 1)}
      >
        {t("← Trước")}
      </button>
      <span className="small mute">
        {t("Trang")} {page}
      </span>
      <button
        className="btn sm ghost"
        disabled={!hasNext || busy}
        onClick={() => onPage(page + 1)}
      >
        {t("Tiếp →")}
      </button>
    </nav>
  );
}

function HistoryRecords({
  rows,
  tab,
  legacy = false,
}: {
  rows: HistoryRow[];
  tab: Tab;
  legacy?: boolean;
}) {
  const { t, language } = useI18n();
  const signed = (value: number) =>
    `${value > 0 ? "+" : ""}${xu(value, language)}`;
  return (
    <div
      className="history-records"
      role="table"
      aria-label={t(
        legacy
          ? "Trước khi gộp ví"
          : tabs.find((item) => item.id === tab)!.label,
      )}
    >
      <div className="history-table-head" role="row">
        <span role="columnheader">{t("Thời gian")}</span>
        <span role="columnheader">{t("Nội dung")}</span>
        <span role="columnheader">
          {t(tab === "xu" ? "Biến động" : "Số Xu")}
        </span>
        <span role="columnheader">
          {t(tab === "xu" ? "Chi tiết" : "Trạng thái / chi tiết")}
        </span>
      </div>
      {rows.map((row) => {
        const transaction = row as components["schemas"]["Transaction"];
        const old = row as components["schemas"]["LegacyCoinTransaction"];
        const withdrawal = row as components["schemas"]["Withdrawal"];
        const gift = row as components["schemas"]["GiftRedemption"];
        const amount =
          tab === "gifts"
            ? gift.costXu
            : Number(
                tab === "withdrawals"
                  ? withdrawal.amount
                  : transaction.amount || 0,
              );
        const when = new Date(row.createdAt).toLocaleString(
          language === "en" ? "en-GB" : "vi-VN",
          {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        );
        const held =
          tab === "xu" && !legacy
            ? [
                ["Đang chờ rút tiền", transaction.heldAmount],
                ["Đang chờ đổi quà", transaction.giftHeldAmount],
                ["Khoản thiếu", transaction.debtAmount],
              ].filter(([, value]) => Number(value || 0) !== 0)
            : [];
        const title =
          tab === "xu"
            ? t(transaction.description)
            : tab === "withdrawals"
              ? `${t("Rút tiền")} · ${withdrawal.bank}`
              : gift.giftName;
        return (
          <article className="history-record" role="row" key={row.id}>
            <time dateTime={row.createdAt} role="cell" className="history-time">
              {when}
            </time>
            <div className="history-description" role="cell">
              <span className="history-record-icon" aria-hidden="true">
                {tab === "gifts" ? (
                  <Gift size={17} />
                ) : tab === "withdrawals" ? (
                  <Wallet size={17} />
                ) : amount > 0 ? (
                  <ArrowDownLeft size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </span>
              <div>
                <b>{title}</b>
                <p className="small mute">
                  {tab === "withdrawals"
                    ? withdrawal.account
                    : tab === "xu"
                      ? t(
                          legacy
                            ? "Xu điểm danh (đơn vị cũ)"
                            : "Biến động khả dụng",
                        )
                      : t("Đổi voucher")}
                </p>
              </div>
            </div>
            <div
              className={
                "history-amount num" +
                (tab === "xu" && amount > 0
                  ? " is-credit"
                  : tab === "xu" && amount < 0
                    ? " is-debit"
                    : "")
              }
              role="cell"
            >
              {legacy ? (
                <>
                  {amount} {t("xu cũ")}
                  <small>
                    {t("Giá trị tương đương")}:{" "}
                    {xu(old.equivalentXu || 0, language)}
                  </small>
                </>
              ) : tab === "xu" ? (
                signed(amount)
              ) : (
                xu(amount, language)
              )}
            </div>
            <div className="history-detail" role="cell">
              {tab === "xu" ? (
                held.length ? (
                  held.map(([label, value]) => (
                    <p key={label}>
                      <span>{t(String(label))}</span>
                      <b className="num">{signed(Number(value))}</b>
                    </p>
                  ))
                ) : (
                  <span className="mute">—</span>
                )
              ) : (
                <>
                  <Status
                    value={
                      tab === "withdrawals" ? withdrawal.status : gift.status
                    }
                  />
                  {tab === "gifts" && gift.code && (
                    <code className="history-voucher">{gift.code}</code>
                  )}
                  {tab === "gifts" && gift.costUnit === "legacy_coin" && (
                    <p className="small mute">
                      {gift.legacyCost} {t("xu cũ")}
                    </p>
                  )}
                  {(tab === "withdrawals"
                    ? withdrawal.reason
                    : gift.reason) && (
                    <p className="small mute">
                      {tab === "withdrawals" ? withdrawal.reason : gift.reason}
                    </p>
                  )}
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function CustomerHistory() {
  const { t } = useI18n();
  const search = useSearchParams();
  const requested = search.get("tab");
  const tab: Tab =
    requested === "withdrawals" || requested === "gifts" ? requested : "xu";
  const selected = tabs.find((item) => item.id === tab)!;
  const [pages, setPages] = useState<Record<Tab, number>>({
    xu: 1,
    withdrawals: 1,
    gifts: 1,
  });
  const [legacyPage, setLegacyPage] = useState(1);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const endpoint = `${selected.endpoint}?page=${pages[tab]}&perPage=20`;
  const query = usePagedQuery<HistoryRow[]>(endpoint);
  const legacyEndpoint = `/coins/transactions?page=${legacyPage}&perPage=20`;
  const legacy = usePagedQuery<components["schemas"]["LegacyCoinTransaction"][]>(legacyEndpoint,tab === "xu");
  const panel = `history-${tab}-panel`;
  return (
    <div className="stack history-screen">
      <div className="history-intro">
        <span className="history-intro-icon">
          <History size={22} aria-hidden="true" />
        </span>
        <div>
          <h2>{t("Mọi giao dịch, trong một nơi")}</h2>
          <p className="small mute">
            {t("Theo dõi Xu nhận, Xu sử dụng và các yêu cầu của bạn.")}
          </p>
        </div>
      </div>
      <div
        className="tabs history-tabs"
        role="tablist"
        aria-label={t("Loại lịch sử")}
      >
        {tabs.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            id={`history-${id}-tab`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`history-${id}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => {
              const params = new URLSearchParams(search.toString());
              params.set("tab", id);
              window.history.replaceState(
                null,
                "",
                `/history?${params.toString()}`,
              );
            }}
            onKeyDown={(event) => {
              let next: number | undefined;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              if (event.key === "ArrowLeft")
                next = (index + tabs.length - 1) % tabs.length;
              if (event.key === "Home") next = 0;
              if (event.key === "End") next = tabs.length - 1;
              if (next !== undefined) {
                event.preventDefault();
                const button = document.getElementById(
                  `history-${tabs[next].id}-tab`,
                );
                button?.focus();
                button?.click();
              }
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {t(label)}
          </button>
        ))}
      </div>
      <section
        className="card history-card"
        role="tabpanel"
        id={panel}
        aria-labelledby={`history-${tab}-tab`}
        tabIndex={0}
        aria-busy={query.isFetching}
      >
        {query.isPending ? (
          <p className="history-empty mute" role="status">
            {t("Đang tải lịch sử…")}
          </p>
        ) : query.isError ? (
          <div role="alert">
            <p className="err">{t(query.error.message)}</p>
            <button
              className="btn sm ghost"
              onClick={() => void query.refetch()}
            >
              {t("Thử lại")}
            </button>
          </div>
        ) : !query.data?.length ? (
          <div className="history-empty">
            <History size={26} aria-hidden="true" />
            <h3>{t("Chưa có lịch sử")}</h3>
            <p className="small mute">
              {t("Các giao dịch và yêu cầu của bạn sẽ xuất hiện ở đây.")}
            </p>
          </div>
        ) : (
          <HistoryRecords rows={query.data || []} tab={tab} />
        )}
        <Pages
          page={pages[tab]}
          hasNext={Boolean(query.meta?.hasNext)}
          busy={query.isFetching}
          onPage={(page) => setPages((value) => ({ ...value, [tab]: page }))}
        />
      </section>
      {tab === "xu" &&
        (legacy.isError ||
          (legacy.data?.length || 0) > 0 ||
          legacyPage > 1) && (
          <details
            className="card history-legacy"
            open={legacyOpen}
            onToggle={(event) => setLegacyOpen(event.currentTarget.open)}
          >
            <summary>{t("Trước khi gộp ví")}</summary>
            <p className="small mute history-legacy-note">
              {t(
                "Lịch sử trước khi gộp ví. Số Xu còn lại đã chuyển ×300; không cộng lại các giao dịch này.",
              )}
            </p>
            {legacy.isPending ? (
              <p role="status">{t("Đang tải lịch sử…")}</p>
            ) : legacy.isError ? (
              <div role="alert">
                <p className="err">{t(legacy.error.message)}</p>
                <button
                  className="btn sm ghost"
                  onClick={() => void legacy.refetch()}
                >
                  {t("Thử lại")}
                </button>
              </div>
            ) : legacy.data?.length ? (
              <HistoryRecords rows={legacy.data || []} tab="xu" legacy />
            ) : (
              <p>{t("Chưa có lịch sử")}</p>
            )}
            <Pages
              page={legacyPage}
              hasNext={Boolean(legacy.meta?.hasNext)}
              busy={legacy.isFetching}
              onPage={setLegacyPage}
            />
          </details>
        )}
    </div>
  );
}

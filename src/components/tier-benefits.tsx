"use client";
import { Gem, Medal, ShieldCheck } from "lucide-react";
import { configuredTierName } from "@/lib/cashback";
import { useI18n } from "@/lib/i18n";
import { date } from "@/lib/api";
import { XuAmount } from "./xu-amount";
import { moneyRange, type RewardMembership, type RewardRange } from "@/lib/wallet-preview";
export function TierBadge({code,nameVi,nameEn}:{code:string;nameVi?:string;nameEn?:string}) {
 const {t,language}=useI18n();const Icon=code==="diamond"?Gem:Medal;
 return <span className={`reward-tier-badge ${code}`}><Icon size={14} aria-hidden="true"/>{t(configuredTierName({tierCode:code,nameVi,nameEn},language))}</span>;
}
export function TierBenefits({membership,next=null,compact=false}:{membership:RewardMembership;next?:RewardRange|null;compact?:boolean}) {
 const {t,language}=useI18n();const nextTier=membership.nextTier;
 const number=(n:number)=>n.toLocaleString(language==="en"?"en-US":"vi-VN");
 const total=Math.max(0,Number(membership.periodGoldTotal||0));
 const target=Number(nextTier?.minGoldTotal||0);const maintain=Number(membership.minGoldTotal||0);
 const missing=Math.max(0,Number(membership.goldToMaintain??maintain-total));
 const range=moneyRange(next,language);
 return <div className={`reward-upgrade${compact?" compact":""}`}>
  {membership.periodStartsAt&&membership.periodEndsAt&&<p className="small mute">{t("Kỳ xét hạng")}: {date(membership.periodStartsAt)} → {date(membership.periodEndsAt)} ({t("không gồm ngày kết thúc")})</p>}
  <div className="reward-upgrade-heading">
   <p><span>{t("Hoàn vàng trong kỳ")}</span><b className="num"><XuAmount amount={total}/></b></p>
   {nextTier&&<TierBadge code={nextTier.tierCode || ""} nameVi={nextTier.nameVi} nameEn={nextTier.nameEn}/>}
  </div>
  {nextTier?<>
   <progress className="reward-progress" aria-label={t("Tiến độ lên hạng")} aria-valuetext={`${number(total)} / ${number(target)} Xu`} max={Math.max(1,target)} value={Math.min(target,total)}/>
   <div className="reward-progress-scale num" aria-hidden="true"><span>{number(0)}</span><span>{number(target)}</span></div>
   {range&&<div className="reward-next-estimate"><span>{t("Nếu ở hạng")} {t(configuredTierName(nextTier,language))}<small>{t("Với sản phẩm này")}</small></span><strong className="num">{range}</strong></div>}
  </>:<div className="reward-highest"><ShieldCheck size={15}/>{t("Bạn đang ở hạng cao nhất")}</div>}
  <div className="reward-maintain">
   {membership.nextPeriodTierCode&&<p>{t("Hạng dự kiến kỳ sau")}: <b>{t(configuredTierName({tierCode:membership.nextPeriodTierCode,nameVi:membership.nextPeriodNameVi,nameEn:membership.nextPeriodNameEn},language))}</b></p>}
   <p>{missing>0?<>{t("Còn")} <b className="num"><XuAmount amount={missing}/></b> {t("Xu vàng để giữ hạng kỳ sau")}</>:t("Đã đủ điều kiện giữ hạng kỳ sau")}</p>
   {maintain>0&&<progress className="reward-progress" aria-label={t("Tiến độ giữ hạng")} aria-valuetext={`${number(total)} / ${number(maintain)} Xu`} max={maintain} value={Math.min(maintain,total)}/>}
  </div>
 </div>;
}

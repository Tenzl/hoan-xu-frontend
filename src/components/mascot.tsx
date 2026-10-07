"use client";
import { useI18n } from "@/lib/i18n";
const pixels = [
  "..W..........W..",
  ".WKK........KKW.",
  ".KKKKKKKKKKKKKK.",
  "..KKKKKKKKKKKK..",
  ".KKKKKKKKKKKKKK.",
  ".KKKKKKKKKKKKKK.",
  ".KEKKEKHHKEKKEK.",
  ".KKEEKHHHHKEEKK.",
  "..BBKKHHHHKKBB..",
  "..GKKKHHHHKKKG..",
  ".GGGKKHHHHKKGGG.",
  ".GGGGKHHHHKGGGG.",
  "..GGGKHHHHKGGG..",
  "......HNNH......",
  "......HHHH......",
  ".......HH.......",
];
const colors: Record<string, string> = {
  K: "var(--tp)",
  W: "var(--tp-w)",
  E: "#fff",
  H: "var(--tp-h)",
  N: "#0b0d0c",
  B: "#e58a96",
  G: "var(--jade)",
};
export function Mascot({ size = 80, mood = "default" }: { size?: number; mood?: "default" | "sad" }) {
  const { t } = useI18n();
  return (
    <svg
      className="tapir"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={t("Linh vật lợn vòi")}
    >
      {(mood === "sad" ? pixels.map((row,y) => y === 6 ? ".KKKKEKHHKEKKKK." : y === 7 ? ".KKEKKHHHHKKEKK." : row) : pixels).flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect
              key={y + "-" + x}
              x={x}
              y={y}
              width="1.03"
              height="1.03"
              fill={colors[c]}
            />
          ),
        ),
      )}
    </svg>
  );
}

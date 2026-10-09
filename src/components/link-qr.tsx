"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Modal } from "./ui";

export function LinkQR({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationError, setGenerationError] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFile(null);
    setGenerationError(false);
    setShareError(false);
    setCanShare(false);
    async function prepare() {
      try {
        const { generate } = await import("lean-qr");
        if (!active || !canvas.current) return;
        const modules = document.createElement("canvas");
        generate(url).toCanvas(modules, { pad: 4, on: [0, 0, 0, 255], off: [255, 255, 255, 255] });
        const output = canvas.current;
        const context = output.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        output.width = output.height = 1024;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, 1024, 1024);
        context.imageSmoothingEnabled = false;
        const size = modules.width * Math.floor(1024 / modules.width);
        const offset = Math.floor((1024 - size) / 2);
        context.drawImage(modules, offset, offset, size, size);
        const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error("PNG unavailable")), "image/png"));
        if (!active) return;
        const code = /^\/([A-Za-z0-9]+)$/.exec(new URL(url).pathname)?.[1];
        const image = new File([blob], `hoanxu-qr-${code || "shopee"}.png`, { type: "image/png" });
        setFile(image);
        try { setCanShare(typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [image] })); }
        catch { setCanShare(false); }
      } catch {
        if (active) setGenerationError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void prepare();
    return () => { active = false; };
  }, [url, attempt]);

  async function share() {
    if (!file || !canShare || sharing) return;
    setSharing(true);
    setShareError(false);
    try { await navigator.share({ files: [file] }); }
    catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setShareError(true);
    } finally { setSharing(false); }
  }

  function download() {
    if (!file) return;
    const objectURL = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = objectURL;
    anchor.download = file.name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
  }

  return <Modal title="Chia sẻ QR" onClose={onClose} className="link-qr-modal">
    <div className="link-qr-body" aria-busy={loading}>
      <p>{t("Quét mã để mở link mua hàng Shopee.")}</p>
      {loading && <p role="status">{t("Đang tạo mã QR…")}</p>}
      <canvas ref={canvas} className="link-qr-image" role="img" aria-label={t("Mã QR của link hoàn tiền")} hidden={!file} />
      {generationError && <div role="alert"><p className="err">{t("Không tạo được mã QR. Vui lòng thử lại.")}</p><button type="button" className="btn sm ghost" onClick={() => setAttempt(value => value + 1)}>{t("Thử lại")}</button></div>}
      <code className="link-qr-url" tabIndex={0}>{url}</code>
      <div className="link-qr-actions">
        {canShare && <button type="button" className="btn" disabled={!file || sharing} onClick={() => void share()}><Share2 size={16} aria-hidden="true" />{t("Chia sẻ ảnh QR")}</button>}
        <button type="button" className="btn ghost" disabled={!file} onClick={download}><Download size={16} aria-hidden="true" />{t("Tải PNG")}</button>
      </div>
      {file && !canShare && <p className="small mute">{t("Tải ảnh QR để gửi qua ứng dụng bạn muốn.")}</p>}
      {shareError && <p className="err" role="alert">{t("Không chia sẻ được ảnh QR. Bạn có thể tải PNG để gửi.")}</p>}
    </div>
  </Modal>;
}

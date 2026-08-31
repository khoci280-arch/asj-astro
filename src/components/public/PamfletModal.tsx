import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { useOverlay } from '../ui/useOverlay';

interface Props { isOpen: boolean; url: string; onClose: () => void; }

export default function PamfletModal({ isOpen, url, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (isOpen) setLoaded(false); }, [isOpen, url]);
const { containerRef, onBackdropClick } = useOverlay({ open: isOpen, onClose });

  if (!isOpen || !url || url === "-") return null;

  return h("div", {
    class: "fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4",
    style: "backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);",
    ref: containerRef, onClick: onBackdropClick,
  },
    h("div", { class: "relative w-full max-w-3xl mx-auto flex flex-col items-center" },
      h("button", {
        onClick: onClose,
        class: "absolute -top-12 right-0 text-slate-300 hover:text-red-500 text-4xl font-black drop-shadow-md transition transform hover:scale-110 z-10",
        "aria-label": "Close",
      }, "\u00d7"),
      h("img", {
        src: url,
        alt: "Pamflet",
        onLoad: () => setLoaded(true),
        class: "bg-slate-900 border border-slate-700 rounded-2xl",
        style: `object-fit: contain; width: 100%; max-width: 700px; max-height: 90vh; box-shadow: 0 0 40px rgba(0,0,0,0.9); opacity: ${loaded ? 1 : 0}; transition: opacity 0.3s;`,
      }),
      !loaded ? h("div", { class: "absolute inset-0 flex items-center justify-center" },
        h("div", { class: "w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" })) : null));
}

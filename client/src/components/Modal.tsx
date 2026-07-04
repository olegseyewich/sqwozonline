import { useEffect } from "react";
import { XIcon } from "./Icons";

export default function Modal({
  title,
  onClose,
  children,
  wide,
  wider,
  large,
  noScroll,
  className,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  wider?: boolean;
  large?: boolean;
  noScroll?: boolean;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={onClose}
    >
      <div
        className={`cc-pop w-full overflow-hidden ${className || (large ? "max-w-4xl" : wider ? "max-w-3xl" : wide ? "max-w-2xl" : "max-w-md")} rounded-xl bg-discord-bg shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/20 px-5 py-4">
          <h2 className="min-w-0 truncate text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-discord-muted hover:text-white" aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>
        <div className={noScroll ? "p-0" : "max-h-[80vh] overflow-y-auto p-5"}>{children}</div>
      </div>
    </div>
  );
}

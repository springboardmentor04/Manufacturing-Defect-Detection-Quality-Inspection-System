export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      {/* =====================================================
          MODAL BOX
      ===================================================== */}

      <div
        className="
          w-full
          max-w-4xl
          max-h-[90vh]
          overflow-hidden
          rounded-2xl
          border
          border-slate-700
          bg-[#111820]
          shadow-2xl
          flex
          flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* ===================================================
            HEADER
        =================================================== */}

        {title && (
          <div className="shrink-0 border-b border-slate-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          </div>
        )}


        {/* ===================================================
            SCROLLABLE CONTENT
        =================================================== */}

        <div
          className="
            flex-1
            min-h-0
            overflow-y-auto
            overflow-x-hidden
            px-6
            py-5
          "
        >
          {children}
        </div>


        {/* ===================================================
            FOOTER
        =================================================== */}

        {footer && (
          <div
            className="
              shrink-0
              border-t
              border-slate-700
              px-6
              py-4
              flex
              justify-end
              gap-3
              bg-[#111820]
            "
          >
            {footer}
          </div>
        )}

      </div>
    </div>
  );
}
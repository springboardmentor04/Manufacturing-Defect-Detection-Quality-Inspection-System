import React from "react";
import { resolveImageUrl } from "../api/axios";

const statusStyles = {
  pass: "bg-emerald-500",
  fail: "bg-rose-600",
  pending: "bg-amber-500",
  processing: "bg-brand-500",
};

export default function ImageGallery({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-sm">No images to display yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
        >
          <img
            src={resolveImageUrl(item.image_url)}
            alt={item.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-white text-[11px] font-medium truncate">{item.product_name}</p>
          </div>
          <span
            className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ${
              statusStyles[item.status] || "bg-slate-400"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
import type { LayoutSuggestionResponse } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LayoutPreviewModal({
  suggestion,
  onApply,
  onClose,
}: {
  suggestion: LayoutSuggestionResponse | null;
  onApply: () => void;
  onClose: () => void;
}) {
  if (!suggestion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              AI compose layout
            </div>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              Suggested card arrangement
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Source: {suggestion.source}. Review the rationale before applying it to the live dashboard.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-5 space-y-3">
          {suggestion.layout.map((item) => (
            <div
              key={item.widgetType}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="font-medium text-slate-900">{item.widgetType}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {item.w}x{item.h} at {item.x},{item.y}
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.rationale || "No rationale provided."}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onApply}>Apply suggestion</Button>
        </div>
      </Card>
    </div>
  );
}

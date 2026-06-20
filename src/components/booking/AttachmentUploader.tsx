import { Image, FileText, X } from 'lucide-react';
import type { BookingAttachment } from '../../mock/types';

export function AttachmentUploader({
  attachments,
  notes,
  onAdd,
  onRemove,
  onNotes,
}: {
  attachments: BookingAttachment[];
  notes: string;
  onAdd: (kind: 'image' | 'doc') => void;
  onRemove: (id: string) => void;
  onNotes: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => onAdd('image')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm">
          <Image size={16} /> Add photo
        </button>
        <button type="button" onClick={() => onAdd('doc')} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm">
          <FileText size={16} /> Add document
        </button>
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs">
              {a.name}
              <button type="button" aria-label={`Remove ${a.name}`} onClick={() => onRemove(a.id)}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
        placeholder="Notes for the pandit (parking, contact person, special requests)…"
        aria-label="Notes"
        rows={3}
        className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

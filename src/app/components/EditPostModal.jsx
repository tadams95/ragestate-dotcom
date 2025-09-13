'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { useEffect, useState } from 'react';

export default function EditPostModal({
  open,
  onClose,
  initialContent = '',
  initialIsPublic = true,
  onSave,
  saving = false,
}) {
  const [content, setContent] = useState(initialContent || '');
  const [isPublic, setIsPublic] = useState(!!initialIsPublic);

  useEffect(() => {
    if (open) {
      setContent(initialContent || '');
      setIsPublic(!!initialIsPublic);
    }
  }, [open, initialContent, initialIsPublic]);

  const canSave = (content?.trim().length || 0) <= 2000 && !saving;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] sm:items-center">
        <DialogPanel className="w-full rounded-t-2xl border border-white/10 bg-[#0d0d0f] p-4 text-white shadow-xl sm:max-w-xl sm:rounded-2xl sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold">Edit post</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <textarea
              className="min-h-[120px] w-full resize-none bg-transparent text-white placeholder-gray-500 outline-none"
              placeholder="Update your post…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              autoFocus
            />

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                <span className="text-gray-400">Visibility</span>
                <select
                  value={isPublic ? 'public' : 'private'}
                  onChange={(e) => setIsPublic(e.target.value === 'public')}
                  className="rounded-md border border-white/20 bg-transparent px-2 py-1 text-white"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <div className="space-x-2">
                <button
                  onClick={onClose}
                  className="h-10 rounded border border-white/20 px-3 text-sm text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  disabled={!canSave}
                  onClick={() => onSave?.({ content: content.trim(), isPublic })}
                  className={`h-10 rounded px-4 text-sm font-semibold ${canSave ? 'bg-[#ff1f42] text-white hover:bg-[#ff415f]' : 'cursor-not-allowed bg-gray-700 text-gray-400'}`}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

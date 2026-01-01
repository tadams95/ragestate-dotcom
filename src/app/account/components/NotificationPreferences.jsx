'use client';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../../../../firebase/firebase';

const DEFAULT_PREFS = {
  post_liked: true,
  comment_added: true,
  new_follower: true,
  mention: true,
  new_post_from_follow: false,
  marketing: false,
  quietHours: null, // { start: '22:00', end: '08:00', timezone: 'America/Los_Angeles' }
};

export default function NotificationPreferences({ userId, className = '' }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [qhDraft, setQhDraft] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  const [qhError, setQhError] = useState('');

  // Load existing prefs
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!userId) return;
      setLoading(true);
      try {
        const ref = doc(db, 'users', userId, 'settings', 'notificationPrefs');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          // Merge with defaults to avoid undefined keys
          const merged = { ...DEFAULT_PREFS, ...data };
          if (mounted) setPrefs(merged);
          if (mounted) {
            if (merged.quietHours) {
              setQhDraft({
                enabled: true,
                start: merged.quietHours.start || '22:00',
                end: merged.quietHours.end || '08:00',
                timezone:
                  merged.quietHours.timezone ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone ||
                  'UTC',
              });
            } else {
              setQhDraft((d) => ({ ...d, enabled: false }));
            }
          }
        } else if (mounted) {
          setPrefs(DEFAULT_PREFS);
        }
      } catch (e) {
        console.error('Failed to load notification prefs', e);
        if (mounted) setError('Failed to load preferences');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const toggle = useCallback((key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    setQhError('');
    try {
      const ref = doc(db, 'users', userId, 'settings', 'notificationPrefs');
      // Only persist known keys (defensive) & add updatedAt
      const toSave = Object.keys(DEFAULT_PREFS).reduce((acc, k) => {
        acc[k] = prefs[k] === undefined ? DEFAULT_PREFS[k] : prefs[k];
        return acc;
      }, {});
      // quiet hours validation & save
      if (qhDraft.enabled) {
        if (!isValidTime(qhDraft.start) || !isValidTime(qhDraft.end)) {
          setQhError('Invalid time format. Use HH:MM (24h).');
          setSaving(false);
          return;
        }
        toSave.quietHours = {
          start: qhDraft.start,
          end: qhDraft.end,
          timezone: qhDraft.timezone,
        };
      } else {
        toSave.quietHours = null;
      }
      toSave.updatedAt = serverTimestamp();
      console.log('Saving notification preferences:', { userId, toSave, ref: ref.path });
      await setDoc(ref, toSave, { merge: true });
      console.log('Notification preferences saved successfully to:', ref.path);
      // Verify write by reading back
      const verifySnap = await getDoc(ref);
      console.log('Verified saved data:', verifySnap.data());
      setSaved(true);
      setPrefs((p) => ({ ...p, quietHours: toSave.quietHours }));
    } catch (e) {
      console.error('Failed to save notification prefs', e);
      // Show more specific error for permission issues
      if (e?.code === 'permission-denied') {
        setError('Permission denied. Please refresh the page and try again.');
      } else {
        setError('Failed to save. Check console for details.');
      }
    } finally {
      setSaving(false);
    }
  }, [prefs, userId, qhDraft]);

  const quietHoursLabel = prefs.quietHours
    ? `${prefs.quietHours.start}–${prefs.quietHours.end} (${prefs.quietHours.timezone || 'local'})`
    : 'Disabled';

  return (
    <div className={className}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Notification Preferences
      </h3>
      {loading ? (
        <div className="text-xs text-[var(--text-tertiary)]">Loading preferences…</div>
      ) : (
        <div className="space-y-3">
          <PreferenceToggle
            label="Post Likes"
            desc="Notify me when someone likes my post"
            value={prefs.post_liked}
            onChange={() => toggle('post_liked')}
          />
          <PreferenceToggle
            label="Comments"
            desc="Notify me when someone comments on my post"
            value={prefs.comment_added}
            onChange={() => toggle('comment_added')}
          />
          <PreferenceToggle
            label="New Followers"
            desc="Notify me when someone follows me"
            value={prefs.new_follower}
            onChange={() => toggle('new_follower')}
          />
          <PreferenceToggle
            label="Mentions"
            desc="Notify me when someone @mentions me"
            value={prefs.mention}
            onChange={() => toggle('mention')}
          />
          <PreferenceToggle
            label="New Posts from Follows"
            desc="Notify me when people I follow post (beta)"
            value={prefs.new_post_from_follow}
            onChange={() => toggle('new_post_from_follow')}
          />
          <PreferenceToggle
            label="Marketing"
            desc="Announcements & occasional promos"
            value={prefs.marketing}
            onChange={() => toggle('marketing')}
          />
          <QuietHoursEditor
            draft={qhDraft}
            setDraft={setQhDraft}
            label={quietHoursLabel}
            error={qhError}
          />
          {error && <div className="text-xs text-red-500">{error}</div>}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Preferences'}
            </button>
            {saved && !saving && <span className="text-[11px] text-green-600">Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function PreferenceToggle({ label, desc, value, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-[var(--border-subtle)] p-3 hover:border-red-600/40">
      <input
        type="checkbox"
        checked={!!value}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] bg-[var(--bg-root)] text-red-600 focus:ring-red-600"
      />
      <span className="select-none">
        <span className="block text-xs font-medium text-[var(--text-primary)]">{label}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--text-tertiary)]">{desc}</span>
      </span>
    </label>
  );
}

function QuietHoursEditor({ draft, setDraft, label, error }) {
  const tzList = getCommonTimezones();
  return (
    <div className="mt-4 rounded border border-[var(--border-subtle)] p-3 text-xs text-[var(--text-secondary)]">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium">Quiet Hours</div>
        <label className="flex items-center gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            className="h-3 w-3 cursor-pointer rounded border-[var(--border-subtle)] bg-[var(--bg-root)] text-red-600 focus:ring-red-600"
          />
          Enable
        </label>
      </div>
      {!draft.enabled ? (
        <div className="text-[11px] text-[var(--text-tertiary)]">
          Currently disabled. No suppression window.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                Start (24h)
              </label>
              <input
                type="time"
                value={draft.start}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-root)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-red-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                End (24h)
              </label>
              <input
                type="time"
                value={draft.end}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-root)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-red-600"
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                Timezone
              </label>
              <select
                value={draft.timezone}
                onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
                className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-root)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-red-600"
              >
                {tzList.map((tz) => (
                  <option key={tz} value={tz} className="bg-[var(--bg-root)]">
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)]">
            Notifications created between start and end (local to selected timezone) are suppressed.
          </div>
        </div>
      )}
      <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">Current: {label}</div>
      {error && <div className="mt-1 text-[11px] text-red-500">{error}</div>}
    </div>
  );
}

function isValidTime(t) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function getCommonTimezones() {
  return [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
}

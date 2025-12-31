'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
// Use root-based import (baseUrl='.') to avoid fragile deep relative paths
import { useAuth, useFirebase } from '@fb/context/FirebaseContext';
import AdminProtected from '../../../components/AdminProtected';
import { AdminBreadcrumb } from '../../../components/admin/shared';
// Removed global Header/Footer for streamlined admin creation view

// Keep styling consistent with existing admin inputs/buttons
const inputClass =
  'block w-full bg-[var(--bg-elev-2)] border-2 border-[var(--border-subtle)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition';
const labelClass = 'block text-sm font-medium text-[var(--text-secondary)] mb-1';
const buttonPrimary =
  'inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow transition disabled:opacity-50 disabled:cursor-not-allowed';
const buttonSecondary =
  'inline-flex items-center justify-center rounded-md border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] transition';

export default function NewEventPage() {
  return (
    <AdminProtected>
      <NewEventInner />
    </AdminProtected>
  );
}

function NewEventInner() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const firebase = useFirebase();
  const fileInputRef = useRef(null);
  const errorSummaryRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    age: '',
    date: '', // yyyy-MM-dd
    time: '', // HH:mm
    location: '',
    quantity: '',
    active: false,
    imgURL: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [localPreview, setLocalPreview] = useState(null); // blob URL for immediate preview before upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validateLocal() {
    const e = {};
    if (form.name.trim().length < 4) e.name = 'Name too short';
    if (!form.price || isNaN(parseFloat(form.price))) e.price = 'Price required';
    if (!form.date) e.date = 'Date required';
    if (!form.time) e.time = 'Time required';
    if (form.location.trim().length < 4) e.location = 'Location too short';
    if (!form.quantity || isNaN(parseInt(form.quantity))) e.quantity = 'Quantity required';
    if (!imageFile && !form.imgURL) e.imgURL = 'Image required';
    return e;
  }

  async function handleUploadImage(fileOverride) {
    const fileToUpload = fileOverride || imageFile;
    if (!fileToUpload) return;
    setUploadingImage(true);
    try {
      // Basic client check
      if (fileToUpload.size > 5 * 1024 * 1024) {
        toast.error('Image exceeds 5MB limit');
        setUploadingImage(false);
        return;
      }
      // We don't yet know slug; use temp path with timestamp. Server enforces final slug doc creation.
      const uid = currentUser?.uid || 'unknown';
      const path = `temp-events/${uid}/${Date.now()}-${fileToUpload.name}`;
      const url = await firebase.uploadFileAndGetURL(fileToUpload, path);
      updateField('imgURL', url);
      toast.success('Image uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploadingImage(false);
      // Revoke local preview once we have a remote URL
      if (localPreview && form.imgURL) {
        try {
          URL.revokeObjectURL(localPreview);
        } catch (_) {}
        setLocalPreview(null);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const localErrors = validateLocal();
    setErrors(localErrors);
    if (Object.keys(localErrors).length) {
      toast.error('Fix form errors');
      // focus first invalid
      requestAnimationFrame(() => {
        const order = ['name', 'imgURL', 'date', 'time', 'location', 'quantity', 'price'];
        for (const key of order) {
          const id = key === 'imgURL' ? 'ev-hero' : `ev-${key}`;
          if (localErrors[key]) {
            const el = document.getElementById(id);
            if (el) {
              el.focus();
              return;
            }
          }
        }
        if (errorSummaryRef.current) errorSummaryRef.current.focus();
      });
      return;
    }
    if (!currentUser) {
      toast.error('Not signed in');
      return;
    }
    setSubmitting(true);
    setStatusMessage('Submitting event');
    let dateTimeISO = null;
    try {
      if (form.date && form.time) {
        const local = new Date(`${form.date}T${form.time}:00`);
        dateTimeISO = local.toISOString();
      }
    } catch (_) {}
    const payload = {
      name: form.name.trim(),
      description: form.description,
      price: parseFloat(form.price),
      age: form.age ? parseInt(form.age) : undefined,
      dateTime: dateTimeISO,
      location: form.location.trim(),
      quantity: parseInt(form.quantity),
      isDigital: true,
      active: !!form.active,
      imgURL: form.imgURL,
    };
    try {
      // Force refresh to avoid using an expired cached token (helps with recent claim updates too)
      const idToken = await currentUser.getIdToken(true);
      const res = await fetch('/api/admin/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        console.error('Create failed', data);
        toast.error(data.code || 'Create failed');
        return;
      }
      toast.success('Event created');
      router.push(`/events/${data.event.slug}`);
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    } finally {
      setSubmitting(false);
      setStatusMessage('');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-root)]">
      <main className="flex-grow px-4 pb-12 pt-24 sm:px-6 lg:px-10 lg:pt-28">
        <div className="mx-auto max-w-7xl">
          <AdminBreadcrumb
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Events', href: '/admin' },
              { label: 'New Event' },
            ]}
          />
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Create Event
              </h1>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                Fill the details. Preview updates live. Events are always digital.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className={buttonSecondary}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className={buttonSecondary}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="event-create-form"
                disabled={submitting}
                className={buttonPrimary}
              >
                {submitting ? 'Creating...' : form.active ? 'Create & Publish' : 'Create Draft'}
              </button>
            </div>
          </div>
          <div className="grid gap-10 lg:grid-cols-12">
            <form
              id="event-create-form"
              onSubmit={handleSubmit}
              className="space-y-10 lg:col-span-7 xl:col-span-8"
              aria-busy={submitting || uploadingImage}
            >
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 shadow-sm backdrop-blur-sm">
                <fieldset>
                  <legend className="mb-6 text-lg font-semibold text-white">
                    Basic Information
                  </legend>
                  <div className="space-y-6">
                    {/* Publish Status */}
                    <div>
                      <span className={labelClass}>Status</span>
                      <div className="mt-1 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateField('active', false)}
                          className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                            !form.active
                              ? 'border-zinc-600 bg-zinc-700 text-white'
                              : 'border-zinc-700 bg-zinc-900 text-gray-400 hover:text-gray-200'
                          }`}
                          aria-pressed={!form.active}
                        >
                          Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('active', true)}
                          className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                            form.active
                              ? 'border-red-500 bg-red-600 text-white'
                              : 'border-zinc-700 bg-zinc-900 text-gray-400 hover:text-gray-200'
                          }`}
                          aria-pressed={form.active}
                        >
                          Publish
                        </button>
                        <p className="text-xs text-gray-400">
                          {form.active
                            ? 'Event will be publicly visible immediately.'
                            : 'Draft is hidden from public listings until you publish.'}
                        </p>
                      </div>
                    </div>
                    {Object.keys(errors).length > 0 && (
                      <div
                        ref={errorSummaryRef}
                        tabIndex={-1}
                        className="rounded-md border border-red-600 bg-red-950/40 p-3 text-xs text-red-300"
                        role="alert"
                        aria-live="assertive"
                      >
                        Please fix the highlighted fields below.
                      </div>
                    )}
                    <div>
                      <label htmlFor="ev-name" className={labelClass}>
                        Name *
                      </label>
                      <input
                        id="ev-name"
                        className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        maxLength={80}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'err-name' : undefined}
                      />
                      {errors.name && (
                        <p id="err-name" className="mt-1 text-xs text-red-500">
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="ev-description" className={labelClass}>
                        Description
                      </label>
                      <textarea
                        id="ev-description"
                        className={`${inputClass} min-h-[140px] resize-y`}
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        maxLength={5000}
                        aria-describedby="desc-help"
                      />
                      <div
                        className="mt-1 flex justify-between text-xs text-gray-500"
                        id="desc-help"
                      >
                        <span>{form.description.length} / 5000</span>
                        <span className="text-gray-500">Optional</span>
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 shadow-sm backdrop-blur-sm">
                <fieldset>
                  <legend className="mb-6 text-lg font-semibold text-white">Hero Image *</legend>
                  <div className="space-y-4">
                    <input
                      id="ev-hero"
                      type="file"
                      ref={fileInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImageFile(file);
                        if (localPreview) {
                          try {
                            URL.revokeObjectURL(localPreview);
                          } catch (_) {}
                          setLocalPreview(null);
                        }
                        if (file) {
                          const blobUrl = URL.createObjectURL(file);
                          setLocalPreview(blobUrl);
                          handleUploadImage(file);
                        }
                      }}
                      className={inputClass}
                      aria-describedby={errors.imgURL ? 'err-img' : 'img-help'}
                    />
                    {(localPreview || form.imgURL) && (
                      <div className="relative h-56 w-full overflow-hidden rounded-md border border-zinc-700">
                        {localPreview ? (
                          <Image
                            src={localPreview}
                            alt="Local image preview"
                            fill
                            unoptimized
                            loader={({ src }) => src}
                            sizes="(max-width: 768px) 100vw, 800px"
                            className="object-cover"
                          />
                        ) : (
                          <Image
                            src={form.imgURL}
                            alt="Event hero preview"
                            fill
                            sizes="(max-width: 768px) 100vw, 800px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleUploadImage()}
                        disabled={!imageFile || uploadingImage}
                        className={buttonSecondary}
                      >
                        {uploadingImage
                          ? 'Uploading...'
                          : form.imgURL
                            ? 'Re-upload'
                            : 'Upload Manually'}
                      </button>
                      <p id="img-help" className="text-xs text-gray-500">
                        PNG/JPG/WEBP ≤ 5MB. Landscape preferred.
                      </p>
                      {errors.imgURL && (
                        <span id="err-img" className="text-xs text-red-500">
                          {errors.imgURL}
                        </span>
                      )}
                    </div>
                  </div>
                </fieldset>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 shadow-sm backdrop-blur-sm">
                <fieldset>
                  <legend className="mb-6 text-lg font-semibold text-white">
                    Schedule & Tickets
                  </legend>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className={labelClass}>Date *</label>
                      <input
                        id="ev-date"
                        type="date"
                        className={`${inputClass} ${errors.date ? 'border-red-500' : ''}`}
                        value={form.date}
                        onChange={(e) => updateField('date', e.target.value)}
                        aria-invalid={!!errors.date}
                        aria-describedby={errors.date ? 'err-date' : undefined}
                      />
                      {errors.date && (
                        <p id="err-date" className="text-xs text-red-500">
                          {errors.date}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Time *</label>
                      <input
                        id="ev-time"
                        type="time"
                        className={`${inputClass} ${errors.time ? 'border-red-500' : ''}`}
                        value={form.time}
                        onChange={(e) => updateField('time', e.target.value)}
                        aria-invalid={!!errors.time}
                        aria-describedby={errors.time ? 'err-time' : undefined}
                      />
                      {errors.time && (
                        <p id="err-time" className="text-xs text-red-500">
                          {errors.time}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Location *</label>
                      <input
                        id="ev-location"
                        className={`${inputClass} ${errors.location ? 'border-red-500' : ''}`}
                        value={form.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        maxLength={140}
                        aria-invalid={!!errors.location}
                        aria-describedby={errors.location ? 'err-location' : undefined}
                      />
                      {errors.location && (
                        <p id="err-location" className="text-xs text-red-500">
                          {errors.location}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Quantity *</label>
                      <input
                        id="ev-quantity"
                        className={`${inputClass} ${errors.quantity ? 'border-red-500' : ''}`}
                        value={form.quantity}
                        onChange={(e) => updateField('quantity', e.target.value)}
                        type="number"
                        min="0"
                        aria-invalid={!!errors.quantity}
                        aria-describedby={errors.quantity ? 'err-quantity' : undefined}
                      />
                      {errors.quantity && (
                        <p id="err-quantity" className="text-xs text-red-500">
                          {errors.quantity}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Price (USD) *</label>
                      <input
                        id="ev-price"
                        className={`${inputClass} ${errors.price ? 'border-red-500' : ''}`}
                        value={form.price}
                        onChange={(e) => updateField('price', e.target.value)}
                        type="number"
                        step="0.01"
                        min="0"
                        aria-invalid={!!errors.price}
                        aria-describedby={errors.price ? 'err-price' : undefined}
                      />
                      {errors.price && (
                        <p id="err-price" className="text-xs text-red-500">
                          {errors.price}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="ev-age" className={labelClass}>
                        Minimum Age
                      </label>
                      <input
                        id="ev-age"
                        className={inputClass}
                        value={form.age}
                        onChange={(e) => updateField('age', e.target.value)}
                        type="number"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        id="active"
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => updateField('active', e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-600 text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor="active" className="text-sm text-gray-300">
                        Publish Immediately
                      </label>
                    </div>
                  </div>
                </fieldset>
              </div>
              <div aria-live="polite" className="sr-only">
                {statusMessage}
              </div>
            </form>
            {showPreview && (
              <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
                <div className="sticky top-6 space-y-6">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-white">Preview</h2>
                    <div className="space-y-4">
                      <div
                        className="relative flex w-full items-center justify-center overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 text-xs text-gray-500"
                        style={{ aspectRatio: '16 / 9' }}
                      >
                        {localPreview ? (
                          <Image
                            src={localPreview}
                            alt="Local preview"
                            fill
                            unoptimized
                            sizes="(max-width: 768px) 100vw, 400px"
                            className="object-cover"
                          />
                        ) : form.imgURL ? (
                          <Image
                            src={form.imgURL}
                            alt={form.name || 'Preview image'}
                            fill
                            sizes="(max-width: 768px) 100vw, 400px"
                            className="object-cover"
                          />
                        ) : (
                          <span>No image yet</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold leading-tight text-white">
                          {form.name || 'Event Name'}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {(() => {
                            if (form.date && form.time) {
                              try {
                                const d = new Date(`${form.date}T${form.time}:00`);
                                return d.toLocaleString(undefined, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                });
                              } catch (_) {}
                            }
                            return 'Date & time TBD';
                          })()}
                        </p>
                        <p className="text-sm text-gray-400">
                          Digital • {form.location || 'Location TBD'}
                        </p>
                        {form.price && !isNaN(parseFloat(form.price)) && (
                          <p className="text-sm font-medium text-red-400">
                            ${parseFloat(form.price).toFixed(2)} USD
                          </p>
                        )}
                      </div>
                      <div className="h-px w-full bg-gradient-to-r from-zinc-800/60 via-zinc-700/40 to-zinc-800/60" />
                      <p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                        {form.description || 'Description preview will appear here as you type.'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${form.active ? 'bg-green-600/20 text-green-400 ring-1 ring-inset ring-green-500/30' : 'bg-zinc-700/30 text-zinc-300 ring-1 ring-inset ring-zinc-600/50'}`}
                        >
                          {form.active ? 'Published' : 'Draft'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-indigo-600/20 px-2.5 py-1 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                          Digital
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-xs leading-relaxed text-gray-500">
                    This is a live preview. Final formatting will match the public event page style.
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

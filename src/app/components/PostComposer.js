'use client';

import { track } from '@/app/utils/metrics';
import { Dialog, DialogPanel } from '@headlessui/react';
import { EyeSlashIcon } from '@heroicons/react/24/outline';
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../../firebase/context/FirebaseContext';
import { db, storage } from '../../../firebase/firebase';
import { selectUserName } from '../../../lib/features/userSlice';
import { useMentionDetection } from '../../../lib/hooks/useMentionDetection';
import HighlightedTextarea from './HighlightedTextarea';
import MentionAutocomplete from './MentionAutocomplete';

const DRAFT_KEY = 'postComposer.draft';

// Video compression constants
const MAX_CHARS = 2000;
const MAX_VIDEO_DURATION = 60; // seconds
const MAX_VIDEO_WIDTH = 1080; // max input resolution allowed
const TARGET_WIDTH = 720; // compressed output width
const TARGET_BITRATE = 2_000_000; // 2 Mbps

/**
 * Check if browser supports video compression via MediaRecorder + Canvas
 */
function supportsVideoCompression() {
  if (typeof window === 'undefined') return false;
  if (!window.MediaRecorder) return false;
  // Check for H.264 or VP8 codec support
  return (
    MediaRecorder.isTypeSupported('video/webm;codecs=h264') ||
    MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ||
    MediaRecorder.isTypeSupported('video/mp4;codecs=h264')
  );
}

/**
 * Get video metadata (duration, width, height)
 */
function getVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Compress video using Canvas + MediaRecorder
 * Returns compressed Blob or null if compression fails
 */
function compressVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const { videoWidth, videoHeight, duration } = video;

      // Calculate target dimensions (maintain aspect ratio)
      const scale = Math.min(1, TARGET_WIDTH / Math.max(videoWidth, videoHeight));
      const targetW = Math.round(videoWidth * scale);
      const targetH = Math.round(videoHeight * scale);

      // Create canvas for frame rendering
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // Get canvas stream
      const stream = canvas.captureStream(30); // 30 fps

      // Try to capture audio from original video
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination); // Keep audio playing
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch {
        // Audio capture may fail, continue without audio
      }

      // Select best available codec
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=h264')
        ? 'video/webm;codecs=h264'
        : MediaRecorder.isTypeSupported('video/mp4;codecs=h264')
          ? 'video/mp4;codecs=h264'
          : 'video/webm;codecs=vp8';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: TARGET_BITRATE,
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        URL.revokeObjectURL(video.src);
        resolve(blob);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(video.src);
        reject(e.error || new Error('MediaRecorder error'));
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms

      // Play video and render frames to canvas
      video.play();

      const renderFrame = () => {
        if (video.paused || video.ended) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, targetW, targetH);
        onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));
        requestAnimationFrame(renderFrame);
      };

      video.onplay = renderFrame;
      video.onended = () => {
        onProgress?.(100);
        recorder.stop();
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for compression'));
    };

    video.src = URL.createObjectURL(file);
  });
}

export default function PostComposer() {
  const { currentUser } = useAuth();
  const localUserName = useSelector(selectUserName);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video' | null
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [savedDraft, setSavedDraft] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [compressionProgress, setCompressionProgress] = useState(0); // 0-100
  const [isCompressing, setIsCompressing] = useState(false);
  const [quotedPost, setQuotedPost] = useState(null);
  const [contentWarning, setContentWarning] = useState('');
  const [showContentWarningInput, setShowContentWarningInput] = useState(false);
  const saveTimerRef = useRef(null);

  // Mention autocomplete state
  const [confirmedMentions, setConfirmedMentions] = useState(new Set());
  const textareaRef = useRef(null);
  const {
    mentionState,
    handleTextChange: handleMentionChange,
    insertMention,
    closeMention,
    navigateUp,
    navigateDown,
    setSelectedIndex,
  } = useMentionDetection();

  // Listen for quote repost events
  useEffect(() => {
    const onQuotePost = (e) => {
      const post = e.detail;
      if (post) {
        setQuotedPost(post);
        setOpen(true);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('feed:quote-post', onQuotePost);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('feed:quote-post', onQuotePost);
      }
    };
  }, []);

  // Load saved draft (don't auto-apply; offer recovery)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setSavedDraft(saved);
    } catch {}
  }, []);

  // Debounced autosave ~3s when dirty
  useEffect(() => {
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const dirty = content.trim().length > 0;
      if (!dirty) {
        // If cleared, also clear storage
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, content);
          setSavedDraft(content);
        } catch {}
      }, 3000);
    } catch {}
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content]);

  // Generate preview when file selected
  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => {
    const hasText = content.trim().length >= 2;
    const hasMedia = !!file;
    const withinLimit = content.length <= MAX_CHARS;
    return (hasText || hasMedia) && withinLimit && !submitting && !isCompressing;
  }, [content, file, submitting, isCompressing]);

  // Process video: validate metadata and optionally compress
  const processVideo = useCallback(async (videoFile) => {
    try {
      // Get video metadata
      const meta = await getVideoMetadata(videoFile);

      // Validate duration
      if (meta.duration > MAX_VIDEO_DURATION) {
        setError(`Video too long. Max ${MAX_VIDEO_DURATION} seconds.`);
        return null;
      }

      // Validate resolution (allow up to 1080p input)
      if (meta.width > MAX_VIDEO_WIDTH * 2 || meta.height > MAX_VIDEO_WIDTH * 2) {
        setError(`Video resolution too high. Max 2160p input.`);
        return null;
      }

      // Check if compression is needed and supported
      const needsCompression = meta.width > TARGET_WIDTH || meta.height > TARGET_WIDTH;
      const canCompress = supportsVideoCompression();

      if (needsCompression && canCompress) {
        setIsCompressing(true);
        setCompressionProgress(0);

        try {
          const compressed = await compressVideo(videoFile, setCompressionProgress);

          // Only use compressed if it's actually smaller
          if (compressed && compressed.size < videoFile.size) {
            // Create a new File object with proper name
            const compressedFile = new File(
              [compressed],
              videoFile.name.replace(/\.[^.]+$/, '_compressed.webm'),
              { type: compressed.type },
            );
            return compressedFile;
          }
        } catch (err) {
          console.warn('Compression failed, using original:', err);
          // Fall through to return original
        } finally {
          setIsCompressing(false);
          setCompressionProgress(0);
        }
      }

      // Return original file (either no compression needed, not supported, or compression failed)
      return videoFile;
    } catch (err) {
      console.error('Video processing failed:', err);
      setError('Failed to process video. Please try a different file.');
      return null;
    }
  }, []);

  const onPickFile = useCallback(
    async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;

      const isImage = f.type.startsWith('image/');
      const isVideo = f.type.startsWith('video/');

      if (!isImage && !isVideo) {
        setError('Only image or video files are allowed.');
        return;
      }

      // Video size limit: 100MB, Image: 10MB
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (f.size > maxSize) {
        setError(`File too large. Max ${isVideo ? '100MB' : '10MB'}.`);
        return;
      }

      setError('');

      if (isVideo) {
        // Process video (validate + optionally compress)
        const processed = await processVideo(f);
        if (processed) {
          setFile(processed);
          setMediaType('video');
        }
      } else {
        setFile(f);
        setMediaType('image');
      }
    },
    [processVideo],
  );

  const onRemoveFile = () => {
    setFile(null);
    setPreviewUrl('');
    setMediaType(null);
    setIsCompressing(false);
    setCompressionProgress(0);
  };

  // Mention autocomplete handlers
  const handleContentChange = useCallback(
    (e) => {
      const text = e.target.value;
      const cursorPos = e.target.selectionStart;
      setContent(text);
      handleMentionChange(text, cursorPos);
    },
    [handleMentionChange],
  );

  const handleMentionSelect = useCallback(
    (user) => {
      const { text: newContent, cursorPos } = insertMention(content, user.username);
      setContent(newContent);
      setConfirmedMentions((prev) => new Set(prev).add(user.username.toLowerCase()));
      closeMention();
      // Restore focus and set cursor position
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Set cursor position after React re-renders
        setTimeout(() => {
          textareaRef.current?.setSelectionRange(cursorPos, cursorPos);
        }, 0);
      }
    },
    [content, insertMention, closeMention],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!mentionState.isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateDown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateUp();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMention();
      }
    },
    [mentionState.isOpen, navigateDown, navigateUp, closeMention],
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please sign in to post.');
      return;
    }
    if (!currentUser.emailVerified) {
      try {
        window.location.assign(
          `/verify-email?email=${encodeURIComponent(currentUser.email || '')}`,
        );
      } catch {}
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      // Basic client-side moderation (mirror of server hate/incitement filter). Allows profanity.
      const lower = content.toLowerCase();
      const bannedTerms = ['kill yourself', 'kys', 'gas the', 'nazi'];
      const bannedPatterns = [
        /(kill|hurt|attack)\s+(all|every|those)\s+(people|immigrants|women|men|gays|jews|muslims)/i,
        /(wipe|erase|eliminate)\s+them\b/i,
        /\b(kill)\b.{0,20}\b(yourself|urself|ur self)\b/i,
      ];
      let flagged = [];
      for (const term of bannedTerms) {
        if (lower.includes(term)) flagged.push(term);
      }
      for (const pat of bannedPatterns) {
        if (pat.test(content)) flagged.push(pat.toString());
      }
      if (flagged.length) {
        setSubmitting(false);
        setError('Post blocked: contains disallowed hate / incitement language.');
        return;
      }
      // Create a new post ref to derive postId for storage path
      const postsCol = collection(db, 'posts');
      const postRef = doc(postsCol);

      let mediaUrls = [];
      if (file) {
        const storageRef = ref(
          storage,
          `posts/${postRef.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
        );
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);
        mediaUrls = [url];
      }

      // Resolve display name and profile image
      let resolvedName = (localUserName || currentUser.displayName || '').trim();
      if (!resolvedName) {
        try {
          const fn = localStorage.getItem('firstName') || '';
          const ln = localStorage.getItem('lastName') || '';
          resolvedName = `${fn} ${ln}`.trim();
        } catch {}
      }
      if (!resolvedName) {
        resolvedName = currentUser.email?.split('@')[0] || 'User';
      }

      let resolvedPhoto = currentUser.photoURL || null;
      if (!resolvedPhoto) {
        try {
          const lsPhoto = localStorage.getItem('profilePicture');
          if (lsPhoto) resolvedPhoto = lsPhoto;
        } catch {}
      }

      // Resolve usernameLower for linking to profile
      let usernameLower = null;
      try {
        const prof = await getDoc(doc(db, 'profiles', currentUser.uid));
        usernameLower = prof.exists() ? prof.data()?.usernameLower || null : null;
      } catch {}

      const payload = {
        userId: currentUser.uid,
        userDisplayName: resolvedName,
        userProfilePicture: resolvedPhoto || null,
        usernameLower: usernameLower || null,
        content: content.trim(),
        isPublic,
        timestamp: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        contentWarning: contentWarning.trim() || null,
      };
      if (mediaUrls.length) payload.mediaUrls = mediaUrls;

      if (quotedPost) {
        payload.repostOf = {
          postId: quotedPost.id,
          authorId: quotedPost.userId,
          authorName: quotedPost.author || quotedPost.usernameLower,
          authorPhoto: quotedPost.avatarUrl,
          content: quotedPost.content || '',
          mediaUrls: quotedPost.mediaUrls || [],
          timestamp: quotedPost.timestamp || null,
        };
      }

      await setDoc(postRef, payload);

      if (quotedPost) {
        // Create postReposts doc for tracking
        const repostRef = doc(db, 'postReposts', `${quotedPost.id}_${currentUser.uid}`);
        await setDoc(repostRef, {
          postId: quotedPost.id,
          userId: currentUser.uid,
          timestamp: serverTimestamp(),
          originalAuthorId: quotedPost.userId || null,
          repostPostId: postRef.id,
        });
        try {
          track('repost_add', { postId: quotedPost.id, type: 'quote' });
        } catch {}
      }

      // Metrics: post_create
      try {
        track('post_create', {
          hasImage: mediaType === 'image',
          hasVideo: mediaType === 'video',
          contentLength: payload.content?.length || 0,
          isQuote: !!quotedPost,
        });
      } catch {}

      // Broadcast to feed so it can prepend without a hard refresh
      try {
        const newPost = {
          id: postRef.id,
          author: payload.usernameLower
            ? payload.usernameLower
            : payload.userDisplayName || payload.userId || 'User',
          avatarUrl: payload.userProfilePicture || null,
          timestamp: 'Just now',
          content: payload.content,
          usernameLower: payload.usernameLower || undefined,
          mediaUrls: mediaUrls.length ? mediaUrls : [],
          likeCount: 0,
          commentCount: 0,
          repostCount: 0,
          repostOf: payload.repostOf || null,
        };
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('feed:new-post', { detail: newPost }));
        }
      } catch {}

      // Reset form and draft
      setContent('');
      setFile(null);
      setPreviewUrl('');
      setQuotedPost(null);
      setMediaType(null);
      setIsPublic(true);
      setContentWarning('');
      setShowContentWarningInput(false);
      setSavedDraft(''); // Clear draft state so "We found a saved draft" doesn't show
      setOpen(false); // Close the modal
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) return null; // Keep minimal per spec

  return (
    <div className="mx-auto mb-4 w-full max-w-2xl">
      {/* Collapsed trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 text-left text-[var(--text-secondary)] shadow-[var(--shadow-card)] transition-colors duration-200 hover:text-[var(--text-primary)] active:opacity-80"
      >
        {savedDraft && !content ? 'Continue your draft…' : 'Share something…'}
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <div className="fixed inset-0 bg-black/60 transition-opacity duration-200" aria-hidden="true" />
        <div className="fixed inset-0 flex items-end overflow-y-auto px-4 [scrollbar-gutter:stable] supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] sm:items-center sm:px-6 lg:px-8">
          <DialogPanel className="mx-auto w-full max-w-2xl rounded-t-[20px] border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-4 text-[var(--text-primary)] shadow-[var(--shadow-modal)] transition-all duration-300 ease-out animate-modal-enter sm:rounded-[20px] sm:p-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">Create post</h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {/* Recovery prompt */}
            {savedDraft && !content && (
              <div className="mb-3 flex items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3 text-sm text-[var(--text-secondary)]">
                <span>We found a saved draft.</span>
                <div className="space-x-2">
                  <button
                    className="font-semibold text-[#ff1f42] hover:text-[#ff415f]"
                    onClick={() => {
                      setContent(savedDraft);
                    }}
                  >
                    Recover
                  </button>
                  <button
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    onClick={() => {
                      try {
                        localStorage.removeItem(DRAFT_KEY);
                      } catch {}
                      setSavedDraft('');
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit}>
              <div className="relative">
                <HighlightedTextarea
                  ref={textareaRef}
                  className="min-h-[120px] w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors duration-200 focus:border-[var(--border-strong)]"
                  placeholder="What's happening?"
                  value={content}
                  confirmedMentions={confirmedMentions}
                  mentionOpen={mentionState.isOpen}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  onSelect={(e) => handleMentionChange(content, e.target.selectionStart)}
                  maxLength={2000}
                  autoFocus
                />

                {mentionState.isOpen && (
                  <MentionAutocomplete
                    query={mentionState.query}
                    isOpen={mentionState.isOpen}
                    onSelect={handleMentionSelect}
                    onClose={closeMention}
                    selectedIndex={mentionState.selectedIndex}
                    onSelectedIndexChange={setSelectedIndex}
                  />
                )}
              </div>
              {/* Compression progress indicator */}
              {isCompressing && (
                <div className="mt-3 animate-slide-in-up rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Optimizing video…</span>
                    <span className="font-medium tabular-nums text-[var(--text-primary)] transition-all duration-150">
                      {compressionProgress}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elev-1)]">
                    <div
                      className="h-full rounded-full bg-[#ff1f42] transition-[width] duration-300 ease-out"
                      style={{ width: `${compressionProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    Compressing to 720p for faster uploads and playback
                  </p>
                </div>
              )}
              {previewUrl && !isCompressing && (
                <div className="relative mt-3 animate-slide-in-up">
                  {mediaType === 'video' ? (
                    <video
                      src={previewUrl}
                      className="max-h-[60vh] w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] object-contain"
                      controls
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Selected preview"
                      className="max-h-[60vh] w-full rounded-md border border-[var(--border-subtle)] object-contain"
                      loading="eager"
                    />
                  )}
                  <button
                    type="button"
                    onClick={onRemoveFile}
                    className="absolute right-2 top-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-2 py-1 text-xs text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-elev-2)]"
                  >
                    Remove
                  </button>
                </div>
              )}

              {quotedPost && (
                <div className="relative mt-3 animate-slide-in-up rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    {quotedPost.avatarUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={quotedPost.avatarUrl}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {quotedPost.author}
                    </span>
                  </div>
                  {quotedPost.content && (
                    <p className="mb-2 line-clamp-3 text-sm text-[var(--text-secondary)]">
                      {quotedPost.content}
                    </p>
                  )}
                  {quotedPost.mediaUrls?.length > 0 && (
                    <div className="h-24 w-full overflow-hidden rounded-lg bg-[var(--bg-elev-1)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={quotedPost.mediaUrls[0]}
                        alt=""
                        className="h-full w-full object-cover opacity-60"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setQuotedPost(null)}
                    className="absolute right-2 top-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-2 py-1 text-xs text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-elev-2)]"
                  >
                    Remove Quote
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}
              {/* Content Warning Input */}
              {showContentWarningInput && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-2">
                  <EyeSlashIcon className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    value={contentWarning}
                    onChange={(e) => setContentWarning(e.target.value)}
                    placeholder="Add a content warning (e.g., Spoilers, Sensitive content)"
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setContentWarning('');
                      setShowContentWarningInput(false);
                    }}
                    className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label
                    className="inline-flex h-11 cursor-pointer items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    title="Add photo or video"
                  >
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={onPickFile}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] p-2.5 hover:bg-[var(--bg-elev-2)] active:opacity-80">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </span>
                  </label>
                  {/* Content Warning Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowContentWarningInput(!showContentWarningInput)}
                    className={`inline-flex h-11 items-center justify-center rounded-lg border p-2.5 transition-colors ${
                      showContentWarningInput || contentWarning
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]'
                    }`}
                    title="Add content warning"
                  >
                    <EyeSlashIcon className="h-5 w-5" />
                  </button>
                  {/* Privacy Toggle - Segmented Button */}
                  <div className="flex h-11 items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-1">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                        isPublic
                          ? 'bg-[var(--bg-elev-1)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                      aria-pressed={isPublic}
                    >
                      <span className="hidden text-base sm:inline">🌐</span>
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                        !isPublic
                          ? 'bg-[var(--bg-elev-1)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                      aria-pressed={!isPublic}
                    >
                      <span className="hidden text-base sm:inline">🔒</span>
                      <span>Private</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm tabular-nums ${
                      content.length > MAX_CHARS
                        ? 'text-[var(--danger)]'
                        : content.length > MAX_CHARS * 0.9
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    {content.length}/{MAX_CHARS}
                  </span>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`h-11 rounded-lg px-4 py-2.5 font-semibold active:opacity-80 ${
                      canSubmit
                        ? 'bg-[#ff1f42] text-white hover:bg-[#ff415f]'
                        : 'cursor-not-allowed bg-[var(--bg-elev-2)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}

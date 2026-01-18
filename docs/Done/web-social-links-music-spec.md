# Web App: Social Links & Multi-Platform Music 🎵🔗

> **Goal**: Port social links and multi-platform music support from React Native app to Next.js web app  
> **Priority**: Enhancement  
> **Status**: ✅ COMPLETE (pending manual platform testing)  
> **Created**: January 7, 2026

---

## Overview

The React Native mobile app has already implemented:

- Social links (Twitter, Instagram, TikTok, SoundCloud, Spotify, YouTube)
- Multi-platform music player (SoundCloud, Spotify, YouTube, Apple Music)

This spec covers porting these features to the Next.js web application.

---

## Current Web App State

### Profile Display

- [ProfileView.js](../src/app/profile/ProfileView.js) - Main profile view component
- [profile/[userId]/page.js](../src/app/profile/[userId]/page.js) - Dynamic profile route (duplicate logic)
- Profile state only tracks `profileSongUrl` (SoundCloud only)
- No social links displayed

### Profile Editing

- [EditProfileForm.js](../src/app/account/components/EditProfileForm.js) - Display name, username, bio
- [ProfileSongForm.js](../src/app/account/components/ProfileSongForm.js) - SoundCloud URLs only
- No social links editing

### Existing Assets

- [contact/SocialLinks.js](../src/app/contact/SocialLinks.js) - Has SVG icons for Instagram, X, TikTok, YouTube (can reuse)

---

## Data Model

### Firestore `/profiles/{userId}`

```javascript
{
  // Existing fields
  displayName: "...",
  usernameLower: "...",
  bio: "...",
  photoURL: "...",
  profileSongUrl: "https://soundcloud.com/...",  // Keep for backward compat
  isVerified: false,

  // NEW: Multi-platform music
  profileMusic: {
    platform: "spotify" | "youtube" | "soundcloud" | "apple_music",
    url: "https://open.spotify.com/track/...",
    title: "Track Name",       // cached from oEmbed
    artist: "Artist Name",     // cached from oEmbed
    artworkUrl: "https://...", // cached from oEmbed
    cachedAt: "2026-01-07T..."
  },

  // NEW: Social links
  socialLinks: {
    twitter: "https://x.com/username",
    instagram: "https://instagram.com/username",
    tiktok: "https://tiktok.com/@username",
    soundcloud: "https://soundcloud.com/artist",
    spotify: "https://open.spotify.com/artist/...",
    youtube: "https://youtube.com/@channel"
  }
}
```

---

## Files to Create

| Order | File                                       | Purpose                                                    |
| ----- | ------------------------------------------ | ---------------------------------------------------------- |
| 1     | `src/utils/musicPlatforms.js`              | Platform detection, oEmbed fetching, embed URL generation  |
| 2     | `src/utils/socialLinks.js`                 | URL validation utilities for social platforms              |
| 3     | `src/app/components/SocialLinksRow.js`     | Display row of clickable social icons on profile           |
| 4     | `src/app/components/ProfileMusicPlayer.js` | Universal music player supporting multiple platform embeds |

---

## Files to Modify

| Order | File                                            | Line(s)                  | Changes                                                       |
| ----- | ----------------------------------------------- | ------------------------ | ------------------------------------------------------------- |
| 1     | `src/app/profile/ProfileView.js`                | L29-36, L85-95, L230-275 | Add `socialLinks`/`profileMusic` to state; display components |
| 2     | `src/app/profile/[userId]/page.js`              | L29-36, L87-97, L250-300 | Same changes (duplicate profile page)                         |
| 3     | `src/app/account/components/EditProfileForm.js` | After bio section        | Add collapsible social links inputs                           |
| 4     | `src/app/account/components/ProfileSongForm.js` | Full rewrite             | Multi-platform support with auto-detection                    |

---

## Implementation Phases

### Phase 1: Utilities (No UI changes)

- [x] **1.1** Create `src/utils/musicPlatforms.js` ✅
  - `detectMusicPlatform(url)` - Returns platform from URL
  - `fetchMusicMetadata(url)` - oEmbed fetcher for all platforms
  - `getEmbedUrl(platform, url)` - Generate iframe embed URL
  - Platform configs (name, icon, color, oEmbed endpoint, URL patterns)
  - Bonus: `extractYouTubeId()`, `extractSpotifyId()`, `getEmbedDimensions()`

- [x] **1.2** Create `src/utils/socialLinks.js` ✅
  - `isValidSocialUrl(platform, url)` - Validate URLs per platform
  - `normalizeSocialUrl(platform, url)` - Clean/standardize URLs
  - Platform URL patterns (Twitter, Instagram, TikTok, SoundCloud, Spotify, YouTube)
  - Bonus: `validateSocialLinks()`, `extractSocialUsername()`, `hasSocialLinks()`, `getActiveSocialLinks()`

### Phase 2: Display Components

- [x] **2.1** Create `src/app/components/SocialLinksRow.js` ✅
  - Horizontal row of social platform icons
  - Only show icons for platforms with URLs
  - Open links in new tab
  - Reuse SVG icons from `contact/SocialLinks.js`
  - Add SoundCloud and Spotify icons

- [x] **2.2** Create `src/app/components/ProfileMusicPlayer.js` ✅
  - Detect platform from URL
  - Render appropriate embed (SoundCloud, Spotify, YouTube)
  - Fallback to "Open in {Platform}" button for unsupported embeds
  - Loading states and error handling

### Phase 3: Profile Display Integration

- [x] **3.1** Update `ProfileView.js` profile state (L29-36) ✅

  ```javascript
  const [profile, setProfile] = useState({
    displayName: '',
    photoURL: '',
    bio: '',
    usernameLower: '',
    profileSongUrl: '', // legacy
    profileMusic: null, // NEW
    socialLinks: null, // NEW
    isVerified: false,
  });
  ```

- [x] **3.2** Update `ProfileView.js` data loading (L85-95) ✅
  - Fetch `socialLinks` and `profileMusic` from profile doc
  - Fall back to `profileSongUrl` if `profileMusic` doesn't exist

- [x] **3.3** Update `ProfileView.js` display (L230-240) ✅
  - Insert `<SocialLinksRow>` after bio, before music player
  - Replace SoundCloud iframe with `<ProfileMusicPlayer>`

- [x] **3.4** Apply same changes to `profile/[userId]/page.js` ✅
  - This is a duplicate profile page that needs identical updates

### Phase 4: Edit Profile - Social Links

- [x] **4.1** Update `EditProfileForm.js` ✅
  - Add collapsible "Social Links" section after bio
  - 6 input fields with platform icons
  - Real-time URL validation
  - Save to `profiles/{userId}.socialLinks`

### Phase 5: Edit Profile - Multi-Platform Music

- [x] **5.1** Rewrite `ProfileSongForm.js` ✅
  - Accept any music URL (not just SoundCloud)
  - Auto-detect platform from URL
  - Fetch and cache metadata via oEmbed
  - Save both `profileSongUrl` (legacy) and `profileMusic` (new)
  - Live preview with appropriate embed

### Phase 6: Polish & Testing

- [x] **6.1** Add loading skeletons for social links and music player ✅
  - `SocialLinksRowSkeleton` in `SocialLinksRow.js`
  - `ProfileMusicPlayerSkeleton` in `ProfileMusicPlayer.js`
- [x] **6.2** Handle edge cases (invalid URLs, deleted tracks, region-locked content) ✅
  - `FallbackButton` with "Open in {Platform}" for failed embeds
  - 5-second loading timeout with automatic fallback
  - Platform-themed error states
- [ ] **6.3** Test all platforms: SoundCloud, Spotify, YouTube
- [ ] **6.4** Test responsive design (mobile vs desktop)
- [x] **6.5** Accessibility audit (screen readers, keyboard nav) ✅
  - `SocialLinksRow`: `role="list"`, `role="listitem"`, `aria-label` on links, keyboard focus rings
  - `ProfileMusicPlayer`: `role="region"`, `aria-label`, `aria-busy`, keyboard focus on fallback button

---

## Technical Details

### Music Platform Detection

```javascript
// src/utils/musicPlatforms.js

export const PLATFORMS = {
  soundcloud: {
    name: 'SoundCloud',
    color: '#FF5500',
    patterns: [/soundcloud\.com/, /snd\.sc/],
    oEmbed: 'https://soundcloud.com/oembed',
    embedUrl: (url) =>
      `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff1f42&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    patterns: [/open\.spotify\.com/, /spotify\.link/],
    oEmbed: 'https://open.spotify.com/oembed',
    embedUrl: (url) => {
      // Convert track URL to embed URL
      // https://open.spotify.com/track/XXX → https://open.spotify.com/embed/track/XXX
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    },
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    patterns: [/youtube\.com/, /youtu\.be/, /music\.youtube\.com/],
    oEmbed: 'https://www.youtube.com/oembed',
    embedUrl: (url) => {
      // Extract video ID and create embed URL
      const videoId = extractYouTubeId(url);
      return `https://www.youtube-nocookie.com/embed/${videoId}`;
    },
  },
  apple_music: {
    name: 'Apple Music',
    color: '#FC3C44',
    patterns: [/music\.apple\.com/],
    oEmbed: null, // Requires API
    embedUrl: (url) => url.replace('music.apple.com', 'embed.music.apple.com'),
  },
};

export function detectMusicPlatform(url) {
  if (!url) return null;
  for (const [key, config] of Object.entries(PLATFORMS)) {
    if (config.patterns.some((pattern) => pattern.test(url))) {
      return key;
    }
  }
  return null;
}
```

### Social Links Validation

```javascript
// src/utils/socialLinks.js

export const SOCIAL_PLATFORMS = {
  twitter: {
    name: 'X (Twitter)',
    patterns: [/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i],
    placeholder: 'https://x.com/username',
  },
  instagram: {
    name: 'Instagram',
    patterns: [/^https?:\/\/(www\.)?instagram\.com\/.+/i],
    placeholder: 'https://instagram.com/username',
  },
  tiktok: {
    name: 'TikTok',
    patterns: [/^https?:\/\/(www\.)?tiktok\.com\/@?.+/i],
    placeholder: 'https://tiktok.com/@username',
  },
  soundcloud: {
    name: 'SoundCloud',
    patterns: [/^https?:\/\/(www\.)?soundcloud\.com\/.+/i],
    placeholder: 'https://soundcloud.com/artist',
  },
  spotify: {
    name: 'Spotify',
    patterns: [/^https?:\/\/open\.spotify\.com\/(artist|user)\/.+/i],
    placeholder: 'https://open.spotify.com/artist/...',
  },
  youtube: {
    name: 'YouTube',
    patterns: [/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i],
    placeholder: 'https://youtube.com/@channel',
  },
};

export function isValidSocialUrl(platform, url) {
  if (!url) return true; // Empty is valid (optional)
  const config = SOCIAL_PLATFORMS[platform];
  if (!config) return false;
  return config.patterns.some((pattern) => pattern.test(url));
}
```

### SocialLinksRow Component

```javascript
// src/app/components/SocialLinksRow.js

const SOCIAL_ICONS = {
  twitter: XIcon, // Reuse from contact/SocialLinks.js
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  soundcloud: SoundCloudIcon, // Need to add
  spotify: SpotifyIcon, // Need to add
};

export default function SocialLinksRow({ socialLinks }) {
  if (!socialLinks) return null;

  const activeLinks = Object.entries(socialLinks).filter(([_, url]) => url);

  if (activeLinks.length === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-3">
      {activeLinks.map(([platform, url]) => {
        const Icon = SOCIAL_ICONS[platform];
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={`Visit ${platform} profile`}
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </div>
  );
}
```

---

## Embed Dimensions

| Platform    | Mobile Height   | Desktop Height     | Notes                         |
| ----------- | --------------- | ------------------ | ----------------------------- |
| SoundCloud  | 166px (compact) | 300-360px (visual) | Use `visual=true` for desktop |
| Spotify     | 152px           | 352px              | Spotify embed is responsive   |
| YouTube     | 200px           | 315px              | 16:9 aspect ratio             |
| Apple Music | 150px           | 175px              | Fixed height                  |

---

## Testing Checklist

### Social Links

- [ ] Twitter/X URL validates and opens
- [ ] Instagram URL validates and opens
- [ ] TikTok URL validates and opens
- [ ] SoundCloud URL validates and opens
- [ ] Spotify URL validates and opens
- [ ] YouTube URL validates and opens
- [ ] Empty links don't render icons
- [ ] Invalid URLs show validation error in edit form

### Music Player

- [ ] SoundCloud tracks play in embed
- [ ] Spotify tracks show 30s preview embed
- [ ] YouTube videos play in embed
- [ ] Invalid/deleted tracks show graceful error
- [ ] Platform auto-detected from pasted URL
- [ ] Metadata (title, artist, artwork) cached correctly

### Responsive

- [ ] Social icons display correctly on mobile
- [ ] Music player switches between compact/visual modes
- [ ] Edit form scrolls properly on mobile

---

## Migration Notes

1. **Backward Compatibility**: Keep reading `profileSongUrl` for users who haven't updated
2. **Write Both Fields**: When saving music, write to both `profileSongUrl` and `profileMusic`
3. **No Data Migration Needed**: Existing SoundCloud URLs continue to work

---

## Dependencies

All existing - no new packages needed:

- `firebase/firestore` - Data persistence
- `react-hot-toast` - Notifications
- Next.js `<Image>` - Album artwork
- Native `<iframe>` - Embeds

---

## References

- [SOCIAL-LINKS-IMPLEMENTATION.md](./SOCIAL-LINKS-IMPLEMENTATION.md) - Mobile app spec (complete)
- [MULTI-PLATFORM-MUSIC-IMPLEMENTATION.md](./MULTI-PLATFORM-MUSIC-IMPLEMENTATION.md) - Mobile app spec (complete)
- [contact/SocialLinks.js](../src/app/contact/SocialLinks.js) - Existing social icons

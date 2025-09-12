'use client';

import Link from 'next/link';
import React from 'react';

// Convert plain-text URLs into <a> tags while preserving original text.
// Keeps surrounding punctuation outside the link for nicer rendering.
export function linkifyText(text, options = {}) {
  if (!text) return null;
  const anchorClass =
    options.anchorClass || 'text-[#ff1f42] hover:text-[#ff415f] underline underline-offset-2';

  const result = [];
  const str = String(text);
  const urlRe = /((https?:\/\/|www\.)[^\s<]+)/gi;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = urlRe.exec(str)) !== null) {
    const start = match.index;
    const end = urlRe.lastIndex;
    if (start > lastIndex) {
      result.push(
        <React.Fragment key={`t_${key++}`}>{str.slice(lastIndex, start)}</React.Fragment>,
      );
    }

    let url = match[0];
    let trailing = '';
    // Move trailing punctuation outside the link for nicer wrapping
    while (/[),.;:!?]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }

    const href = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    result.push(
      <a
        key={`a_${key++}`}
        href={href}
        className={anchorClass}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {url}
      </a>,
    );
    if (trailing) {
      result.push(<React.Fragment key={`p_${key++}`}>{trailing}</React.Fragment>);
    }
    lastIndex = end;
  }

  if (lastIndex < str.length) {
    result.push(<React.Fragment key={`t_${key++}`}>{str.slice(lastIndex)}</React.Fragment>);
  }

  return result;
}

// Convert @username mentions to internal links. Avoids matching emails by requiring a non-word (or start) before '@'.
export function mentionifyText(text, options = {}) {
  if (!text) return null;
  const mentionClass =
    options.mentionClass || 'text-[#ff1f42] hover:text-[#ff415f] underline underline-offset-2';
  const str = String(text);
  const re = /(^|[^A-Za-z0-9_])@([A-Za-z0-9._]{3,20})\b/g;
  const out = [];
  let last = 0;
  let m;
  let key = 0;
  while ((m = re.exec(str)) !== null) {
    const start = m.index;
    const pre = m[1] || '';
    const unameRaw = m[2] || '';
    if (start > last) {
      out.push(<React.Fragment key={`mt_${key++}`}>{str.slice(last, start)}</React.Fragment>);
    }
    if (pre) out.push(<React.Fragment key={`mp_${key++}`}>{pre}</React.Fragment>);
    const display = `@${unameRaw}`;
    const href = `/${unameRaw.toLowerCase()}`;
    out.push(
      <Link key={`ml_${key++}`} href={href} prefetch={false} className={mentionClass}>
        {display}
      </Link>,
    );
    last = re.lastIndex;
  }
  if (last < str.length)
    out.push(<React.Fragment key={`mt_${last}`}>{str.slice(last)}</React.Fragment>);
  return out;
}

// Apply linkify URLs first, then mentions on remaining text nodes/fragments.
export function linkifyAll(text, options = {}) {
  const nodes = linkifyText(text, options);
  if (nodes == null) return null;
  const out = [];
  let key = 0;
  const pushMany = (arr) => arr.forEach((n) => out.push(n));
  for (const node of [].concat(nodes)) {
    if (typeof node === 'string') {
      pushMany([].concat(mentionifyText(node, options)));
    } else if (React.isValidElement(node)) {
      if (node.type === React.Fragment && typeof node.props.children === 'string') {
        pushMany([].concat(mentionifyText(node.props.children, options)));
      } else {
        out.push(React.cloneElement(node, { key: node.key ?? `k_${key++}` }));
      }
    } else {
      out.push(node);
    }
  }
  return out;
}

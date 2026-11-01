'use client';

import { useState } from 'react';

// Progressive disclosure for long text: collapsed excerpt + explicit toggle,
// full text always available one click away. Never used for booking rules,
// prices, venue or attendance restrictions.
export function ReadMore({ text, collapsedChars = 600 }: { text: string; collapsedChars?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= collapsedChars) {
    return <p className="whitespace-pre-line">{text}</p>;
  }
  return (
    <div>
      <p className="whitespace-pre-line">{expanded ? text : `${text.slice(0, collapsedChars).trimEnd()}…`}</p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-2 inline-flex min-h-11 items-center rounded-md border border-adify-line px-3 py-2 text-sm font-bold hover:border-adify-action"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  );
}

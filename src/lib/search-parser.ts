// Search-specific types
export type SearchTag = 'artist' | 'composer' | 'album' | 'title' | 'content' | 'metadata' | 'year';

export interface TaggedTerm {
  tag: SearchTag;
  term: string;
}

export interface ParsedQuery {
  taggedTerms: TaggedTerm[];
  untaggedTerms: string[];
}

const VALID_TAGS: Set<string> = new Set([
  'artist',
  'composer',
  'album',
  'title',
  'content',
  'metadata',
  'year'
]);

/**
 * Parses a search query string into tagged and untagged terms.
 * 
 * @param query - The raw search query string
 * @returns ParsedQuery object with taggedTerms and untaggedTerms
 * 
 * @example
 * parseSearchQuery("@artist Arijit @composer Pritam love song")
 * // Returns:
 * // {
 * //   taggedTerms: [
 * //     { tag: 'artist', term: 'Arijit' },
 * //     { tag: 'composer', term: 'Pritam' }
 * //   ],
 * //   untaggedTerms: ['love', 'song']
 * // }
 */
export function parseSearchQuery(query: string): ParsedQuery {
  // Handle empty or whitespace-only queries
  if (!query || query.trim() === '') {
    return { taggedTerms: [], untaggedTerms: [] };
  }

  const taggedTerms: TaggedTerm[] = [];
  const untaggedTerms: string[] = [];

  // Split by whitespace and filter out empty strings
  const tokens = query.split(/\s+/).filter(token => token.length > 0);

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // Check if token starts with @ (potential tag)
    if (token.startsWith('@')) {
      const tagName = token.substring(1).toLowerCase();

      // Validate tag
      if (VALID_TAGS.has(tagName)) {
        // Check if there's a following term
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('@')) {
          taggedTerms.push({
            tag: tagName as SearchTag,
            term: tokens[i + 1]
          });
          i += 2; // Skip both tag and term
          continue;
        }
        // Orphaned tag (no following term) - ignore it
        i++;
        continue;
      } else {
        // Invalid tag - treat as untagged term
        untaggedTerms.push(token);
        i++;
        continue;
      }
    }

    // Regular untagged term
    untaggedTerms.push(token);
    i++;
  }

  return { taggedTerms, untaggedTerms };
}

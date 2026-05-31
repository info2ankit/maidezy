// Ordered longest-first so "VIII" matches before "V" or "I"
const ROMAN_TO_ARABIC: [RegExp, string][] = [
  [/\bxiii\b/g, '13'],
  [/\bxii\b/g,  '12'],
  [/\bxi\b/g,   '11'],
  [/\bx\b/g,    '10'],
  [/\bix\b/g,   '9'],
  [/\bviii\b/g, '8'],
  [/\bvii\b/g,  '7'],
  [/\bvi\b/g,   '6'],
  [/\biv\b/g,   '4'],
  [/\bv\b/g,    '5'],
  [/\biii\b/g,  '3'],
  [/\bii\b/g,   '2'],
  [/\bi\b/g,    '1'],
]

export function normalizeForSearch(str: string): string {
  let s = str.toLowerCase()
  for (const [pattern, replacement] of ROMAN_TO_ARABIC) {
    s = s.replace(pattern, replacement)
  }
  return s
}

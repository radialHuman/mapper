export function toCsv(values: string[]): string {
  return values.join(', ')
}

export function parseCsv(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

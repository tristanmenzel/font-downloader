

export async function downloadFonts(urls: Record<string, string>): Promise<Record<string, ArrayBuffer>> {
 return Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([name, url]) => {
  const response = await fetch(url, {
   credentials: 'omit'
  })

  return [name, await response.arrayBuffer()] as const
 })))
}

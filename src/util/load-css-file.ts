

export async function loadCssFile(url: string): Promise<string>  {
  const result = await fetch(url, {
    credentials: 'omit',
  })

  if(result.ok){
    return result.text()
  } else {
    throw new Error(result.statusText)
  }
}

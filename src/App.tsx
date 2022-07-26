import React, { useCallback, useState } from 'react'
import { loadCssFile } from './util/load-css-file'

export function App() {
  const [cssFile, setCssFile] = useState('')

  const onChooseUrl = useCallback(async (url: string) => {
    const fileContents = await loadCssFile(url)
    setCssFile(fileContents)
  }, [])

  return (
    <div className={'flex flex-col gap-4'}>
      <h1 className={'text-2xl font-bold mb-8'}>Font downloader</h1>
      <UrlChooser onChoose={onChooseUrl} />

      <div className={'max-h-40 border-2 border-gray-700 p-2 overflow-y-auto'}>
      <code className={'whitespace-pre-wrap text-xs'}>
        {cssFile}
      </code>
      </div>
    </div>
  )
}


export function UrlChooser({ onChoose }: { onChoose(url: string): void }) {
  const [url, setUrl] = useState('https://use.typekit.net/cci4sxc.css')
  return <section className={'p-4 border-2 border-gray-300'}>
    <label className={'flex flex-col gap-2 mb-4'}>
      <span className={'font-bold block'}>Url</span>
      <input className={'border-gray-300 border-2'} type={'text'} value={url} onChange={e => setUrl(e.target.value)} />
    </label>

    <button className={'bg-green-700 rounded px-4 py-2'}
            onClick={() => {
              if (url) {
                onChoose(url)
              }

            }}>Load
    </button>
  </section>
}

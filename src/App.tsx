import React, { Fragment, useCallback, useMemo, useState } from 'react'
import { loadCssFile } from './util/load-css-file'
import { Atrule, CssNode, Declaration, parse } from 'css-tree'
import { buildZip } from './util/build-zip'

export function App() {
  const [cssFile, setCssFile] = useState('')
  const parsedCss = useMemo(() => {
    return cssFile ? parse(cssFile, {}) : undefined
  }, [cssFile])

  const fontFaces = useMemo(() => {
    const res: Atrule[] = []
    if (parsedCss?.type === 'StyleSheet') {
      parsedCss.children.forEach(n => {
        if (n.type === 'Atrule' && n.name === 'font-face') {
          res.push(n)
        }
      })
    }
    return res

  }, [parsedCss])
  const onChooseUrl = useCallback(async (url: string) => {
    const fileContents = await loadCssFile(url)
    setCssFile(fileContents)
  }, [])

  return (
    <div className={'flex flex-col gap-4'}>
      <h1 className={'text-2xl font-bold my-4'}>Font downloader</h1>
      <UrlChooser onChoose={onChooseUrl} />

      <div className={'max-h-40 border-2 border-gray-700 p-2 overflow-y-auto'}>
        <code className={'whitespace-pre-wrap text-xs'}>
          {cssFile}
        </code>
      </div>
      <CssPreview fontFaces={fontFaces} />
      <FontDownloader fontFaces={fontFaces}  />
    </div>
  )
}


export function UrlChooser({ onChoose }: { onChoose(url: string): void }) {
  const [url, setUrl] = useState('https://use.typekit.net/cci4sxc.css')
  return <section className={'p-4 border-2 border-gray-300'}>
    <label className={'flex flex-col gap-2 mb-4'}>
      <span className={'font-bold block'}>Url</span>
      <input className={'border-gray-300 border-2 px-2 py-1'} type={'text'} value={url} onChange={e => setUrl(e.target.value)} />
    </label>

    <button className={'bg-green-700 rounded px-4 py-1'}
            onClick={() => {
              if (url) {
                onChoose(url)
              }

            }}>Load
    </button>
  </section>
}

export function CssPreview({ fontFaces }: { fontFaces: Atrule[] }) {
  return <section className={'p-4 border-2 border-gray-300 overflow-y-auto max-h-[200px]'}>
    {fontFaces.length === 0 ? 'Waiting for css file, or no font faces found' :
      <ul>
        {fontFaces.map((ff, i) => <li key={i}>
          <DisplayFontFace node={ff} />
        </li>)}
      </ul>
    }
  </section>
}

function DisplayFontFace({ node }: { node: Atrule }) {
  return <dl className={'grid grid-cols-[170px_1fr] gap-2 bg-sky-100/50 p-2 mb-4'}>
    {
      node.block?.children
        .filter((x): x is Declaration => x.type === 'Declaration')
        .toArray()
        .map((x, i) => <Fragment key={i}>
          <dt>{x.property}</dt>
          <dd>{x.value.type === 'Raw' ? x.value.value : <DisplayCssNode node={x.value} />}
          </dd>
        </Fragment>)
    }
  </dl>
}

function DisplayCssNode({ node }: { node: CssNode }): JSX.Element {


  switch (node.type) {
    case 'Value':
      return <ul className={'[&>*]:inline [&>*]:mr-2'}>
        {node.children.toArray().map((v, i) => <li key={i}><DisplayCssNode node={v} /></li>)}
      </ul>
    case 'String':
      return <>{node.value}</>
    case 'Number':
      return <>{node.value}</>
    case 'Identifier':
      return <>{node.name}</>
    case 'Operator':
      return <>{node.value}</>
    case 'Url':
      return typeof (node.value as unknown) === 'string' ? <>{node.value}</> : <DisplayCssNode node={node.value} />
    case 'Function':
      return <span>{node.name}({node.children.toArray().map((c, i) => <DisplayCssNode node={c} key={i} />)})</span>
    case 'Raw':
      return <>{node.value}</>

    default:
      return <>{node.type} not supported</>
  }
}


function FontDownloader({ fontFaces }: { fontFaces: Atrule[] }): JSX.Element {
  const [fontUrl, setFontUrl] = useState('/public')


  return <section className={'p-4 border-2 border-gray-300'}>
    <label className={'flex flex-col gap-2 mb-4'}>
      <span className={'font-bold block'}>Absolute or relative url for font files</span>
      <input className={'border-gray-300 border-2 px-2 py-1'} type={'text'} value={fontUrl} onChange={e => setFontUrl(e.target.value)} />
    </label>

    <button className={'bg-green-700 rounded px-4 py-1'}
            onClick={() => {
              if (fontUrl) {
                const zip = buildZip(fontFaces)
              }
            }}>Download
    </button>
  </section>
}

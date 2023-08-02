import { Atrule, CssNode, Declaration, Url } from 'css-tree'
import { downloadFonts } from './download-fonts'
import JSZip from 'jszip'


interface FontFace {
  name: string
  sources: Record<string, string>
  style: string
  weight: number | string
  unicodeRange?: string
}

export async function buildZip(fontFaces: Atrule[], fontBaseUrl: string) {


  const fonts: FontFace[] = []

  fontFaces
    .forEach(faceBlock => {
      const children = faceBlock.block?.children.toArray() ?? []
      console.log(children)
      const name = children
        .filter(declarationOfType('font-family'))
        .map(x => {
          assertType(x.value, 'Value')
          const name = x.value.children.toArray()[0]
          assertType(name, 'String')
          return name.value
        })[0]
      const style = children
        .filter(declarationOfType('font-style'))
        .map(x => {
          assertType(x.value, 'Value')
          const style = x.value.children.toArray()[0]
          assertType(style, 'Identifier')
          return style.name
        })[0] ?? 'normal'
      const weight = children
        .filter(declarationOfType('font-weight'))
        .map(x => {
          assertType(x.value, 'Value')
          const weight = x.value.children.toArray()[0]
          if (weight.type === 'Number') {
            return weight.value
          }
          if (weight.type === 'Identifier') {
            return weight.name
          }
          throw new Error('Unexpected node type for font-weight:' + weight.type)
        })[0] ?? 'normal'
      const sources = children
        .filter(declarationOfType('src'))
        .map(x => {
          assertType(x.value, 'Value')

          const sources:Record<string, string> = {}
          x.value.children.toArray().reduce((acc, cur): [Url] | [] => {
            if(cur.type === 'Url') {
              if(acc[0]) {
                sources[''] = getUrlStr(acc[0])
              }
              return [cur]
            }
            if(cur.type === 'Function') {
              const fontFormat = cur.children.toArray().find(ofType('String'))?.value ?? ''
              if(acc[0] === undefined)
                throw new Error('Unexpected: found font format without associated font url')
              sources[fontFormat] = getUrlStr(acc[0])
            }
            return []
          }, [] as [Url] | [])
          return sources
        })[0] ?? {}

        const unicodeRange = children
            .filter(declarationOfType('unicode-range'))
            .map(x => {
                assertType(x.value, 'Value')
                console.log(x.value.children)
                return x.value.children.toArray().filter(ofType('UnicodeRange')).map(x => x.value).join(', ')

            })[0] ?? undefined


      // const name = faceBlock.block?.children
      //   .filter(n => n.type === '')

      fonts.push({
        name,
        sources,
        style,
        weight,
        unicodeRange,
      })

    })

  const fontsToDownload = Object.fromEntries(
    fonts.flatMap(f => Object.entries(f.sources).map(([format, url]) => [getFontFileName(f, format), url]))
  )

  const downloadedFonts = await downloadFonts(fontsToDownload)

  const zip = new JSZip()
  const fontsFolder = zip.folder('fonts')!
  Object.entries(downloadedFonts).forEach(([name, file]) => {
    fontsFolder.file(name, file)
  })
  zip.file('styles.css', buildFontFaceStyles(fonts, fontBaseUrl))

  return zip.generateAsync({type: 'blob'})
}

function buildFontFaceStyles(fonts: FontFace[], fontBaseUrl: string) {



  return fonts.map(f => `
    @font-face {
      font-family: "${f.name}";
      src: ${buildFontSource(f, fontBaseUrl, f.sources)};
      font-weight: ${f.weight};
      font-style: ${f.style};${f.unicodeRange ? `
      unicode-range: ${f.unicodeRange};` : ''}
    }  
  `).join('\n\n')

  function buildFontSource(fontFace: FontFace, fontBaseUrl: string, sources: Record<string, string>) {
    return Object.entries(sources)
      .map(([format]) => `url('${fontBaseUrl}/${getFontFileName(fontFace, format)}') format('${format}')`)
      .join(', ')
  }


}

function getFontFileName(font: FontFace, format: string) {
  return `${font.name}-w-${font.weight}-s-${font.style}.${fontExt(format)}`
}

function fontExt(format: string) {
  switch(format) {
    case 'opentype':
      return 'otf'
    case '':
      return 'font'
    default:
      return format;
  }
}

function getUrlStr(url: Url): string {
  const val = url.value as unknown
  return typeof val === 'string'
    ? val
    : url.value.type === 'String' || url.value.type === 'Raw'
      ? url.value.value : ''

}

type PickUnion<TUnion,
  TDiscriminatorKey extends keyof TUnion,
  TDiscriminatorValue extends TUnion[TDiscriminatorKey],
  > = TUnion extends { [key in TDiscriminatorKey]: TDiscriminatorValue } ? TUnion : never

function ofType<TNodeType extends CssNode['type']>(type: TNodeType) {
  return (x: CssNode): x is PickUnion<CssNode, 'type', TNodeType> => x.type === type
}

function declarationOfType(property: string) {
  return (x: CssNode): x is Declaration => x.type === 'Declaration' && x.property === property
}

function assertType<TNodeType extends CssNode['type']>(node: CssNode | null,
  type: TNodeType): asserts node is PickUnion<CssNode, 'type', TNodeType> {
  if (node?.type !== type) {
    throw new Error('Expected node type of ' + type + ' but found ' + node?.type ?? '<null>')
  }

}

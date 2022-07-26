import { Atrule, CssNode, Declaration, Url } from 'css-tree'
import { downloadFonts } from './download-fonts'


interface FontFace {
  name: string
  sources: Record<string, string>
  style: string
  weight: number | string
}

export async function buildZip(fontFaces: Atrule[]) {


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


      // const name = faceBlock.block?.children
      //   .filter(n => n.type === '')

      fonts.push({
        name,
        sources,
        style,
        weight,
      })

    })

  const fontsToDownload = Object.fromEntries(
    fonts.flatMap(f => Object.entries(f.sources).map(([format, url]) => [getFontFileName(f, format), url]))
  )

  const downloadedFonts = await downloadFonts(fontsToDownload)

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
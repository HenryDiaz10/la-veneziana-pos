import {readdir,readFile,stat} from 'node:fs/promises'
import {resolve,dirname,join,relative} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'

const ignorados=new Set(['.git','node_modules','dist','build','coverage','playwright-report','test-results'])
function sinBloques(texto){
  let cerca=null
  return texto.split(/\r?\n/).map(linea=>{
    const marca=linea.match(/^\s*(`{3,}|~{3,})/)
    if(marca){if(!cerca)cerca=marca[1][0];else if(cerca===marca[1][0])cerca=null;return ''}
    return cerca?'':linea
  }).join('\n')
}
export function anclasMarkdown(texto){
  const anclas=new Set(),usadas=new Map()
  for(const linea of sinBloques(texto).split('\n')){
    const h=linea.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/)
    if(!h)continue
    const base=h[1].replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu,'').trim().replace(/\s/g,'-')
    const n=usadas.get(base)??0;usadas.set(base,n+1);anclas.add(n?`${base}-${n}`:base)
  }
  for(const m of texto.matchAll(/<(?:a|[a-z][\w-]*)\b[^>]*\b(?:id|name)=["']([^"']+)["']/gi))anclas.add(m[1])
  return anclas
}
function enlacesMarkdown(texto){
  const limpio=sinBloques(texto),enlaces=[]
  for(const m of limpio.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\)/g))enlaces.push(m[1].replace(/^<|>$/g,''))
  const referencias=new Map()
  for(const m of limpio.matchAll(/^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm))referencias.set(m[1].toLowerCase(),m[2].replace(/^<|>$/g,''))
  for(const m of limpio.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)){
    const clave=(m[2]||m[1]).toLowerCase()
    if(referencias.has(clave))enlaces.push(referencias.get(clave))
  }
  return enlaces
}
async function archivosMarkdown(carpeta){
  const archivos=[]
  for(const entrada of await readdir(carpeta,{withFileTypes:true})){
    if(ignorados.has(entrada.name)||entrada.isSymbolicLink())continue
    const ruta=join(carpeta,entrada.name)
    if(entrada.isDirectory())archivos.push(...await archivosMarkdown(ruta))
    else if(entrada.isFile()&&/\.md$/i.test(entrada.name))archivos.push(ruta)
  }
  return archivos
}
export async function verificarDocumentacion(raiz){
  raiz=resolve(raiz)
  const archivos=await archivosMarkdown(raiz),documentos=new Map(),errores=[],grafo=new Map()
  for(const archivo of archivos){const texto=await readFile(archivo,'utf8');documentos.set(archivo,{texto,anclas:anclasMarkdown(texto)});grafo.set(archivo,new Set())}
  let enlaces=0
  for(const [archivo,{texto}] of documentos){
    for(const url of enlacesMarkdown(texto)){
      if(/^(?:[a-z][\w+.-]*:|\/\/)/i.test(url))continue
      enlaces++
      let ruta,ancla
      try{const partes=url.split('#');ruta=decodeURIComponent(partes[0].split('?')[0]);ancla=decodeURIComponent(partes.slice(1).join('#'))}
      catch{errores.push(`${relative(raiz,archivo)}: enlace mal codificado ${url}`);continue}
      let destino=ruta?resolve(ruta.startsWith('/')?raiz:dirname(archivo),ruta.startsWith('/')?`.${ruta}`:ruta):archivo
      let info
      try{info=await stat(destino)}catch{errores.push(`${relative(raiz,archivo)}: destino inexistente ${url}`);continue}
      if(info.isDirectory())destino=join(destino,'README.md')
      if(documentos.has(destino)){
        grafo.get(archivo).add(destino)
        if(ancla&&!documentos.get(destino).anclas.has(ancla))errores.push(`${relative(raiz,archivo)}: ancla inexistente ${url}`)
      }
    }
  }
  const visitados=new Set(),pendientes=[join(raiz,'README.md')]
  while(pendientes.length){const actual=pendientes.pop();if(visitados.has(actual))continue;visitados.add(actual);pendientes.push(...(grafo.get(actual)??[]))}
  for(const archivo of archivos)if(!visitados.has(archivo))errores.push(`${relative(raiz,archivo)}: documento sin acceso desde README.md`)
  return {archivos:archivos.length,enlaces,errores}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const raiz=resolve(dirname(fileURLToPath(import.meta.url)),'..')
  const r=await verificarDocumentacion(raiz)
  if(r.errores.length){for(const e of r.errores)console.error(e);process.exitCode=1}
  else console.log(`OK: ${r.archivos} documentos, ${r.enlaces} enlaces locales válidos y todas las guías accesibles desde README.md.`)
}

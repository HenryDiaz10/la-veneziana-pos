import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,unlink,rmdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {verificarDocumentacion,anclasMarkdown} from './verificar-documentacion.mjs'

async function escenario(archivos,ejecutar){
  const raiz=await mkdtemp(join(tmpdir(),'veneziana-docs-')),carpetas=new Set()
  try{
    for(const [ruta,contenido] of Object.entries(archivos)){
      const padre=dirname(join(raiz,ruta))
      if(padre!==raiz){await mkdir(padre,{recursive:true});carpetas.add(padre)}
      await writeFile(join(raiz,ruta),contenido,'utf8')
    }
    await ejecutar(await verificarDocumentacion(raiz))
  }finally{
    for(const ruta of Object.keys(archivos))await unlink(join(raiz,ruta))
    for(const carpeta of [...carpetas].sort((a,b)=>b.length-a.length))await rmdir(carpeta)
    await rmdir(raiz)
  }
}
test('Valida espacios codificados, anclas con tildes y encabezados repetidos',async()=>{
  await escenario({'README.md':'# Inicio\n[Guía](guia%20t%C3%A9cnica.md#configuraci%C3%B3n-1)','guia técnica.md':'# Guía\n## Configuración\n## Configuración'},r=>assert.deepEqual(r.errores,[]))
  assert.deepEqual([...anclasMarkdown('# A & B\n## A & B')],['a--b','a--b-1'])
})
test('Detecta enlace roto, ancla inexistente y documento huérfano',async()=>{
  await escenario({'README.md':'# Inicio\n[Ausente](no.md)\n[Guía](guia.md#no-existe)','guia.md':'# Guía','huerfano.md':'# Sin índice'},r=>{
    assert.equal(r.errores.length,3)
    assert.ok(r.errores.some(e=>e.includes('destino inexistente')))
    assert.ok(r.errores.some(e=>e.includes('ancla inexistente')))
    assert.ok(r.errores.some(e=>e.includes('documento sin acceso')))
  })
})
test('Resuelve referencias a carpetas e ignora ejemplos y sitios externos',async()=>{
  await escenario({'README.md':'# Inicio\n[Documentos][guia]\n[guia]: docs/\n```markdown\n[Falso](no.md)\n```\n[Web](https://example.invalid/no-existe)','docs/README.md':'# Documentos\n[Inicio](../README.md)'},r=>assert.deepEqual(r.errores,[]))
})

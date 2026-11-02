import { campos, texto, idGrande, exigirPedido as exigir } from './pedidos-calculo.js';

export function comandoKds(datos) {
  campos(datos, ['version', 'estado', 'motivo', 'autorizacion_id']);
  exigir(Number.isSafeInteger(datos.version) && datos.version > 0 && datos.version < 2147483647 &&
    ['preparando', 'horno', 'listo_para_entrega', 'entregado', 'cancelado'].includes(datos.estado));
  const motivo = texto(datos.motivo, 500);
  exigir(datos.estado === 'cancelado' ? motivo.length >= 3 : !motivo && datos.autorizacion_id === undefined);
  return { version: datos.version, estado: datos.estado, motivo,
    ...(datos.autorizacion_id === undefined ? {} : { autorizacion_id: idGrande(datos.autorizacion_id) }) };
}

// Máquina de estados: no retroceder ni saltar preparación en cocina.
export function transicionKds(tarea, comando) {
  exigir(tarea.version === comando.version, 'TAREA_KDS_DESACTUALIZADA');
  const canal = tarea.snapshot_json?.canal;
  const caminos = canal === 'cocina'
    ? { espera: ['preparando', 'cancelado'], preparando: ['horno', 'listo_para_entrega', 'cancelado'], horno: ['listo_para_entrega', 'cancelado'], listo_para_entrega: ['entregado', 'cancelado'] }
    : canal === 'despacho' ? { espera: ['entregado', 'cancelado'] } : {};
  exigir(caminos[tarea.estado]?.includes(comando.estado), 'TRANSICION_KDS_NO_VALIDA');
  const cancelar = comando.estado === 'cancelado';
  return { consumir: !cancelar && ((canal === 'cocina' && tarea.estado === 'espera') || canal === 'despacho'),
    liberar: cancelar && tarea.estado === 'espera' && !tarea.iniciado_en,
    autorizar: cancelar && (tarea.estado !== 'espera' || Boolean(tarea.iniciado_en)),
    fecha: { preparando: 'iniciado_en', horno: 'horno_en', listo_para_entrega: 'listo_en', entregado: 'entregado_en' }[comando.estado] };
}

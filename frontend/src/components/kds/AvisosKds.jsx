import { ETAPAS_KDS, NOMBRES_KDS } from '../../utils/kds-tablero.js'

export default function AvisosKds({ audio, aviso, sincronizado }) {
  const { preferencias, habilitado, pausado } = audio
  return <details className="vz-kds-ajustes" open>
    <summary>Avisos y tiempos de cocina</summary>
    <div className="vz-kds-ajustes-contenido">
      <div className="vz-kds-audio-controles">
        <button type="button" onClick={audio.probar}>{habilitado ? 'Probar sonido' : 'Activar y probar sonido'}</button>
        <button type="button" disabled={!habilitado} onClick={pausado ? audio.reanudar : audio.silenciar}>{pausado ? 'Reanudar avisos' : 'Silenciar 5 minutos'}</button>
        <button type="button" disabled={!habilitado} onClick={audio.desactivar}>Desactivar sonido</button>
        <label>Volumen: {preferencias.volumen}%<input aria-label="Volumen de avisos" type="range" min="0" max="100" step="5" value={preferencias.volumen} onChange={e => audio.cambiar('volumen', Number(e.target.value))}/></label>
      </div>
      <p className="vz-kds-ayuda-audio">{!habilitado ? 'Sonido desactivado. Actívalo y comprueba que se escucha en este equipo.' : pausado ? 'Avisos silenciados temporalmente. La prueba de sonido sigue disponible.' : preferencias.volumen === 0 ? 'Volumen en cero. Los avisos visuales siguen activos.' : 'Sonido habilitado para nuevas preparaciones confirmadas.'}</p>
      {audio.errorAudio && <p role="alert" className="vz-kds-aviso">{audio.errorAudio}</p>}
      <p role="status" aria-live="polite" className="vz-kds-ultimo-aviso">{aviso.numero ? `Último aviso · ${aviso.cantidad} ${aviso.cantidad === 1 ? 'preparación nueva' : 'preparaciones nuevas'} · aviso ${aviso.numero}` : 'Los avisos nuevos aparecerán aquí, incluso con el sonido desactivado.'}</p>
      <fieldset className="vz-kds-umbrales"><legend>Recordatorio por etapa (minutos)</legend>{ETAPAS_KDS.map(etapa => <label key={etapa}>{NOMBRES_KDS[etapa]}<input aria-label={`Recordatorio: ${NOMBRES_KDS[etapa]}`} type="number" min="1" max="180" step="1" value={preferencias.umbrales[etapa]} onChange={e => audio.cambiar(etapa, Number(e.target.value))}/></label>)}</fieldset>
      <p className="vz-kds-ayuda-audio">Recordatorios locales orientativos: ajústalos a tu operación. No indican que un producto esté quemado. {sincronizado ? 'Tiempos aproximados según la hora del servidor.' : 'Sin actualización confirmada: los tiempos se muestran como referencia.'} El navegador puede pausar el audio y los relojes en segundo plano.</p>
    </div>
  </details>
}

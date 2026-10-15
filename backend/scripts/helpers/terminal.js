import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { stdin, stdout } from 'node:process';

export function crearTerminalSegura() {
  // Exigir una terminal interactiva para ocultar la entrada.
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Ejecuta este comando en una terminal interactiva.');
  }

  let ocultar = false;
  const cancelacion = new AbortController();

  // Controlar lo que readline muestra en pantalla.
  const salida = new Writable({
    write(fragmento, codificacion, completar) {
      if (ocultar) {
        completar();
      } else {
        stdout.write(fragmento, codificacion, completar);
      }
    }
  });

  salida.columns = stdout.columns ?? 80;

  const terminal = createInterface({
    input: stdin,
    output: salida,
    terminal: true,

    // Evitar guardar las respuestas en el historial de readline.
    historySize: 0
  });

  terminal.on('SIGINT', () => cancelacion.abort());
  terminal.on('close', () => cancelacion.abort());

  return {
    // Para datos visibles, como nombre y correo.
    preguntar(texto) {
      return terminal.question(texto, {
        signal: cancelacion.signal
      });
    },

    // Para contraseñas: mostrar la pregunta y ocultar la respuesta.
    async preguntarOculto(texto) {
      stdout.write(texto);
      ocultar = true;

      try {
        return await terminal.question('', {
          signal: cancelacion.signal
        });
      } finally {
        ocultar = false;
        stdout.write('\n');
      }
    },

    cerrar() {
      terminal.close();
      salida.destroy();
    }
  };
}
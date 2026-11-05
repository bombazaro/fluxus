/**
 * Lê uma data do servidor em milissegundos. O Postgres devolve microssegundos e fuso curto
 * (`2026-11-05 10:00:00.123456+00`), formatos que nem todo motor de JavaScript aceita; aqui
 * viram o ISO padrão antes de ler. Devolve NaN se não for uma data.
 */
export function lerInstante(texto: string): number {
  const m =
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/.exec(
      texto.trim()
    );
  if (!m) return Date.parse(texto);
  const [, dia, hora, fracao = '', zona = 'Z'] = m;
  const ms = (fracao + '000').slice(0, 3);
  let fuso = zona;
  if (fuso !== 'Z') {
    const [, sinal, h, min = '00'] = /^([+-])(\d{2}):?(\d{2})?$/.exec(fuso) ?? [];
    fuso = `${sinal}${h}:${min}`;
  }
  return Date.parse(`${dia}T${hora}.${ms}${fuso}`);
}

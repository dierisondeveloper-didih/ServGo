// Feriados nacionais brasileiros — cálculo baseado em algoritmo de Meeus/Jones/Butcher

function calcularPascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, month - 1, day)
}

const FERIADOS_FIXOS = [
  { mes: 1,  dia: 1,  nome: 'Confraternização Universal' },
  { mes: 4,  dia: 21, nome: 'Tiradentes' },
  { mes: 5,  dia: 1,  nome: 'Dia do Trabalho' },
  { mes: 9,  dia: 7,  nome: 'Independência do Brasil' },
  { mes: 10, dia: 12, nome: 'Nossa Senhora Aparecida' },
  { mes: 11, dia: 2,  nome: 'Finados' },
  { mes: 11, dia: 15, nome: 'Proclamação da República' },
  { mes: 11, dia: 20, nome: 'Dia da Consciência Negra' },
  { mes: 12, dia: 25, nome: 'Natal' },
]

function addDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

export function getFeriadosAno(ano: number): Array<{ data: Date; nome: string }> {
  const feriados: Array<{ data: Date; nome: string }> = []

  for (const f of FERIADOS_FIXOS) {
    feriados.push({ data: new Date(ano, f.mes - 1, f.dia), nome: f.nome })
  }

  const pascoa = calcularPascoa(ano)
  feriados.push({ data: addDias(pascoa, -48), nome: 'Carnaval (Segunda)' })
  feriados.push({ data: addDias(pascoa, -47), nome: 'Carnaval (Terça)' })
  feriados.push({ data: addDias(pascoa, -2),  nome: 'Sexta-feira Santa' })
  feriados.push({ data: pascoa,               nome: 'Páscoa' })
  feriados.push({ data: addDias(pascoa, 60),  nome: 'Corpus Christi' })

  return feriados
}

export function isFeriado(data: Date): { is: boolean; nome?: string } {
  const feriados = getFeriadosAno(data.getFullYear())
  for (const f of feriados) {
    if (
      f.data.getFullYear() === data.getFullYear() &&
      f.data.getMonth()    === data.getMonth()    &&
      f.data.getDate()     === data.getDate()
    ) {
      return { is: true, nome: f.nome }
    }
  }
  return { is: false }
}

export function isFimDeSemana(data: Date): boolean {
  const d = data.getDay()
  return d === 0 || d === 6
}

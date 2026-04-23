// PORTAR PARA RN: Funções utilitárias são compatíveis diretamente

import type { EscalaConfig, DiaCalendario, PeriodoEscala } from './types'
import { isFeriado, isFimDeSemana } from './feriados'

export function isPlantao(data: Date, config: EscalaConfig): boolean {
  const periodos = config.periodos
  if (periodos.length === 0) return false

  // Converter períodos em blocos de 12h
  // Cada bloco é "trabalho" ou "folga"
  const blocos12h: Array<'trabalho' | 'folga'> = []
  for (const periodo of periodos) {
    const qtdBlocos = Math.round(periodo.horas / 12)
    for (let i = 0; i < qtdBlocos; i++) {
      blocos12h.push(periodo.tipo)
    }
  }

  const totalBlocos = blocos12h.length
  if (totalBlocos === 0) return false

  const [horaInicio] = config.horarioInicio.split(':').map(Number)

  const primeiroPlantao = new Date(config.primeiroPlantao)
  primeiroPlantao.setHours(12, 0, 0, 0)

  const dataCheck = new Date(data)
  dataCheck.setHours(12, 0, 0, 0)

  const diffMs = dataCheck.getTime() - primeiroPlantao.getTime()
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

  // Cada dia tem 2 blocos de 12h
  // Se entrada é de manhã (antes das 12h): bloco 0 = manhã, bloco 1 = noite
  // Se entrada é de noite (12h+): bloco 0 = noite, bloco 1 = manhã seguinte
  const blocoInicial = diffDias * 2

  // Verificar se algum dos 2 blocos deste dia é trabalho
  for (let b = 0; b < 2; b++) {
    let pos = (blocoInicial + b) % totalBlocos
    if (pos < 0) pos += totalBlocos
    if (blocos12h[pos] === 'trabalho') return true
  }

  return false
}

export function getHorarioPlantao(data: Date, config: EscalaConfig): Array<{ inicio: number; fim: number }> {
  const periodos = config.periodos
  if (periodos.length === 0) return []

  const blocos12h: Array<'trabalho' | 'folga'> = []
  for (const periodo of periodos) {
    const qtdBlocos = Math.round(periodo.horas / 12)
    for (let i = 0; i < qtdBlocos; i++) {
      blocos12h.push(periodo.tipo)
    }
  }

  const totalBlocos = blocos12h.length
  if (totalBlocos === 0) return []

  const [horaInicio] = config.horarioInicio.split(':').map(Number)

  const primeiroPlantao = new Date(config.primeiroPlantao)
  primeiroPlantao.setHours(12, 0, 0, 0)

  const dataCheck = new Date(data)
  dataCheck.setHours(12, 0, 0, 0)

  const diffMs = dataCheck.getTime() - primeiroPlantao.getTime()
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const blocoInicial = diffDias * 2
  const resultado: Array<{ inicio: number; fim: number }> = []

  // Bloco 0 do dia: começa no horário de entrada, dura 12h
  let pos0 = (blocoInicial) % totalBlocos
  if (pos0 < 0) pos0 += totalBlocos

  // Bloco 1 do dia: começa 12h depois, dura 12h
  let pos1 = (blocoInicial + 1) % totalBlocos
  if (pos1 < 0) pos1 += totalBlocos

  const inicioBloco0 = horaInicio
  const fimBloco0 = (horaInicio + 12) % 24
  const inicioBloco1 = fimBloco0
  const fimBloco1 = horaInicio

  if (blocos12h[pos0] === 'trabalho' && blocos12h[pos1] === 'trabalho') {
    // Ambos os blocos são trabalho = 24h
    if (horaInicio === 0) {
      resultado.push({ inicio: 0, fim: 24 })
    } else {
      resultado.push({ inicio: horaInicio, fim: 24 })
      resultado.push({ inicio: 0, fim: horaInicio })
    }
  } else if (blocos12h[pos0] === 'trabalho') {
    // Só o primeiro bloco
    if (inicioBloco0 < fimBloco0) {
      resultado.push({ inicio: inicioBloco0, fim: fimBloco0 })
    } else {
      // Cruza meia-noite
      resultado.push({ inicio: inicioBloco0, fim: 24 })
      resultado.push({ inicio: 0, fim: fimBloco0 })
    }
  } else if (blocos12h[pos1] === 'trabalho') {
    // Só o segundo bloco
    if (inicioBloco1 < fimBloco1 || fimBloco1 === 0) {
      resultado.push({ inicio: inicioBloco1, fim: fimBloco1 === 0 ? 24 : fimBloco1 })
    } else {
      resultado.push({ inicio: inicioBloco1, fim: 24 })
      resultado.push({ inicio: 0, fim: fimBloco1 })
    }
  }

  return resultado
}

/**
 * Gera os dias do calendário para um mês específico (sempre 42 células = 6 semanas)
 */
export function gerarCalendarioMes(
  ano: number,
  mes: number,
  config: EscalaConfig
): DiaCalendario[] {
  const dias: DiaCalendario[] = []
  const hoje = new Date()
  const todayYear = hoje.getFullYear()
  const todayMonth = hoje.getMonth()
  const todayDate = hoje.getDate()

  const primeiroDia = new Date(ano, mes, 1, 12, 0, 0)
  const ultimoDia   = new Date(ano, mes + 1, 0, 12, 0, 0)

  const makeDia = (data: Date, isCurrentMonth: boolean): DiaCalendario => {
    const feriadoInfo = isFeriado(data)
    return {
      data,
      dia: data.getDate(),
      isPlantao: isPlantao(data, config),
      isCurrentMonth,
      isToday:
        data.getDate()     === todayDate  &&
        data.getMonth()    === todayMonth &&
        data.getFullYear() === todayYear,
      isFeriado: feriadoInfo.is,
      nomeFeriado: feriadoInfo.nome,
      isFimDeSemana: isFimDeSemana(data),
    }
  }

  // Dias do mês anterior para completar a semana inicial
  const diaSemanaInicio = primeiroDia.getDay()
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    dias.push(makeDia(new Date(ano, mes, -i, 12, 0, 0), false))
  }

  // Dias do mês atual
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    dias.push(makeDia(new Date(ano, mes, dia, 12, 0, 0), true))
  }

  // Dias do próximo mês para completar 42 células
  const diasRestantes = 42 - dias.length
  for (let i = 1; i <= diasRestantes; i++) {
    dias.push(makeDia(new Date(ano, mes + 1, i, 12, 0, 0), false))
  }

  return dias
}

/**
 * Encontra o próximo plantão a partir de hoje
 */
export function proximoPlantao(config: EscalaConfig): Date {
  const hoje = new Date()
  for (let i = 0; i < 365; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i, 12, 0, 0)
    if (isPlantao(data, config)) return data
  }
  return hoje
}

/**
 * Conta todos os plantões em um período
 */
export function contarPlantoes(inicio: Date, fim: Date, config: EscalaConfig): number {
  let count = 0
  const current = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12, 0, 0)
  const end     = new Date(fim.getFullYear(),   fim.getMonth(),   fim.getDate(),   12, 0, 0)
  while (current <= end) {
    if (isPlantao(current, config)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

/**
 * Conta plantões que caem em feriado ou fim de semana
 */
export function contarPlantoesFeriado(inicio: Date, fim: Date, config: EscalaConfig): number {
  let count = 0
  const current = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12, 0, 0)
  const end     = new Date(fim.getFullYear(),   fim.getMonth(),   fim.getDate(),   12, 0, 0)
  while (current <= end) {
    if (isPlantao(current, config) && (isFimDeSemana(current) || isFeriado(current).is)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

/**
 * Converte string de escala personalizada para array de períodos
 * Ex: "12x24x12x72" -> [{horas:12,tipo:'trabalho'}, ...]
 */
export function parseEscalaPersonalizada(escalaStr: string): PeriodoEscala[] | null {
  const partes = escalaStr.split('x').map(Number)
  if (partes.length < 2 || partes.some(isNaN) || partes.some(n => n <= 0)) return null
  return partes.map((horas, i) => ({
    horas,
    tipo: i % 2 === 0 ? 'trabalho' : 'folga',
  }))
}

/**
 * Formata períodos para string legível
 */
export function formatarEscala(periodos: PeriodoEscala[]): string {
  return periodos.map(p => p.horas).join('x')
}

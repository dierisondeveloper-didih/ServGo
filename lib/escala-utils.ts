// PORTAR PARA RN: Funções utilitárias são compatíveis diretamente

import type { EscalaConfig, DiaCalendario, PeriodoEscala } from './types'
import { isFeriado, isFimDeSemana } from './feriados'

/**
 * Converte períodos em horas para array de dias com tipo
 */
function gerarCicloDias(periodos: PeriodoEscala[]): Array<'trabalho' | 'folga'> {
  const ciclo: Array<'trabalho' | 'folga'> = []
  for (const periodo of periodos) {
    const dias = Math.ceil(periodo.horas / 24)
    for (let i = 0; i < dias; i++) {
      ciclo.push(periodo.tipo)
    }
  }
  return ciclo
}

/**
 * Calcula se uma data específica é dia de plantão
 */
export function isPlantao(data: Date, config: EscalaConfig): boolean {
  const cicloDias = gerarCicloDias(config.periodos)
  const cicloTotal = cicloDias.length
  if (cicloTotal === 0) return false

  const primeiroPlantao = new Date(config.primeiroPlantao)
  // Corrigir fuso: se veio como string ISO, o parse é UTC. Ajustar para local.
  if (typeof config.primeiroPlantao === 'string') {
    const parts = String(config.primeiroPlantao).split('T')[0].split('-')
    primeiroPlantao.setFullYear(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  }
  primeiroPlantao.setHours(0, 0, 0, 0)

  const dataCheck = new Date(data)
  dataCheck.setHours(0, 0, 0, 0)

  const diffTime = dataCheck.getTime() - primeiroPlantao.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  let posicaoNoCiclo = diffDays % cicloTotal
  if (posicaoNoCiclo < 0) posicaoNoCiclo += cicloTotal

  return cicloDias[posicaoNoCiclo] === 'trabalho'
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
  hoje.setHours(0, 0, 0, 0)

  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia   = new Date(ano, mes + 1, 0)

  const makeDia = (data: Date, isCurrentMonth: boolean): DiaCalendario => {
    const feriadoInfo = isFeriado(data)
    return {
      data,
      dia: data.getDate(),
      isPlantao: isPlantao(data, config),
      isCurrentMonth,
      isToday: data.getTime() === hoje.getTime(),
      isFeriado: feriadoInfo.is,
      nomeFeriado: feriadoInfo.nome,
      isFimDeSemana: isFimDeSemana(data),
    }
  }

  // Dias do mês anterior para completar a semana inicial
  const diaSemanaInicio = primeiroDia.getDay()
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    dias.push(makeDia(new Date(ano, mes, -i), false))
  }

  // Dias do mês atual
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    dias.push(makeDia(new Date(ano, mes, dia), true))
  }

  // Dias do próximo mês para completar 42 células
  const diasRestantes = 42 - dias.length
  for (let i = 1; i <= diasRestantes; i++) {
    dias.push(makeDia(new Date(ano, mes + 1, i), false))
  }

  return dias
}

/**
 * Encontra o próximo plantão a partir de hoje
 */
export function proximoPlantao(config: EscalaConfig): Date {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const data = new Date(hoje)
    data.setDate(data.getDate() + i)
    if (isPlantao(data, config)) return data
  }
  return hoje
}

/**
 * Conta todos os plantões em um período
 */
export function contarPlantoes(inicio: Date, fim: Date, config: EscalaConfig): number {
  let count = 0
  const current = new Date(inicio)
  current.setHours(0, 0, 0, 0)
  const end = new Date(fim)
  end.setHours(0, 0, 0, 0)
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
  const current = new Date(inicio)
  current.setHours(0, 0, 0, 0)
  const end = new Date(fim)
  end.setHours(0, 0, 0, 0)
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

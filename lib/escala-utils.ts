// PORTAR PARA RN: Funções utilitárias são compatíveis diretamente

import type { EscalaConfig, DiaCalendario, PeriodoEscala } from './types'
import { isFeriado, isFimDeSemana } from './feriados'

/**
 * Retorna os blocos contínuos de trabalho para um dia específico.
 * Ex: [{ inicio: 7, fim: 19 }] para um plantão diurno 12h.
 */
export function getHorarioPlantao(data: Date, config: EscalaConfig): Array<{ inicio: number; fim: number }> {
  const periodos = config.periodos
  const cicloTotal = periodos.reduce((sum, p) => sum + p.horas, 0)

  if (cicloTotal === 0) return []

  const [horaInicio] = config.horarioInicio.split(':').map(Number)

  let primeiroPlantao: Date
  if (typeof config.primeiroPlantao === 'string') {
    const parts = String(config.primeiroPlantao).split('T')[0].split('-')
    primeiroPlantao = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0)
  } else {
    primeiroPlantao = new Date(config.primeiroPlantao)
    primeiroPlantao.setHours(12, 0, 0, 0)
  }

  const dataCheck = new Date(data)
  dataCheck.setHours(12, 0, 0, 0)

  const diffMs = dataCheck.getTime() - primeiroPlantao.getTime()
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const horasDesdeInicio = diffDias * 24 - horaInicio

  // Mapear cada hora do dia: está em trabalho ou não
  const horasTrabalho: boolean[] = []
  for (let h = 0; h < 24; h++) {
    const horaAbsoluta = horasDesdeInicio + h
    let posicao = horaAbsoluta % cicloTotal
    if (posicao < 0) posicao += cicloTotal

    let acumulado = 0
    let emTrabalho = false
    for (const periodo of periodos) {
      if (posicao >= acumulado && posicao < acumulado + periodo.horas) {
        emTrabalho = periodo.tipo === 'trabalho'
        break
      }
      acumulado += periodo.horas
    }
    horasTrabalho.push(emTrabalho)
  }

  // Agrupar em blocos contínuos de trabalho
  const blocos: Array<{ inicio: number; fim: number }> = []
  let inicioBloco = -1

  for (let h = 0; h <= 24; h++) {
    if (h < 24 && horasTrabalho[h]) {
      if (inicioBloco === -1) inicioBloco = h
    } else {
      if (inicioBloco !== -1) {
        blocos.push({ inicio: inicioBloco, fim: h })
        inicioBloco = -1
      }
    }
  }

  return blocos
}

/**
 * Calcula se uma data específica é dia de plantão
 */
export function isPlantao(data: Date, config: EscalaConfig): boolean {
  return getHorarioPlantao(data, config).length > 0
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

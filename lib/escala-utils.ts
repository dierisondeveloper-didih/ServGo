// PORTAR PARA RN: Funções utilitárias são compatíveis diretamente

import type { EscalaConfig, DiaCalendario, PeriodoEscala } from './types'

/**
 * Converte períodos em horas para array de dias com tipo
 * Cada elemento representa um dia e seu tipo (trabalho/folga)
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
 * baseado na configuração da escala com múltiplos períodos
 */
export function isPlantao(data: Date, config: EscalaConfig): boolean {
  const cicloDias = gerarCicloDias(config.periodos)
  const cicloTotal = cicloDias.length
  
  if (cicloTotal === 0) return false
  
  const primeiroPlantao = new Date(config.primeiroPlantao)
  primeiroPlantao.setHours(0, 0, 0, 0)
  
  const dataCheck = new Date(data)
  dataCheck.setHours(0, 0, 0, 0)
  
  const diffTime = dataCheck.getTime() - primeiroPlantao.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Normalizar para posição no ciclo (funciona para datas passadas também)
  let posicaoNoCiclo = diffDays % cicloTotal
  if (posicaoNoCiclo < 0) {
    posicaoNoCiclo += cicloTotal
  }
  
  return cicloDias[posicaoNoCiclo] === 'trabalho'
}

/**
 * Gera os dias do calendário para um mês específico
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
  const ultimoDia = new Date(ano, mes + 1, 0)
  
  // Dias do mês anterior para completar a semana
  const diaSemanaInicio = primeiroDia.getDay()
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    const data = new Date(ano, mes, -i)
    dias.push({
      data,
      dia: data.getDate(),
      isPlantao: isPlantao(data, config),
      isCurrentMonth: false,
      isToday: data.getTime() === hoje.getTime(),
    })
  }
  
  // Dias do mês atual
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const data = new Date(ano, mes, dia)
    dias.push({
      data,
      dia,
      isPlantao: isPlantao(data, config),
      isCurrentMonth: true,
      isToday: data.getTime() === hoje.getTime(),
    })
  }
  
  // Dias do próximo mês para completar a semana
  const diasRestantes = 42 - dias.length // 6 semanas completas
  for (let i = 1; i <= diasRestantes; i++) {
    const data = new Date(ano, mes + 1, i)
    dias.push({
      data,
      dia: i,
      isPlantao: isPlantao(data, config),
      isCurrentMonth: false,
      isToday: data.getTime() === hoje.getTime(),
    })
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
    if (isPlantao(data, config)) {
      return data
    }
  }
  
  return hoje
}

/**
 * Conta plantões em um período
 */
export function contarPlantoes(
  inicio: Date,
  fim: Date,
  config: EscalaConfig
): number {
  let count = 0
  const current = new Date(inicio)
  current.setHours(0, 0, 0, 0)
  
  const end = new Date(fim)
  end.setHours(0, 0, 0, 0)
  
  while (current <= end) {
    if (isPlantao(current, config)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

/**
 * Converte string de escala personalizada para array de períodos
 * Ex: "12x24x12x72" -> [{horas: 12, tipo: 'trabalho'}, {horas: 24, tipo: 'folga'}, ...]
 */
export function parseEscalaPersonalizada(escalaStr: string): PeriodoEscala[] | null {
  const partes = escalaStr.split('x').map(Number)
  
  // Validar: precisa ter pelo menos 2 números e todos válidos
  if (partes.length < 2 || partes.some(isNaN) || partes.some(n => n <= 0)) {
    return null
  }
  
  const periodos: PeriodoEscala[] = []
  for (let i = 0; i < partes.length; i++) {
    periodos.push({
      horas: partes[i],
      tipo: i % 2 === 0 ? 'trabalho' : 'folga'
    })
  }
  
  return periodos
}

/**
 * Formata períodos para string legível
 */
export function formatarEscala(periodos: PeriodoEscala[]): string {
  return periodos.map(p => p.horas).join('x')
}

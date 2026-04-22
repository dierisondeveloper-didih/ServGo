// PORTAR PARA RN: Tipos são compatíveis diretamente

// Estrutura para escalas com múltiplos períodos (ex: 12x24x12x72)
export interface PeriodoEscala {
  horas: number
  tipo: 'trabalho' | 'folga'
}

export interface EscalaConfig {
  padrao: string // ex: "24x72" ou "12x24x12x72" ou "Personalizada"
  periodos: PeriodoEscala[] // sequência de trabalho/folga
  horarioInicio: string // ex: "07:00"
  primeiroPlantao: Date
}

export interface DiaCalendario {
  data: Date
  dia: number
  isPlantao: boolean
  isCurrentMonth: boolean
  isToday: boolean
  isFeriado: boolean
  nomeFeriado?: string
  isFimDeSemana: boolean
}

// Interface para extras/bicos adicionados pelo usuário
export interface ExtraServico {
  id: string
  data: string // ISO date string (YYYY-MM-DD)
  tipo: string // "Extra", "Emergência", "Segurança Particular", etc.
  descricao: string
  horas: number
  valor: number
}

// Configuração financeira
export interface ConfigFinanceira {
  valorPlantaoDiaUtil: number
  valorPlantaoFimDeSemana: number
  valorPlantaoFeriado: number
  valorHoraExtra: number
}

// Escalas pré-definidas com seus padrões (3 principais)
export const ESCALAS_PREDEFINIDAS: Array<{
  label: string
  periodos: PeriodoEscala[]
}> = [
  {
    label: '24x72',
    periodos: [
      { horas: 24, tipo: 'trabalho' },
      { horas: 72, tipo: 'folga' },
    ],
  },
  {
    label: '12x36',
    periodos: [
      { horas: 12, tipo: 'trabalho' },
      { horas: 36, tipo: 'folga' },
    ],
  },
  {
    label: '24x48',
    periodos: [
      { horas: 24, tipo: 'trabalho' },
      { horas: 48, tipo: 'folga' },
    ],
  },
] as const

export type EscalaPadrao = typeof ESCALAS_PREDEFINIDAS[number]['label']

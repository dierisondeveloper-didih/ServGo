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

// Escalas pré-definidas com seus padrões
export const ESCALAS_PREDEFINIDAS: Array<{
  label: string
  periodos: PeriodoEscala[]
}> = [
  { 
    label: '24x72', 
    periodos: [
      { horas: 24, tipo: 'trabalho' },
      { horas: 72, tipo: 'folga' }
    ]
  },
  { 
    label: '12x36', 
    periodos: [
      { horas: 12, tipo: 'trabalho' },
      { horas: 36, tipo: 'folga' }
    ]
  },
  { 
    label: '12x48', 
    periodos: [
      { horas: 12, tipo: 'trabalho' },
      { horas: 48, tipo: 'folga' }
    ]
  },
  { 
    label: '24x48', 
    periodos: [
      { horas: 24, tipo: 'trabalho' },
      { horas: 48, tipo: 'folga' }
    ]
  },
  { 
    label: '12x24x12x72', 
    periodos: [
      { horas: 12, tipo: 'trabalho' },
      { horas: 24, tipo: 'folga' },
      { horas: 12, tipo: 'trabalho' },
      { horas: 72, tipo: 'folga' }
    ]
  },
  { 
    label: '6x1', 
    periodos: [
      { horas: 144, tipo: 'trabalho' }, // 6 dias = 144h
      { horas: 24, tipo: 'folga' }      // 1 dia = 24h
    ]
  },
  { 
    label: '5x2', 
    periodos: [
      { horas: 120, tipo: 'trabalho' }, // 5 dias = 120h
      { horas: 48, tipo: 'folga' }      // 2 dias = 48h
    ]
  },
] as const

export type EscalaPadrao = typeof ESCALAS_PREDEFINIDAS[number]['label']

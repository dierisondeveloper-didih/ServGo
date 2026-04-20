'use client'

// PORTAR PARA RN: Este seria o componente raiz com NavigationContainer
// Usar AsyncStorage em vez de localStorage

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Settings, Crown, RefreshCw, Plus } from 'lucide-react'
import { ESCALAS_PREDEFINIDAS, type EscalaConfig, type PeriodoEscala } from '@/lib/types'
import { gerarCalendarioMes, proximoPlantao, contarPlantoes, parseEscalaPersonalizada } from '@/lib/escala-utils'

const STORAGE_KEY = 'servgo_config'

export default function MeuTurnoApp() {
  const [config, setConfig] = useState<EscalaConfig | null>(null)
  const [mesAtual, setMesAtual] = useState(new Date())
  const [showConfig, setShowConfig] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Carregar config do localStorage
  useEffect(() => {
    // PORTAR PARA RN: usar AsyncStorage.getItem
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      parsed.primeiroPlantao = new Date(parsed.primeiroPlantao)
      setConfig(parsed)
    }
    setIsLoaded(true)
  }, [])

  // Salvar config no localStorage
  const salvarConfig = (novaConfig: EscalaConfig) => {
    // PORTAR PARA RN: usar AsyncStorage.setItem
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaConfig))
    setConfig(novaConfig)
    setShowConfig(false)
  }

  // Resetar configuração
  const resetConfig = () => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig(null)
    setShowConfig(false)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    )
  }

  // Tela de configuração inicial ou edição
  if (!config || showConfig) {
    return (
      <TelaConfiguracao
        configAtual={config}
        onSalvar={salvarConfig}
        onCancelar={() => setShowConfig(false)}
        onReset={resetConfig}
      />
    )
  }

  return (
    <TelaCalendario
      config={config}
      mesAtual={mesAtual}
      onMesChange={setMesAtual}
      onOpenConfig={() => setShowConfig(true)}
    />
  )
}

// ============================================
// TELA DE CONFIGURAÇÃO
// ============================================
function TelaConfiguracao({
  configAtual,
  onSalvar,
  onCancelar,
  onReset,
}: {
  configAtual: EscalaConfig | null
  onSalvar: (config: EscalaConfig) => void
  onCancelar: () => void
  onReset: () => void
}) {
  const [escala, setEscala] = useState(configAtual?.padrao || '')
  const [periodos, setPeriodos] = useState<PeriodoEscala[]>(configAtual?.periodos || [])
  const [horario, setHorario] = useState(configAtual?.horarioInicio || '07:00')
  const [primeiroPlantao, setPrimeiroPlantao] = useState(
    configAtual?.primeiroPlantao
      ? configAtual.primeiroPlantao.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [showCustom, setShowCustom] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [customError, setCustomError] = useState('')

  const handleSelectEscala = (label: string) => {
    const escalaInfo = ESCALAS_PREDEFINIDAS.find((e) => e.label === label)
    if (escalaInfo) {
      setEscala(label)
      setPeriodos([...escalaInfo.periodos])
      setShowCustom(false)
      setCustomError('')
    }
  }

  const handleCustomEscala = () => {
    const parsed = parseEscalaPersonalizada(customInput)
    if (parsed) {
      setEscala(customInput)
      setPeriodos(parsed)
      setCustomError('')
      setShowCustom(false)
    } else {
      setCustomError('Formato inválido. Use: 12x24x12x72')
    }
  }

  const handleSalvar = () => {
    if (!escala || periodos.length === 0) return

    onSalvar({
      padrao: escala,
      periodos,
      horarioInicio: horario,
      primeiroPlantao: new Date(primeiroPlantao + 'T12:00:00'),
    })
  }

  const isPredefinida = ESCALAS_PREDEFINIDAS.some(e => e.label === escala)

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-white flex flex-col shadow-2xl shadow-slate-200/50">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1B3A5C] via-[#1E4D78] to-[#163050] text-white px-4 py-8 relative overflow-hidden">
          {/* Efeito sutil de brilho no fundo */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#E67E22] opacity-[0.07] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F39C12] opacity-[0.05] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          {/* Logo grande e centralizada */}
          <div className="flex flex-col items-center gap-3 relative z-10">
            <img
              src="/logo-servgo.png"
              alt="ServGo"
              className="w-72 h-72 object-contain drop-shadow-xl"
            />
            <p className="text-blue-200/80 text-sm tracking-wide">
              {configAtual ? 'Altere suas configurações' : 'Configure sua escala de plantão'}
            </p>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-6 overflow-auto">
          {/* Seleção de Escala */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Qual sua escala?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ESCALAS_PREDEFINIDAS.map((e) => (
                <button
                  key={e.label}
                  onClick={() => handleSelectEscala(e.label)}
                  className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                    escala === e.label
                      ? 'border-[#E67E22] bg-gradient-to-br from-orange-50 to-amber-50 text-[#D35400] shadow-sm shadow-orange-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]'
                  }`}
                >
                  <span className="text-lg font-bold">{e.label}</span>
                </button>
              ))}

              {/* Botão para escala personalizada */}
              <button
                onClick={() => setShowCustom(true)}
                className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                  !isPredefinida && escala
                    ? 'border-[#E67E22] bg-gradient-to-br from-orange-50 to-amber-50 text-[#D35400] shadow-sm shadow-orange-100'
                    : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400'
                }`}
              >
                {!isPredefinida && escala ? (
                  <span className="text-lg font-bold">{escala}</span>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span className="text-sm font-medium">Personalizada</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Modal de escala personalizada */}
          {showCustom && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Digite sua escala
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Use o formato: trabalho x folga x trabalho x folga...
              </p>
              <input
                type="text"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value.toUpperCase().replace(/[^0-9X]/g, '').toLowerCase().replace(/x/g, 'x'))
                  setCustomError('')
                }}
                placeholder="Ex: 12x24x12x72"
                className="w-full p-3.5 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E67E22]/30 focus:border-[#E67E22] transition-all duration-200 bg-white font-mono"
              />
              {customError && (
                <p className="text-red-500 text-xs mt-2">{customError}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowCustom(false)
                    setCustomInput('')
                    setCustomError('')
                  }}
                  className="flex-1 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCustomEscala}
                  disabled={!customInput}
                  className="flex-1 py-2 rounded-xl bg-[#E67E22] text-white font-medium disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Visualização da escala selecionada */}
          {periodos.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50/80 to-orange-50/40 rounded-2xl p-4 border border-blue-100/60">
              <p className="text-xs text-[#1B3A5C] font-semibold mb-2 uppercase tracking-wide">Sua escala:</p>
              <div className="flex flex-wrap gap-2">
                {periodos.map((p, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      p.tipo === 'trabalho'
                        ? 'bg-gradient-to-r from-[#E67E22] to-[#D35400] text-white shadow-sm'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {p.horas}h {p.tipo === 'trabalho' ? 'trabalho' : 'folga'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data do primeiro plantão */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quando foi/será seu primeiro plantão?
            </label>
            <input
              type="date"
              value={primeiroPlantao}
              onChange={(e) => setPrimeiroPlantao(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E67E22]/30 focus:border-[#E67E22] transition-all duration-200 bg-white"
            />
          </div>

          {/* Horário de início */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Horário de entrada
            </label>
            <input
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E67E22]/30 focus:border-[#E67E22] transition-all duration-200 bg-white"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Botões */}
          <div className="flex flex-col gap-3 pb-4">
            <button
              onClick={handleSalvar}
              disabled={!escala || periodos.length === 0}
              className={`w-full py-4 rounded-2xl font-semibold transition-all duration-300 ${
                escala && periodos.length > 0
                  ? 'bg-gradient-to-r from-[#E67E22] to-[#D35400] text-white hover:shadow-lg hover:shadow-orange-200/50 active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {configAtual ? 'Salvar Alterações' : 'Começar'}
            </button>

            {configAtual && (
              <>
                <button
                  onClick={onCancelar}
                  className="w-full py-3 rounded-2xl font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={onReset}
                  className="w-full py-3 rounded-2xl font-medium text-red-500 hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resetar Configuração
                </button>
              </>
            )}
          </div>
        </div>

        {/* Premium Banner */}
        <div className="px-4 pb-6">
          <div className="bg-gradient-to-r from-[#1B3A5C] to-[#2C5F8A] rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-blue-900/10 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E67E22] opacity-[0.08] rounded-full blur-2xl" />
            <div className="w-12 h-12 bg-gradient-to-br from-[#E67E22] to-[#F39C12] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 relative z-10">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="font-semibold text-white text-[15px]">Versão Premium</p>
              <p className="text-xs text-blue-200/70 mt-0.5">
                Extras, permutas e mais. Em breve!
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-300/50 relative z-10" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TELA DO CALENDÁRIO
// ============================================
function TelaCalendario({
  config,
  mesAtual,
  onMesChange,
  onOpenConfig,
}: {
  config: EscalaConfig
  mesAtual: Date
  onMesChange: (data: Date) => void
  onOpenConfig: () => void
}) {
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  const diasCalendario = useMemo(
    () => gerarCalendarioMes(mesAtual.getFullYear(), mesAtual.getMonth(), config),
    [mesAtual, config]
  )

  const proximo = useMemo(() => proximoPlantao(config), [config])

  const plantoesMes = useMemo(() => {
    const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const fim = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
    return contarPlantoes(inicio, fim, config)
  }, [mesAtual, config])

  const navegarMes = (direcao: number) => {
    const novaData = new Date(mesAtual)
    novaData.setMonth(novaData.getMonth() + direcao)
    onMesChange(novaData)
  }

  const irParaHoje = () => {
    onMesChange(new Date())
  }

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const nomeMes = mesAtual.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-white flex flex-col shadow-2xl shadow-slate-200/50">
        {/* Header com info do próximo plantão */}
        <div className="bg-gradient-to-br from-[#1B3A5C] via-[#1E4D78] to-[#163050] text-white px-4 pt-5 pb-4 relative overflow-hidden">
          {/* Brilho sutil */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E67E22] opacity-[0.06] rounded-full blur-3xl" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <img
                src="/logo-servgo.png"
                alt="ServGo"
                className="w-20 h-20 object-contain drop-shadow-md"
              />
              <div>
                <p className="text-blue-300/70 text-xs uppercase tracking-widest">
                  Escala {config.padrao}
                </p>
                <h1 className="text-lg font-bold tracking-tight">ServGo</h1>
              </div>
            </div>
            <button
              onClick={onOpenConfig}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 border border-white/10"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Card próximo plantão */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 relative z-10">
            <p className="text-blue-200/70 text-xs mb-1 uppercase tracking-wide">Próximo plantão</p>
            <p className="font-semibold capitalize text-[15px]">{formatarData(proximo)}</p>
            <p className="text-blue-200/70 text-sm mt-1">
              Entrada às {config.horarioInicio}
            </p>
          </div>
        </div>

        {/* Navegação do mês */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100/80">
          <button
            onClick={() => navegarMes(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all duration-200 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <button
            onClick={irParaHoje}
            className="font-semibold text-slate-800 capitalize hover:text-[#E67E22] transition-colors duration-200 text-[15px]"
          >
            {nomeMes}
          </button>
          <button
            onClick={() => navegarMes(1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all duration-200 active:scale-95"
          >
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Calendário */}
        <div className="flex-1 px-4 py-2">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {diasSemana.map((dia, i) => (
              <div
                key={i}
                className="text-center text-xs font-medium text-slate-400 py-2"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Dias do mês */}
          <div className="grid grid-cols-7 gap-1">
            {diasCalendario.map((dia, i) => (
              <div
                key={i}
                className={`aspect-square flex items-center justify-center rounded-2xl text-sm relative transition-all duration-200 ${
                  !dia.isCurrentMonth
                    ? 'text-slate-300'
                    : dia.isPlantao
                    ? 'bg-gradient-to-br from-[#E67E22] to-[#D35400] text-white font-semibold shadow-sm shadow-orange-200/50'
                    : 'text-slate-700 hover:bg-slate-50'
                } ${
                  dia.isToday && !dia.isPlantao
                    ? 'ring-2 ring-[#E67E22] ring-offset-2 font-semibold'
                    : ''
                } ${
                  dia.isToday && dia.isPlantao
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#E67E22] scale-110'
                    : ''
                }`}
              >
                {dia.dia}
              </div>
            ))}
          </div>
        </div>

        {/* Resumo do mês */}
        <div className="px-4 py-4 border-t border-slate-100/80">
          <div className="bg-gradient-to-r from-slate-50 to-orange-50/30 rounded-2xl p-4 flex items-center justify-between border border-slate-100/60">
            <div>
              <p className="text-sm text-slate-500">Plantões neste mês</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{plantoesMes}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-[#E67E22] to-[#D35400] shadow-sm" />
              <span className="text-xs text-slate-500 font-medium">= Plantão</span>
            </div>
          </div>
        </div>

        {/* Premium Banner */}
        <div className="px-4 pb-6">
          <div className="bg-gradient-to-r from-[#1B3A5C] to-[#2C5F8A] rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-blue-900/10 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E67E22] opacity-[0.08] rounded-full blur-2xl" />
            <div className="w-12 h-12 bg-gradient-to-br from-[#E67E22] to-[#F39C12] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 relative z-10">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="font-semibold text-white text-[15px]">Controle Financeiro</p>
              <p className="text-xs text-blue-200/70 mt-0.5">
                Extras, permutas e relatórios. Em breve!
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-300/50 relative z-10" />
          </div>
        </div>
      </div>
    </div>
  )
}

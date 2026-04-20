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
      primeiroPlantao: new Date(primeiroPlantao),
    })
  }

  const isPredefinida = ESCALAS_PREDEFINIDAS.some(e => e.label === escala)

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="bg-[#1B4F72] text-white px-4 py-6">
          {!configAtual && (
            <div className="flex justify-center mb-3">
              <img src="/logo-servgo.png" alt="ServGo" width={80} height={80} />
            </div>
          )}
          {configAtual && (
            <h1 className="text-xl font-bold">Editar Escala</h1>
          )}
          <p className="text-blue-100 text-sm mt-1">
            {configAtual
              ? 'Altere suas configurações'
              : 'Configure sua escala de plantão'}
          </p>
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
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    escala === e.label
                      ? 'border-[#E67E22] bg-orange-50 text-[#E67E22]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg font-bold">{e.label}</span>
                </button>
              ))}

              {/* Botão para escala personalizada */}
              <button
                onClick={() => setShowCustom(true)}
                className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  !isPredefinida && escala
                    ? 'border-[#E67E22] bg-orange-50 text-[#E67E22]'
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
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
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
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E67E22] font-mono"
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
                  className="flex-1 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCustomEscala}
                  disabled={!customInput}
                  className="flex-1 py-2 rounded-lg bg-[#E67E22] text-white font-medium disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Visualização da escala selecionada */}
          {periodos.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4 border border-orange-200">
              <p className="text-xs text-[#1B4F72] font-medium mb-2">Sua escala:</p>
              <div className="flex flex-wrap gap-2">
                {periodos.map((p, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      p.tipo === 'trabalho'
                        ? 'bg-[#E67E22] text-white'
                        : 'bg-slate-200 text-slate-600'
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
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
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
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Botões */}
          <div className="flex flex-col gap-3 pb-4">
            <button
              onClick={handleSalvar}
              disabled={!escala || periodos.length === 0}
              className={`w-full py-4 rounded-xl font-semibold transition-all ${
                escala && periodos.length > 0
                  ? 'bg-[#E67E22] text-white hover:bg-[#D35400]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {configAtual ? 'Salvar Alterações' : 'Começar'}
            </button>

            {configAtual && (
              <>
                <button
                  onClick={onCancelar}
                  className="w-full py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={onReset}
                  className="w-full py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 flex items-center justify-center gap-2"
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
          <div className="bg-gradient-to-r from-blue-100 to-[#FDE8D0] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E67E22] rounded-full flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#1B4F72]">Versão Premium</p>
              <p className="text-xs text-orange-700">
                Extras, permutas e mais. Em breve!
              </p>
            </div>
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
      <div className="w-full max-w-[430px] min-h-screen bg-white flex flex-col">
        {/* Header com info do próximo plantão */}
        <div className="bg-[#1B4F72] text-white px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/logo-servgo.png" alt="ServGo" width={36} height={36} />
              <p className="text-blue-200 text-xs uppercase tracking-wide">
                Escala {config.padrao}
              </p>
            </div>
            <button
              onClick={onOpenConfig}
              className="w-10 h-10 rounded-full bg-[#E67E22] flex items-center justify-center hover:bg-[#E67E22] transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Card próximo plantão */}
          <div className="bg-[#164262] rounded-xl p-4">
            <p className="text-blue-200 text-xs mb-1">Próximo plantão</p>
            <p className="font-semibold capitalize">{formatarData(proximo)}</p>
            <p className="text-blue-200 text-sm mt-1">
              Entrada às {config.horarioInicio}
            </p>
          </div>
        </div>

        {/* Navegação do mês */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button
            onClick={() => navegarMes(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={irParaHoje}
            className="font-semibold text-slate-800 capitalize hover:text-[#1B4F72] transition-colors"
          >
            {nomeMes}
          </button>
          <button
            onClick={() => navegarMes(1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
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
                className={`aspect-square flex items-center justify-center rounded-full text-sm relative ${
                  !dia.isCurrentMonth
                    ? 'text-slate-300'
                    : dia.isPlantao
                    ? 'bg-[#E67E22] text-white font-semibold'
                    : 'text-slate-700'
                } ${
                  dia.isToday && !dia.isPlantao
                    ? 'ring-2 ring-[#E67E22] ring-offset-2'
                    : ''
                } ${
                  dia.isToday && dia.isPlantao
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#E67E22]'
                    : ''
                }`}
              >
                {dia.dia}
              </div>
            ))}
          </div>
        </div>

        {/* Resumo do mês */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Plantões neste mês</p>
              <p className="text-2xl font-bold text-slate-800">{plantoesMes}</p>
            </div>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-[#E67E22]" />
              <span className="text-xs text-slate-500">= Plantão</span>
            </div>
          </div>
        </div>

        {/* Premium Banner */}
        <div className="px-4 pb-6">
          <div className="bg-gradient-to-r from-blue-100 to-[#FDE8D0] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E67E22] rounded-full flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#1B4F72]">Controle Financeiro</p>
              <p className="text-xs text-orange-700">
                Extras, permutas e relatórios. Em breve!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

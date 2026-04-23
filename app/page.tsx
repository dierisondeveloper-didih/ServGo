'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, Settings, Plus, Check,
  Home, CalendarRange, CalendarDays, DollarSign, Star, Bell,
  ArrowLeft, FileText, Trash2, User, Clock, Heart,
} from 'lucide-react'
import {
  ESCALAS_PREDEFINIDAS,
  type EscalaConfig,
  type PeriodoEscala,
  type DiaCalendario,
  type ExtraServico,
  type ConfigFinanceira,
} from '@/lib/types'
import {
  gerarCalendarioMes,
  proximoPlantao,
  contarPlantoes,
  parseEscalaPersonalizada,
  isPlantao as isPlantaoFn,
} from '@/lib/escala-utils'

const STORAGE_CONFIG     = 'servgo_config'
const STORAGE_NAME       = 'servgo_userName'
const STORAGE_EXTRAS     = 'servgo_extras'
const STORAGE_FINANCEIRO = 'servgo_financeiro'

type TabType = 'home' | 'servgo' | 'config'

const DEFAULT_FINANCEIRO: ConfigFinanceira = {
  valorPlantaoDiaUtil:      500,
  valorPlantaoFimDeSemana:  650,
  valorPlantaoFeriado:      800,
  valorHoraExtra:           50,
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
export default function MeuTurnoApp() {
  const [config,           setConfig]           = useState<EscalaConfig | null>(null)
  const [userName,         setUserName]         = useState<string | null>(null)
  const [activeTab,        setActiveTab]        = useState<TabType>('home')
  const [extras,           setExtras]           = useState<ExtraServico[]>([])
  const [configFinanceira, setConfigFinanceira] = useState<ConfigFinanceira>(DEFAULT_FINANCEIRO)
  const [mesAtual,         setMesAtual]         = useState(new Date())
  const [isLoaded,         setIsLoaded]         = useState(false)

  useEffect(() => {
    const savedName       = localStorage.getItem(STORAGE_NAME)
    const savedConfig     = localStorage.getItem(STORAGE_CONFIG)
    const savedExtras     = localStorage.getItem(STORAGE_EXTRAS)
    const savedFinanceiro = localStorage.getItem(STORAGE_FINANCEIRO)

    if (savedName) setUserName(savedName)
    if (savedConfig) {
      const parsed  = JSON.parse(savedConfig)
      const raw     = String(parsed.primeiroPlantao)
      const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw
      parsed.primeiroPlantao = new Date(dateOnly + 'T12:00:00')
      setConfig(parsed)
    }
    if (savedExtras)     setExtras(JSON.parse(savedExtras))
    if (savedFinanceiro) setConfigFinanceira({ ...DEFAULT_FINANCEIRO, ...JSON.parse(savedFinanceiro) })
    setIsLoaded(true)
  }, [])

  const salvarConfig = (novaConfig: EscalaConfig) => {
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(novaConfig))
    setConfig(novaConfig)
  }

  const resetConfig = () => {
    localStorage.removeItem(STORAGE_CONFIG)
    localStorage.removeItem(STORAGE_EXTRAS)
    localStorage.removeItem(STORAGE_FINANCEIRO)
    setConfig(null)
    setExtras([])
    setConfigFinanceira(DEFAULT_FINANCEIRO)
    setActiveTab('home')
  }

  const salvarUserName = (nome: string) => {
    localStorage.setItem(STORAGE_NAME, nome)
    setUserName(nome)
  }

  const handleAddExtra = (extra: ExtraServico) => {
    const novos = [...extras, extra]
    setExtras(novos)
    localStorage.setItem(STORAGE_EXTRAS, JSON.stringify(novos))
  }

  const handleDeleteExtra = (id: string) => {
    const novos = extras.filter(e => e.id !== id)
    setExtras(novos)
    localStorage.setItem(STORAGE_EXTRAS, JSON.stringify(novos))
  }

  const handleUpdateFinanceiro = (nova: ConfigFinanceira) => {
    setConfigFinanceira(nova)
    localStorage.setItem(STORAGE_FINANCEIRO, JSON.stringify(nova))
  }

  const extrasDoMes = useMemo(() => {
    return extras.filter(e => {
      const d = new Date(e.data + 'T12:00:00')
      return d.getMonth() === mesAtual.getMonth() && d.getFullYear() === mesAtual.getFullYear()
    })
  }, [extras, mesAtual])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="animate-pulse text-[#6B7280]">Carregando...</div>
      </div>
    )
  }

  if (!userName) {
    return <TelaBoasVindas onContinuar={salvarUserName} />
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F5F5F0] flex flex-col shadow-2xl shadow-slate-200/50 relative">
        <div className="flex-1 overflow-y-auto pb-20">
          {activeTab === 'home' && (
            <TelaHome
              config={config}
              userName={userName}
              mesAtual={mesAtual}
              onMesChange={setMesAtual}
              extras={extras}
              extrasDoMes={extrasDoMes}
              onSalvarConfig={salvarConfig}
              onAddExtra={handleAddExtra}
              onNavigateFinanceiro={() => setActiveTab('servgo')}
            />
          )}
          {activeTab === 'servgo' && (
            <TelaFinanceiroDetalhes
              config={config}
              userName={userName}
              extras={extras}
              extrasDoMes={extrasDoMes}
              mesAtual={mesAtual}
              configFinanceira={configFinanceira}
              onBack={() => setActiveTab('home')}
              onUpdateFinanceiro={handleUpdateFinanceiro}
              onDeleteExtra={handleDeleteExtra}
            />
          )}
          {activeTab === 'config' && (
            <TelaConfig
              userName={userName}
              config={config}
              onResetConfig={resetConfig}
              onUpdateName={salvarUserName}
            />
          )}
        </div>
        <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BOTTOM BAR
// ─────────────────────────────────────────────
function BottomBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType
  onTabChange: (t: TabType) => void
}) {
  const tabs: { id: TabType; label: string; Icon: React.ElementType }[] = [
    { id: 'home',   label: 'Home',   Icon: Home          },
    { id: 'servgo', label: 'ServGO', Icon: CalendarRange  },
    { id: 'config', label: 'Config', Icon: Settings       },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-200/60 z-50">
      <div className="flex items-center justify-around px-2 pt-2 pb-6">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-1 px-6 py-1.5 rounded-xl transition-all duration-200 ${
                isActive ? 'text-[#C5993A]' : 'text-[#9CA3AF]'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA DE BOAS-VINDAS (NÃO MODIFICAR)
// ─────────────────────────────────────────────
function TelaBoasVindas({ onContinuar }: { onContinuar: (nome: string) => void }) {
  const [nome, setNome] = useState('')

  const handleContinuar = () => {
    if (nome.trim().length >= 2) onContinuar(nome.trim())
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex justify-center overflow-hidden">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col">

        {/* ═══ SEÇÃO SUPERIOR — Fundo claro com logo ═══ */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(160deg, #ffffff 0%, #FAF8F5 50%, #F5F0E8 100%)', minHeight: '52vh' }}>

          {/* Orbs dourados suaves */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#C5993A] opacity-[0.06] rounded-full blur-[100px]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4872C] opacity-[0.05] rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#C5993A] opacity-[0.04] rounded-full blur-[70px] translate-y-1/3 -translate-x-1/4" />
          </div>

          {/* Conteúdo: logo + slogan */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 py-12">

            {/* Logo */}
            <div
              className="mb-5"
              style={{ opacity: 0, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards' }}
            >
              <img
                src="/logo-servgo.png"
                alt="ServGo"
                className="w-64 h-64 object-contain drop-shadow-sm"
              />
            </div>

            {/* Slogan */}
            <div
              className="flex items-center gap-3"
              style={{ opacity: 0, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards' }}
            >
              <div className="w-6 h-px bg-gradient-to-r from-transparent to-[#C5993A]/50" />
              <p className="text-[#C5993A] text-[11px] tracking-[0.25em] uppercase font-semibold">
                Seu serviço na palma da mão
              </p>
              <div className="w-6 h-px bg-gradient-to-l from-transparent to-[#C5993A]/50" />
            </div>
          </div>
        </div>

        {/* ═══ SEÇÃO INFERIOR — Form ═══ */}
        <div className="flex-1 bg-[#F5F5F0] px-8 pb-8 pt-8 flex flex-col justify-between">

          <div>
            {/* Bem Vindo */}
            <div
              className="mb-8"
              style={{ opacity: 0, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards' }}
            >
              <h1 className="text-[32px] font-bold text-[#2C3E50] leading-tight">Bem Vindo!</h1>
              <p className="text-[#6B7280] text-[15px] mt-2">Para começarmos, digite o seu nome:</p>
            </div>

            {/* Input */}
            <div
              className="mb-6"
              style={{ opacity: 0, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards' }}
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#C5993A]/0 via-[#C5993A]/20 to-[#D4872C]/0 rounded-[20px] blur-md opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && nome.trim().length >= 2) handleContinuar() }}
                  placeholder="Digite seu nome"
                  className="relative w-full px-6 py-4 bg-white border-2 border-slate-200/80 rounded-2xl text-[#2C3E50] text-lg font-medium placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-[#C5993A] focus:shadow-xl focus:shadow-[#C5993A]/8 transition-all duration-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Botão */}
            <div style={{ opacity: 0, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.1s forwards' }}>
              <button
                onClick={handleContinuar}
                disabled={nome.trim().length < 2}
                className={`w-full py-4 rounded-2xl font-bold text-[16px] tracking-wide transition-all duration-500 ${
                  nome.trim().length >= 2
                    ? 'bg-gradient-to-r from-[#C5993A] via-[#D4872C] to-[#C5993A] text-white shadow-2xl shadow-[#C5993A]/30 active:scale-[0.97]'
                    : 'bg-slate-200/60 text-slate-400 cursor-not-allowed'
                }`}
              >
                Continuar
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex flex-col items-center gap-2 pt-6"
            style={{ opacity: 0, animation: 'fadeIn 0.6s ease-out 1.5s forwards' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#C5993A]/30" />
              <div className="w-1 h-1 rounded-full bg-[#C5993A]/50" />
              <div className="w-1 h-1 rounded-full bg-[#C5993A]/30" />
            </div>
            <p className="text-[10px] text-slate-400/60 tracking-[0.2em] uppercase font-medium">
              por iVertice Digital
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA HOME
// ─────────────────────────────────────────────
function TelaHome({
  config,
  userName,
  mesAtual,
  onMesChange,
  extras,
  extrasDoMes,
  onSalvarConfig,
  onAddExtra,
  onNavigateFinanceiro,
}: {
  config: EscalaConfig | null
  userName: string
  mesAtual: Date
  onMesChange: (d: Date) => void
  extras: ExtraServico[]
  extrasDoMes: ExtraServico[]
  onSalvarConfig: (c: EscalaConfig) => void
  onAddExtra: (e: ExtraServico) => void
  onNavigateFinanceiro: () => void
}) {
  // ── Config form state ──
  const [escala,          setEscala]          = useState(config?.padrao || '')
  const [periodos,        setPeriodos]        = useState<PeriodoEscala[]>(config?.periodos ? [...config.periodos] : [])
  const [horario,         setHorario]         = useState(config?.horarioInicio || '07:00')
  const [primeiroPlantao, setPrimeiroPlantao] = useState(() => {
    if (!config?.primeiroPlantao) return formatDate(new Date())
    const d = config.primeiroPlantao instanceof Date
      ? config.primeiroPlantao
      : new Date(String(config.primeiroPlantao).split('T')[0] + 'T12:00:00')
    return formatDate(d)
  })
  const [showCustom,  setShowCustom]  = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [customError, setCustomError] = useState('')

  // ── Escala card ──
  const [escalaExpanded, setEscalaExpanded] = useState(!config)

  // ── Extra modal state ──
  const [showExtraModal, setShowExtraModal] = useState(false)
  const [diaSelecionado, setDiaSelecionado] = useState<DiaCalendario | null>(null)

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState('')
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2500)
  }

  // Sync form state when config changes externally
  useEffect(() => {
    if (config) {
      setEscala(config.padrao)
      setPeriodos([...config.periodos])
      setHorario(config.horarioInicio)
      const d = config.primeiroPlantao instanceof Date
        ? config.primeiroPlantao
        : new Date(String(config.primeiroPlantao).split('T')[0] + 'T12:00:00')
      setPrimeiroPlantao(formatDate(d))
    }
  }, [config])

  // ── Calendar ──
  const diasCalendario = useMemo(
    () => config ? gerarCalendarioMes(mesAtual.getFullYear(), mesAtual.getMonth(), config) : [],
    [mesAtual, config]
  )

  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const proximo = useMemo(() => config ? proximoPlantao(config) : null, [config])

  // Bell badge: plantões nos próximos 7 dias
  const proximosPlantoes = useMemo(() => {
    if (!config) return 0
    let count = 0
    const hoje = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i, 12, 0, 0)
      if (isPlantaoFn(d, config)) count++
    }
    return count
  }, [config])

  // ── Form helpers ──
  const isPredefinida = ESCALAS_PREDEFINIDAS.some(e => e.label === escala)

  const savedPrimeiroPlantao = useMemo(() => {
    if (!config?.primeiroPlantao) return ''
    const d = config.primeiroPlantao instanceof Date
      ? config.primeiroPlantao
      : new Date(String(config.primeiroPlantao).split('T')[0] + 'T12:00:00')
    return formatDate(d)
  }, [config])

  const configChanged = !config
    ? escala !== '' && periodos.length > 0
    : escala !== config.padrao ||
      horario !== config.horarioInicio ||
      primeiroPlantao !== savedPrimeiroPlantao

  const handleSelectEscala = (label: string) => {
    const info = ESCALAS_PREDEFINIDAS.find(e => e.label === label)
    if (info) {
      setEscala(label)
      setPeriodos([...info.periodos])
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
    onSalvarConfig({
      padrao: escala,
      periodos,
      horarioInicio: horario,
      primeiroPlantao: new Date(primeiroPlantao + 'T12:00:00'),
    })
    setEscalaExpanded(false)
  }

  const navegarMes = (dir: number) => {
    const d = new Date(mesAtual)
    d.setMonth(d.getMonth() + dir)
    onMesChange(d)
  }

  const primeiroNome = userName.split(' ')[0]

  return (
    <div className="flex-1 bg-[#F5F5F0]">

      {/* ── HEADER ── */}
      <div className="bg-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <img src="/logo-servgo.png" alt="ServGo" className="h-20 w-auto object-contain" />
          <button className="relative p-2">
            <Bell className="w-6 h-6 text-[#2C3E50]" />
            {proximosPlantoes > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C5993A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {proximosPlantoes}
              </span>
            )}
          </button>
        </div>
        <h1 className="text-2xl font-bold text-[#2C3E50]">Olá, {primeiroNome}</h1>

        {/* Próximo plantão */}
        {config && proximo && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
            <p className="text-sm text-[#6B7280]">
              Próximo serviço:{' '}
              <span className="font-semibold text-[#2C3E50] capitalize">
                {proximo.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                {' às '}
                {config.horarioInicio}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── CARD DE ESCALA — Recolhível ── */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fadeInUp">

          {/* Header clicável */}
          <button
            onClick={() => setEscalaExpanded(!escalaExpanded)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-[#2C3E50]" />
              <div className="text-left">
                <span className="font-semibold text-[#2C3E50] text-sm">
                  {config ? `Escala ${config.padrao}` : 'Qual sua escala de serviço?'}
                </span>
                {config && !escalaExpanded && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Entrada às {config.horarioInicio} • Toque para alterar
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${escalaExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Conteúdo expansível */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${escalaExpanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">

              {/* 3 escalas predefinidas */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {ESCALAS_PREDEFINIDAS.map((e) => (
                  <button
                    key={e.label}
                    onClick={() => handleSelectEscala(e.label)}
                    className={`py-3 rounded-xl border-2 text-center transition-all duration-200 flex items-center justify-center gap-1 ${
                      escala === e.label
                        ? 'border-[#C5993A] bg-[#C5993A]/5 text-[#2C3E50] font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-semibold">{e.label}</span>
                    {escala === e.label && (
                      <span className="ml-1 inline-flex w-4 h-4 bg-[#C5993A] rounded-full items-center justify-center align-middle">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Personalizada */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => setShowCustom(true)}
                  className={`px-5 py-2 rounded-xl border-2 border-dashed text-sm font-medium transition-all ${
                    !isPredefinida && escala
                      ? 'border-[#C5993A] bg-[#C5993A]/5 text-[#2C3E50]'
                      : 'border-slate-300 text-slate-500 hover:border-[#C5993A]/50 hover:text-[#C5993A]'
                  }`}
                >
                  {!isPredefinida && escala ? `✓ ${escala}` : '+ Personalizada'}
                </button>
              </div>

              {/* Custom escala input */}
              {showCustom && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4">
                  <p className="text-sm font-medium text-[#2C3E50] mb-1">Digite sua escala</p>
                  <p className="text-xs text-slate-400 mb-3">Formato: trabalho x folga... Ex: 12x24x12x72</p>
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => { setCustomInput(e.target.value.replace(/[^0-9xX]/g, '').toLowerCase()); setCustomError('') }}
                    placeholder="Ex: 12x24x12x72"
                    className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] font-mono focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] bg-white"
                  />
                  {customError && <p className="text-red-500 text-xs mt-1">{customError}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setShowCustom(false); setCustomInput(''); setCustomError('') }}
                      className="flex-1 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm">Cancelar</button>
                    <button onClick={handleCustomEscala} disabled={!customInput}
                      className="flex-1 py-2 rounded-xl bg-[#C5993A] text-white font-medium text-sm disabled:opacity-50">Confirmar</button>
                  </div>
                </div>
              )}

              {/* Inputs de data e horário */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Primeiro dia de serviço</label>
                  <input type="date" value={primeiroPlantao} onChange={(e) => setPrimeiroPlantao(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] transition-all bg-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Horário de entrada</label>
                  <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] transition-all bg-white" />
                </div>
                <button
                  onClick={handleSalvar}
                  disabled={!escala || periodos.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white font-semibold rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CALENDÁRIO ── */}
      {config && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            {/* Nav do mês */}
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => navegarMes(-1)}
                className="p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-slate-500" />
              </button>
              <button
                onClick={() => onMesChange(new Date())}
                className="font-bold text-[#2C3E50] capitalize text-base hover:text-[#C5993A] transition-colors"
              >
                {nomeMes}
              </button>
              <button
                onClick={() => navegarMes(1)}
                className="p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 px-3">
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} className="text-center text-xs font-bold text-[#9CA3AF] py-2 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1 px-3 pb-3">
              {diasCalendario.map((dia, i) => {
                const hasExtra = extras.some(e => e.data === formatDate(dia.data))

                let dayClass = ''
                let bgClass  = ''
                let showDot  = false
                let dotColor = ''

                if (!dia.isCurrentMonth) {
                  dayClass = 'text-slate-200'
                } else if (hasExtra) {
                  dayClass = 'text-white font-semibold'
                  bgClass  = 'bg-[#2C3E50]'
                } else if (dia.isPlantao && dia.isFeriado) {
                  dayClass = 'text-white font-semibold'
                  bgClass  = 'bg-[#2E7D32]'
                  showDot  = true
                  dotColor = 'bg-white'
                } else if (dia.isPlantao && dia.isFimDeSemana) {
                  dayClass = 'text-white font-semibold'
                  bgClass  = 'bg-[#2E7D32]'
                } else if (dia.isPlantao) {
                  dayClass = 'text-white font-semibold'
                  bgClass  = 'bg-[#4CAF50]'
                } else if (dia.isFeriado) {
                  dayClass = 'text-[#E91E63] font-medium'
                  showDot  = true
                  dotColor = 'bg-[#E91E63]'
                } else if (dia.isFimDeSemana) {
                  dayClass = 'text-slate-400'
                } else {
                  dayClass = 'text-[#2C3E50]'
                }

                const todayClass = dia.isToday ? 'ring-2 ring-[#C5993A] ring-offset-1' : ''

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (dia.isCurrentMonth) {
                        setDiaSelecionado(dia)
                        setShowExtraModal(true)
                      }
                    }}
                    disabled={!dia.isCurrentMonth}
                    title={dia.isFeriado ? dia.nomeFeriado : undefined}
                    className={`aspect-square flex flex-col items-center justify-center relative transition-all duration-150 active:scale-90 ${dayClass}`}
                  >
                    {bgClass && (
                      <span className={`absolute w-8 h-8 rounded-full ${bgClass} ${todayClass} opacity-95`} />
                    )}
                    {!bgClass && dia.isToday && (
                      <span className="absolute w-8 h-8 rounded-full ring-2 ring-[#C5993A] ring-offset-1" />
                    )}
                    <span className="relative z-10 text-sm">{dia.dia}</span>
                    {showDot && (
                      <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${dotColor} z-10`} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#4CAF50]" />
                <span className="text-xs text-slate-500">Escalado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-500">Folga</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#2C3E50]" />
                <span className="text-xs text-slate-500">Extra</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#E91E63]" />
                <span className="text-xs text-slate-500">Feriado</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD EXTRAS DO MÊS ── */}
      {config && (
        <div className="px-4 mt-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#4CAF50] rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Extras do mês</p>
                  <p className="text-xl font-bold text-[#2C3E50]">
                    {formatarMoeda(extrasDoMes.reduce((s, e) => s + e.valor, 0))}
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateFinanceiro}
                className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-all"
              >
                Ver detalhes
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 px-4 pb-3 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2 flex-1">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">Extras: {extrasDoMes.length} dias</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Star className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">
                  Média:{' '}
                  {formatarMoeda(
                    extrasDoMes.length > 0
                      ? extrasDoMes.reduce((s, e) => s + e.valor, 0) / extrasDoMes.length
                      : 0
                  )}
                </span>
              </div>
            </div>

            <p className="px-4 pb-3 text-xs text-slate-400 italic">
              O total acima refere-se apenas às escalas extras deste mês.
            </p>
          </div>
        </div>
      )}

      {/* ── MODAL ADICIONAR EXTRA ── */}
      <ModalAdicionarExtra
        isOpen={showExtraModal}
        onClose={() => { setShowExtraModal(false); setDiaSelecionado(null) }}
        dia={diaSelecionado}
        extras={extras}
        onSave={(extra) => {
          onAddExtra(extra)
          showToast('Extra adicionado com sucesso!')
          setShowExtraModal(false)
          setDiaSelecionado(null)
        }}
        onDelete={(id) => {
          setShowExtraModal(false)
        }}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-4 right-4 z-[60] flex justify-center animate-fadeInUp">
          <div className="bg-[#2C3E50] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-[350px]">
            <Check className="w-5 h-5 text-[#4CAF50]" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL ADICIONAR EXTRA
// ─────────────────────────────────────────────
function ModalAdicionarExtra({
  isOpen,
  onClose,
  dia,
  extras,
  onSave,
  onDelete,
}: {
  isOpen: boolean
  onClose: () => void
  dia: DiaCalendario | null
  extras: ExtraServico[]
  onSave: (extra: ExtraServico) => void
  onDelete: (id: string) => void
}) {
  const [descricao, setDescricao] = useState('')
  const [horas,     setHoras]     = useState('')
  const [valor,     setValor]     = useState('')

  if (!isOpen || !dia) return null

  const tipo = 'Extra'

  const diaKey = formatDate(dia.data)
  const extraExistente = extras.find(e => e.data === diaKey)

  const handleSave = () => {
    onSave({
      id: Date.now().toString(),
      data: diaKey,
      tipo,
      descricao,
      horas: Number(horas) || 0,
      valor: Number(valor) || 0,
    })
    setDescricao('')
    setHoras('')
    setValor('')
  }

  const dataFormatada = dia.data.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slideUp max-h-[85vh] overflow-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          <h3 className="text-lg font-bold text-[#2C3E50] mb-1">Adicionar serviço extra</h3>
          <p className="text-sm text-slate-500 capitalize mb-5">{dataFormatada}</p>

          {dia.isFeriado && (
            <div className="bg-[#E91E63]/10 border border-[#E91E63]/20 rounded-xl px-3 py-2 mb-4">
              <p className="text-sm text-[#E91E63] font-medium">🎉 Feriado: {dia.nomeFeriado}</p>
            </div>
          )}

          {extraExistente && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-500 mb-1">Extra já registrado neste dia:</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2C3E50]">
                  {extraExistente.tipo} — {formatarMoeda(extraExistente.valor)}
                </p>
                <button
                  onClick={() => { onDelete(extraExistente.id); onClose() }}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          )}

          <label className="text-sm font-medium text-[#2C3E50] mb-2 block">Descrição (opcional)</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Cobertura, segurança particular..."
            className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] mb-4 focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A]"
          />

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="text-sm font-medium text-[#2C3E50] mb-2 block">Horas</label>
              <input
                type="number"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                placeholder="12"
                className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#2C3E50] mb-2 block">Valor (R$)</label>
              <input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="450.00"
                className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A]"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!horas || !valor}
            className="w-full py-3.5 bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white font-semibold rounded-xl shadow-lg disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition-all"
          >
            Salvar
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 mt-2 text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// EXPORTAR PDF
// ─────────────────────────────────────────────
function exportarRelatorioPDF({
  userName,
  config,
  mesAtual,
  diasCalendario,
  extrasDoMes,
  configFinanceira,
  plantoesDiaUtil,
  plantoesFS,
  plantoesFeriado,
  subtotalEscala,
  subtotalExtras,
  receitaTotal,
}: {
  userName: string
  config: EscalaConfig
  mesAtual: Date
  diasCalendario: DiaCalendario[]
  extrasDoMes: ExtraServico[]
  configFinanceira: ConfigFinanceira
  plantoesDiaUtil: number
  plantoesFS: number
  plantoesFeriado: number
  subtotalEscala: number
  subtotalExtras: number
  receitaTotal: number
}) {
  // @ts-ignore — jsPDF carregado via CDN
  const { jsPDF } = window.jspdf
  if (!jsPDF) { alert('Biblioteca PDF ainda está carregando. Tente novamente em instantes.'); return }
  const doc = new jsPDF()

  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Header
  doc.setFillColor(44, 62, 80)
  doc.rect(0, 0, 210, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('ServGo', 15, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório Financeiro', 15, 27)
  doc.text(nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1), 145, 18)
  doc.text(userName, 145, 27)

  doc.setTextColor(44, 62, 80)
  let y = 45

  // Escala info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Escala: ' + config.padrao, 15, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Horário de entrada: ' + config.horarioInicio, 15, y + 7)
  y += 20

  doc.setDrawColor(200, 200, 200)
  doc.line(15, y, 195, y)
  y += 10

  // Resumo de plantões
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo de Plantões', 15, y)
  y += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const totalPlantoes = plantoesDiaUtil + plantoesFS + plantoesFeriado
  const linhas: [string, string][] = [
    ['Total de plantões no mês:', String(totalPlantoes)],
    ['Plantões em dia útil:', String(plantoesDiaUtil)],
    ['Plantões em fim de semana:', String(plantoesFS)],
    ['Plantões em feriado:', String(plantoesFeriado)],
    ['Extras realizados:', String(extrasDoMes.length)],
  ]
  for (const [label, val] of linhas) {
    doc.text(label, 15, y)
    doc.setFont('helvetica', 'bold')
    doc.text(val, 95, y)
    doc.setFont('helvetica', 'normal')
    y += 7
  }
  y += 5

  doc.line(15, y, 195, y)
  y += 10

  // Detalhamento financeiro
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalhamento Financeiro', 15, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Tipo', 15, y)
  doc.text('Qtd', 90, y)
  doc.text('Valor unit.', 115, y)
  doc.text('Subtotal', 162, y)
  doc.setFont('helvetica', 'normal')
  y += 2
  doc.line(15, y, 195, y)
  y += 7

  const linhasTabela: [string, number, number][] = [
    ['Plantão dia útil',       plantoesDiaUtil, configFinanceira.valorPlantaoDiaUtil],
    ['Plantão fim de semana',  plantoesFS,      configFinanceira.valorPlantaoFimDeSemana],
    ['Plantão feriado',        plantoesFeriado, configFinanceira.valorPlantaoFeriado],
  ]
  for (const [nome, qtd, val] of linhasTabela) {
    doc.text(nome, 15, y)
    doc.text(String(qtd), 90, y)
    doc.text(fmtMoeda(val), 115, y)
    doc.text(fmtMoeda(qtd * val), 162, y)
    y += 7
  }
  y += 3
  doc.line(15, y, 195, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Subtotal escala regular', 15, y)
  doc.text(fmtMoeda(subtotalEscala), 162, y)
  y += 15

  // Extras
  if (extrasDoMes.length > 0) {
    doc.setFontSize(12)
    doc.text('Extras / Serviços Adicionais', 15, y)
    y += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Data', 15, y)
    doc.text('Tipo', 45, y)
    doc.text('Horas', 110, y)
    doc.text('Valor', 162, y)
    doc.setFont('helvetica', 'normal')
    y += 2
    doc.line(15, y, 195, y)
    y += 7

    for (const extra of extrasDoMes) {
      if (y > 260) { doc.addPage(); y = 20 }
      const dataFmt = new Date(extra.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      doc.text(dataFmt, 15, y)
      doc.text(extra.tipo, 45, y)
      doc.text(extra.horas + 'h', 110, y)
      doc.text(fmtMoeda(extra.valor), 162, y)
      y += 7
    }
    y += 3
    doc.line(15, y, 195, y)
    y += 7
    doc.setFont('helvetica', 'bold')
    doc.text('Subtotal extras', 15, y)
    doc.text(fmtMoeda(subtotalExtras), 162, y)
    y += 15
  }

  // Total geral
  doc.setFillColor(44, 62, 80)
  doc.rect(15, y, 180, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL DO MÊS', 20, y + 10)
  doc.text(fmtMoeda(receitaTotal), 155, y + 10)
  y += 25

  // Rodapé
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  doc.text('Relatório gerado por ServGo em ' + dataGeracao, 15, 285)
  doc.text('servgo.app', 175, 285)

  doc.save(`ServGo_Relatorio_${nomeMes.replace(/\s/g, '_')}.pdf`)
}

// ─────────────────────────────────────────────
// TELA FINANCEIRO DETALHES
// ─────────────────────────────────────────────
function TelaFinanceiroDetalhes({
  config,
  userName,
  extras,
  extrasDoMes,
  mesAtual,
  configFinanceira,
  onBack,
  onUpdateFinanceiro,
  onDeleteExtra,
}: {
  config: EscalaConfig | null
  userName: string
  extras: ExtraServico[]
  extrasDoMes: ExtraServico[]
  mesAtual: Date
  configFinanceira: ConfigFinanceira
  onBack: () => void
  onUpdateFinanceiro: (c: ConfigFinanceira) => void
  onDeleteExtra: (id: string) => void
}) {
  const nomeMesFormatado = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const diasCalendario = useMemo(
    () => config ? gerarCalendarioMes(mesAtual.getFullYear(), mesAtual.getMonth(), config) : [],
    [mesAtual, config]
  )

  const diasDoMes = diasCalendario.filter(d => d.isCurrentMonth)

  const plantoesDiaUtil  = diasDoMes.filter(d => d.isPlantao && !d.isFimDeSemana && !d.isFeriado).length
  const plantoesFS       = diasDoMes.filter(d => d.isPlantao && d.isFimDeSemana  && !d.isFeriado).length
  const plantoesFeriado  = diasDoMes.filter(d => d.isPlantao && d.isFeriado).length

  const subtotalEscala =
    plantoesDiaUtil  * configFinanceira.valorPlantaoDiaUtil     +
    plantoesFS       * configFinanceira.valorPlantaoFimDeSemana +
    plantoesFeriado  * configFinanceira.valorPlantaoFeriado

  const subtotalExtras = extrasDoMes.reduce((s, e) => s + e.valor, 0)
  const receitaTotal   = subtotalEscala + subtotalExtras

  return (
    <div className="flex-1 bg-[#F5F5F0]">
      {/* Header com botão voltar */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-50 transition-all">
          <ArrowLeft className="w-5 h-5 text-[#2C3E50]" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#2C3E50]">Financeiro</h1>
          <p className="text-xs text-slate-500 capitalize">{nomeMesFormatado}</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 pb-6">

        {/* Resumo total */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-fadeInUp">
          <p className="text-sm text-slate-500 mb-1">Receita total estimada</p>
          <p className="text-3xl font-bold text-[#2C3E50]">{formatarMoeda(receitaTotal)}</p>
          {config && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100">
              <div className="text-center">
                <p className="text-lg font-bold text-[#4CAF50]">{plantoesDiaUtil}</p>
                <p className="text-xs text-slate-500">Dia útil</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#1B6B3A]">{plantoesFS}</p>
                <p className="text-xs text-slate-500">Fim de sem.</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#E91E63]">{plantoesFeriado}</p>
                <p className="text-xs text-slate-500">Feriado</p>
              </div>
            </div>
          )}
        </div>

        {/* Valores editáveis por plantão */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <h3 className="font-semibold text-[#2C3E50] mb-3">Valores por plantão</h3>
          <div className="space-y-3">
            {([
              { label: 'Dia útil',      key: 'valorPlantaoDiaUtil'      as const },
              { label: 'Fim de semana', key: 'valorPlantaoFimDeSemana'  as const },
              { label: 'Feriado',       key: 'valorPlantaoFeriado'      as const },
              { label: 'Hora extra',    key: 'valorHoraExtra'           as const },
            ] as const).map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">R$</span>
                  <input
                    type="number"
                    value={configFinanceira[key]}
                    onChange={(e) => onUpdateFinanceiro({ ...configFinanceira, [key]: Number(e.target.value) })}
                    className="w-24 p-2 border border-slate-200 rounded-lg text-right text-[#2C3E50] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Escala regular */}
        {config && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <h3 className="font-semibold text-[#2C3E50] mb-3">Escala regular</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{plantoesDiaUtil} plantões × dia útil</span>
                <span className="font-semibold text-[#2C3E50]">
                  {formatarMoeda(plantoesDiaUtil * configFinanceira.valorPlantaoDiaUtil)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{plantoesFS} plantões × fim de semana</span>
                <span className="font-semibold text-[#1B6B3A]">
                  {formatarMoeda(plantoesFS * configFinanceira.valorPlantaoFimDeSemana)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{plantoesFeriado} plantões × feriado</span>
                <span className="font-semibold text-[#E91E63]">
                  {formatarMoeda(plantoesFeriado * configFinanceira.valorPlantaoFeriado)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-100">
                <span className="text-[#2C3E50]">Subtotal escala</span>
                <span className="text-[#2C3E50]">{formatarMoeda(subtotalEscala)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Lista de extras */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <h3 className="font-semibold text-[#2C3E50] mb-3">Extras do mês</h3>
          {extrasDoMes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum extra registrado</p>
          ) : (
            <div className="space-y-3">
              {extrasDoMes.map((extra) => (
                <div key={extra.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C3E50]">
                      {new Date(extra.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit',
                      })}{' '}
                      — {extra.tipo}
                    </p>
                    {extra.descricao && <p className="text-xs text-slate-400">{extra.descricao}</p>}
                    <p className="text-xs text-slate-500">{extra.horas}h</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2C3E50]">{formatarMoeda(extra.valor)}</span>
                    <button
                      onClick={() => onDeleteExtra(extra.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t border-slate-200">
                <span className="text-[#2C3E50]">Subtotal extras</span>
                <span className="text-[#C5993A]">{formatarMoeda(subtotalExtras)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Total geral */}
        <div className="bg-gradient-to-r from-[#2C3E50] to-[#34495E] rounded-2xl p-5 shadow-lg animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <p className="text-blue-200/70 text-sm">Total do mês</p>
          <p className="text-3xl font-bold text-white mt-1">{formatarMoeda(receitaTotal)}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 bg-white/10 rounded-lg p-2 text-center">
              <p className="text-xs text-blue-200/70">Escala</p>
              <p className="text-sm font-bold text-white">{formatarMoeda(subtotalEscala)}</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-lg p-2 text-center">
              <p className="text-xs text-blue-200/70">Extras</p>
              <p className="text-sm font-bold text-[#C5993A]">{formatarMoeda(subtotalExtras)}</p>
            </div>
          </div>
        </div>

        {/* Exportar PDF */}
        <button className="w-full py-3.5 bg-white border border-slate-200 rounded-xl text-[#2C3E50] font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
          <FileText className="w-5 h-5" />
          Exportar relatório PDF
          <span className="text-xs bg-[#C5993A]/10 text-[#C5993A] px-2 py-0.5 rounded-full font-semibold">
            Em breve
          </span>
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA CONFIG
// ─────────────────────────────────────────────
function TelaConfig({
  userName,
  config,
  onResetConfig,
  onUpdateName,
}: {
  userName: string
  config: EscalaConfig | null
  onResetConfig: () => void
  onUpdateName: (nome: string) => void
}) {
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome,     setNovoNome]     = useState(userName)
  const [notifAtiva,   setNotifAtiva]   = useState(false)

  useEffect(() => {
    setNotifAtiva(localStorage.getItem('servgo_notificacoes') === 'true')
  }, [])

  const salvarNome = () => {
    if (novoNome.trim().length >= 2) {
      onUpdateName(novoNome.trim())
      setEditandoNome(false)
    }
  }

  const toggleNotificacao = async () => {
    if (!('Notification' in window)) return
    if (notifAtiva) {
      localStorage.setItem('servgo_notificacoes', 'false')
      setNotifAtiva(false)
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      localStorage.setItem('servgo_notificacoes', 'true')
      setNotifAtiva(true)
    }
  }

  return (
    <div className="flex-1 bg-[#F5F5F0]">
      <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
        <h1 className="text-xl font-bold text-[#2C3E50]">Configurações</h1>
      </div>

      <div className="px-4 mt-4 space-y-4 pb-6">

        {/* Perfil */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-fadeInUp">
          <h3 className="font-semibold text-[#2C3E50] mb-3">Perfil</h3>
          {editandoNome ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && salvarNome()}
                className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditandoNome(false); setNovoNome(userName) }}
                  className="flex-1 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarNome}
                  disabled={novoNome.trim().length < 2}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white font-medium text-sm disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditandoNome(true)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#C5993A]/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-[#C5993A]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#2C3E50]">{userName}</p>
                  <p className="text-xs text-slate-500">Toque para editar</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Escala ativa */}
        {config && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
            <h3 className="font-semibold text-[#2C3E50] mb-3">Escala ativa</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-full flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-[#4CAF50]" />
              </div>
              <div>
                <p className="text-xl font-bold text-[#2C3E50]">{config.padrao}</p>
                <p className="text-sm text-slate-500">Entrada às {config.horarioInicio}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notificações */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <h3 className="font-semibold text-[#2C3E50] mb-3">Notificações</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#2C3E50]">Lembrete antes do plantão</p>
              <p className="text-xs text-slate-500">Notificação 1 hora antes</p>
            </div>
            <button
              onClick={toggleNotificacao}
              className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${
                notifAtiva ? 'bg-[#C5993A]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  notifAtiva ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Doação */}
        <div className="bg-gradient-to-br from-[#2C3E50] to-[#34495E] rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5993A] opacity-[0.06] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#D4872C] opacity-[0.04] rounded-full blur-3xl" />

          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-12 h-12 bg-gradient-to-br from-[#C5993A] to-[#D4872C] rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/20">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">Faça uma doação</p>
              <p className="text-blue-200/60 text-xs">Ajude a manter o app gratuito</p>
            </div>
          </div>

          <p className="text-blue-100/70 text-sm mb-4 leading-relaxed relative z-10">
            O ServGo é e sempre será gratuito. Se ele te ajuda no dia a dia, considere fazer uma doação via Pix para apoiar o desenvolvimento.
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/5 relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#E91E63]" />
              <p className="text-white/90 text-sm font-semibold">Compromisso social</p>
            </div>
            <p className="text-blue-200/70 text-xs leading-relaxed">
              10% de todo valor arrecadado em doações será destinado a instituições de caridade que apoiam crianças com câncer. 💛
            </p>
          </div>

          <button
            onClick={() => alert('Em breve! O link para doação via Pix será adicionado em uma atualização futura.')}
            className="w-full py-3.5 bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white font-semibold rounded-xl shadow-lg shadow-amber-900/20 active:scale-[0.98] transition-all relative z-10 flex items-center justify-center gap-2"
          >
            <Heart className="w-5 h-5" />
            Doar via Pix
          </button>

          <p className="text-center text-blue-200/40 text-xs mt-3 relative z-10">
            Qualquer valor faz a diferença ❤️
          </p>
        </div>

        {/* Resetar */}
        <button
          onClick={onResetConfig}
          className="w-full py-3 text-red-400 text-sm font-medium hover:bg-red-50 rounded-xl transition-all animate-fadeInUp"
          style={{ animationDelay: '0.2s' }}
        >
          Resetar todas as configurações
        </button>

        {/* Sobre */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">ServGo v3.0</p>
          <p className="text-xs text-slate-400">por iVertice Digital</p>
        </div>
      </div>
    </div>
  )
}

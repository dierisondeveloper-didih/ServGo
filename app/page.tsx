'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Settings, Crown, RefreshCw, Plus,
  Home, DollarSign, BarChart3,
  CalendarDays, Pencil,
} from 'lucide-react'
import { ESCALAS_PREDEFINIDAS, type EscalaConfig, type PeriodoEscala } from '@/lib/types'
import {
  gerarCalendarioMes,
  proximoPlantao,
  contarPlantoes,
  contarPlantoesFeriado,
  parseEscalaPersonalizada,
} from '@/lib/escala-utils'

const STORAGE_KEY   = 'servgo_config'
const USER_NAME_KEY = 'servgo_userName'

type TabType = 'home' | 'financeiro' | 'relatorio' | 'config'

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
export default function MeuTurnoApp() {
  const [config,    setConfig]    = useState<EscalaConfig | null>(null)
  const [userName,  setUserName]  = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [isLoaded,  setIsLoaded]  = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_KEY)
    const saved     = localStorage.getItem(STORAGE_KEY)
    if (savedName) setUserName(savedName)
    if (saved) {
      const parsed = JSON.parse(saved)
      const raw      = String(parsed.primeiroPlantao)
      const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw
      parsed.primeiroPlantao = new Date(dateOnly + 'T12:00:00')
      setConfig(parsed)
    }
    setIsLoaded(true)
  }, [])

  const salvarConfig = (novaConfig: EscalaConfig) => {
    const isFirstSetup = !config
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaConfig))
    setConfig(novaConfig)
    if (isFirstSetup) setActiveTab('home')
  }

  const resetConfig = () => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig(null)
  }

  const salvarUserName = (nome: string) => {
    localStorage.setItem(USER_NAME_KEY, nome)
    setUserName(nome)
  }

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

  // Se não tem config, força aba de configuração
  const currentTab: TabType = !config ? 'config' : activeTab

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F5F5F0] flex flex-col shadow-2xl shadow-slate-200/50 relative">
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: config ? '80px' : '0' }}>
          {currentTab === 'home' && config && (
            <TelaCalendario
              config={config}
              userName={userName}
              onOpenConfig={() => setActiveTab('config')}
            />
          )}
          {currentTab === 'financeiro' && <TelaFinanceiro />}
          {currentTab === 'relatorio'  && <TelaRelatorio />}
          {currentTab === 'config' && (
            <TelaConfig
              config={config}
              userName={userName}
              onSalvarConfig={salvarConfig}
              onResetConfig={resetConfig}
              onSalvarNome={salvarUserName}
            />
          )}
        </div>

        {config && (
          <BottomTabBar activeTab={currentTab} onTabChange={setActiveTab} />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BOTTOM TAB BAR
// ─────────────────────────────────────────────
function BottomTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}) {
  const tabs: { id: TabType; label: string; Icon: React.ElementType }[] = [
    { id: 'home',       label: 'Início',     Icon: Home       },
    { id: 'financeiro', label: 'Financeiro', Icon: DollarSign },
    { id: 'relatorio',  label: 'Relatório',  Icon: BarChart3  },
    { id: 'config',     label: 'Config',     Icon: Settings   },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-200/60 shadow-lg z-50">
      <div className="flex items-center pt-2 pb-6">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1 transition-all duration-200 ${
              activeTab === id ? 'text-[#C5993A]' : 'text-[#9CA3AF]'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className={`text-[10px] ${activeTab === id ? 'font-semibold' : ''}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA DE BOAS-VINDAS
// ─────────────────────────────────────────────
function TelaBoasVindas({ onContinuar }: { onContinuar: (nome: string) => void }) {
  const [nome, setNome] = useState('')

  const handleContinuar = () => {
    if (nome.trim().length >= 2) onContinuar(nome.trim())
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center px-6">
      <style>{`
        @keyframes bvUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bv-0 { animation: bvUp 0.8s ease-out forwards; }
        .bv-1 { opacity: 0; animation: bvUp 0.8s ease-out 0.2s forwards; }
        .bv-2 { opacity: 0; animation: bvUp 0.8s ease-out 0.4s forwards; }
        .bv-3 { opacity: 0; animation: bvUp 0.8s ease-out 0.6s forwards; }
      `}</style>

      <div className="bv-0 flex flex-col items-center">
        <img src="/logo-servgo.png" alt="ServGo" className="w-56 h-56 object-contain" />
        <p className="bv-1 text-[#6B7280] text-sm tracking-wide mt-2">
          Seu serviço, na palma da mão.
        </p>
      </div>

      <div style={{ height: 40 }} />

      <div className="bv-2 w-full">
        <p className="text-[#2C3E50] text-2xl font-bold">Bem Vindo!</p>
        <p className="text-[#2C3E50] text-base mt-4">Vamos Começar, qual seu nome:</p>
      </div>

      <div className="bv-3 w-full mt-4">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleContinuar()}
          placeholder="Digite seu nome"
          className="w-full p-3.5 border border-slate-200 rounded-2xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] transition-all duration-200 bg-white"
        />
        <button
          onClick={handleContinuar}
          disabled={nome.trim().length < 2}
          className={`w-full mt-4 py-4 rounded-2xl font-semibold transition-all duration-300 ${
            nome.trim().length >= 2
              ? 'bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white hover:shadow-lg hover:shadow-amber-200/50 active:scale-[0.99]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA CALENDÁRIO (HOME)
// ─────────────────────────────────────────────
function TelaCalendario({
  config,
  userName,
  onOpenConfig,
}: {
  config: EscalaConfig
  userName: string
  onOpenConfig: () => void
}) {
  const [mesAtual, setMesAtual] = useState(new Date())
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  const diasCalendario = useMemo(
    () => gerarCalendarioMes(mesAtual.getFullYear(), mesAtual.getMonth(), config),
    [mesAtual, config]
  )

  const proximo = useMemo(() => proximoPlantao(config), [config])

  const plantoesMes = useMemo(() => {
    const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const fim    = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
    return contarPlantoes(inicio, fim, config)
  }, [mesAtual, config])

  const plantoesFeriadoMes = useMemo(() => {
    const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const fim    = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
    return contarPlantoesFeriado(inicio, fim, config)
  }, [mesAtual, config])

  const navegarMes = (dir: number) => {
    const d = new Date(mesAtual)
    d.setMonth(d.getMonth() + dir)
    setMesAtual(d)
  }

  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const formatarProximo = (data: Date) =>
    data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const primeiroNome = userName.split(' ')[0]

  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F0]">
      {/* Header compacto */}
      <div className="bg-white px-4 pt-10 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-servgo.png" alt="ServGo" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-xs text-[#9CA3AF]">Bem-vindo de volta</p>
              <p className="text-xl font-bold text-[#2C3E50]">Olá, {primeiroNome}</p>
            </div>
          </div>
          <button
            onClick={onOpenConfig}
            className="w-10 h-10 rounded-xl bg-[#F5F5F0] flex items-center justify-center"
          >
            <Settings className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 animate-fadeInUp">
        {/* Card escala ativa + próximo plantão */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#C5993A] to-[#D4872C] rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wide">Escala ativa</p>
              <p className="font-bold text-[#2C3E50]">{config.padrao}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-[#9CA3AF]">Entrada</p>
              <p className="font-semibold text-[#2C3E50] text-sm">{config.horarioInicio}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-[#9CA3AF]">Próximo plantão</p>
            <p className="font-semibold text-[#2C3E50] capitalize mt-0.5 text-sm">
              {formatarProximo(proximo)}
            </p>
          </div>
        </div>

        {/* Calendário */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/60 overflow-hidden">
          {/* Navegação mês */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100/80">
            <button
              onClick={() => navegarMes(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F5F0] transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
            </button>
            <button
              onClick={() => setMesAtual(new Date())}
              className="font-semibold text-[#2C3E50] capitalize hover:text-[#C5993A] transition-colors text-[15px]"
            >
              {nomeMes}
            </button>
            <button
              onClick={() => navegarMes(1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F5F0] transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-[#6B7280]" />
            </button>
          </div>

          <div className="px-3 py-3">
            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 mb-1">
              {diasSemana.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-semibold text-[#9CA3AF] uppercase py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {diasCalendario.map((dia, i) => {
                if (!dia.isCurrentMonth) {
                  return (
                    <div key={i} className="aspect-square flex items-center justify-center text-xs text-slate-200">
                      {dia.dia}
                    </div>
                  )
                }

                const isSpecial = dia.isFimDeSemana || dia.isFeriado

                let bgClass   = ''
                let textClass = ''
                let ringClass = ''
                let extraClass = ''

                if (dia.isPlantao) {
                  bgClass   = isSpecial
                    ? 'bg-gradient-to-br from-[#E25028] to-[#BE3A14]'
                    : 'bg-[#D4872C]'
                  textClass = 'text-white font-semibold'
                  ringClass = dia.isToday
                    ? `ring-2 ring-white ring-offset-1 ${isSpecial ? 'ring-offset-[#E25028]' : 'ring-offset-[#D4872C]'}`
                    : ''
                } else {
                  textClass = isSpecial ? 'text-[#C5993A]' : 'text-[#2C3E50]'
                  ringClass = dia.isToday ? 'ring-2 ring-[#C5993A] ring-offset-1 font-semibold' : ''
                  extraClass = 'hover:bg-[#F5F5F0]'
                }

                return (
                  <div
                    key={i}
                    className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-xs relative transition-all duration-200 ${bgClass} ${textClass} ${ringClass} ${extraClass}`}
                  >
                    <span>{dia.dia}</span>
                    {dia.isFeriado && (
                      <div
                        className={`w-1 h-1 rounded-full absolute bottom-1 ${
                          dia.isPlantao ? 'bg-white' : 'bg-[#C5993A]'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md bg-[#D4872C]" />
                <span className="text-[10px] text-[#6B7280]">Plantão</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md bg-gradient-to-br from-[#E25028] to-[#BE3A14]" />
                <span className="text-[10px] text-[#6B7280]">Plantão feriado/fim sem.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C5993A]" />
                <span className="text-[10px] text-[#6B7280]">Feriado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card resumo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/60">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-[#9CA3AF]">Plantões neste mês</p>
              <p className="text-3xl font-bold text-[#2C3E50] mt-1">{plantoesMes}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#9CA3AF]">Feriado/fim de sem.</p>
              <p className="text-3xl font-bold text-[#C5993A] mt-1">{plantoesFeriadoMes}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA FINANCEIRO (PREMIUM LOCKED)
// ─────────────────────────────────────────────
function TelaFinanceiro() {
  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F0]">
      <div className="px-4 pt-10 pb-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-[#2C3E50]">Financeiro</h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">Controle seus ganhos</p>
      </div>

      <div className="flex-1 px-4 py-4 relative min-h-[500px]">
        {/* Preview com blur */}
        <div className="filter blur-[2px] pointer-events-none select-none flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Valor do plantão (dia útil)</p>
            <p className="text-2xl font-bold text-[#2C3E50] mt-1">R$ 500,00</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Valor do plantão (fim de semana)</p>
            <p className="text-2xl font-bold text-[#C5993A] mt-1">R$ 650,00</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Valor do plantão (feriado)</p>
            <p className="text-2xl font-bold text-[#D4872C] mt-1">R$ 800,00</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total estimado (Abril 2026)</p>
            <p className="text-3xl font-bold text-[#2C3E50] mt-1">R$ 4.750,00</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Extras / Bicos</p>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">05/04 - Extra feriado</span>
                <span className="font-semibold text-[#2C3E50]">R$ 900,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">12/04 - Cobertura</span>
                <span className="font-semibold text-[#2C3E50]">R$ 450,00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Overlay de desbloqueio */}
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-slate-200/60 text-center max-w-[320px]">
            <div className="w-16 h-16 bg-gradient-to-br from-[#C5993A] to-[#D4872C] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200/30">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-[#2C3E50]">Controle Financeiro</h3>
            <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
              Defina valores por tipo de plantão, registre extras e acompanhe seus ganhos mês a mês.
            </p>
            <button className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white font-semibold rounded-2xl shadow-lg shadow-amber-200/30 active:scale-[0.98] transition-all">
              Desbloquear Premium
            </button>
            <p className="text-xs text-[#9CA3AF] mt-3">R$ 9,99/mês • Cancele quando quiser</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA RELATÓRIO (PREMIUM LOCKED)
// ─────────────────────────────────────────────
function TelaRelatorio() {
  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F0]">
      <div className="px-4 pt-10 pb-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-[#2C3E50]">Relatório</h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">Análise de plantões</p>
      </div>

      <div className="flex-1 px-4 py-4 relative min-h-[500px]">
        {/* Preview com blur */}
        <div className="filter blur-[2px] pointer-events-none select-none flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="font-semibold text-[#2C3E50]">Relatório Mensal — Abril 2026</p>
            <div className="flex items-end gap-1.5 mt-4 h-20">
              {[6, 4, 8, 5, 7, 3, 9, 4].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-[#D4872C] to-[#C5993A] rounded-t-md"
                  style={{ height: `${h * 10}%` }}
                />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total trabalhado', val: '8 dias' },
                { label: 'Dias úteis',       val: '5' },
                { label: 'Fins de semana',   val: '2' },
                { label: 'Feriados',         val: '1' },
              ].map((item) => (
                <div key={item.label} className="bg-[#F5F5F0] rounded-xl p-3">
                  <p className="text-xs text-[#9CA3AF]">{item.label}</p>
                  <p className="font-bold text-[#2C3E50]">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm font-semibold text-[#2C3E50] mb-2">Detalhamento</p>
            {[
              '01/04 — Plantão (dia útil)',
              '05/04 — Plantão (feriado)',
              '09/04 — Plantão (sáb)',
              '13/04 — Plantão (dia útil)',
            ].map((item) => (
              <div key={item} className="py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overlay de desbloqueio */}
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-slate-200/60 text-center max-w-[320px]">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2C3E50] to-[#34495E] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-[#2C3E50]">Relatórios Detalhados</h3>
            <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
              Relatório completo com detalhamento por tipo de plantão, gráficos visuais e exportação em PDF.
            </p>
            <button className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white font-semibold rounded-2xl shadow-lg shadow-amber-200/30 active:scale-[0.98] transition-all">
              Desbloquear Premium
            </button>
            <p className="text-xs text-[#9CA3AF] mt-3">R$ 9,99/mês • Cancele quando quiser</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TELA CONFIG
// ─────────────────────────────────────────────
function TelaConfig({
  config,
  userName,
  onSalvarConfig,
  onResetConfig,
  onSalvarNome,
}: {
  config: EscalaConfig | null
  userName: string
  onSalvarConfig: (c: EscalaConfig) => void
  onResetConfig: () => void
  onSalvarNome: (nome: string) => void
}) {
  const [editandoNome,   setEditandoNome]   = useState(false)
  const [novoNome,       setNovoNome]       = useState(userName)
  const [showEscalaForm, setShowEscalaForm] = useState(false)

  // Sem config → modo de setup inicial
  if (!config) {
    return (
      <div className="min-h-full bg-[#F5F5F0]">
        <div className="px-4 pt-10 pb-4 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-[#2C3E50]">Configure sua escala</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Para começar, defina sua escala de plantão</p>
        </div>
        <div className="px-4 py-4">
          <EscalaForm onSalvar={onSalvarConfig} />
        </div>
      </div>
    )
  }

  const salvarNome = () => {
    if (novoNome.trim().length >= 2) {
      onSalvarNome(novoNome.trim())
      setEditandoNome(false)
    }
  }

  return (
    <div className="min-h-full bg-[#F5F5F0]">
      <div className="px-4 pt-10 pb-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-[#2C3E50]">Configurações</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 pb-28">
        {/* Perfil */}
        <section>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-widest font-semibold mb-2 px-1">
            Perfil
          </p>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/60">
            {editandoNome ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && salvarNome()}
                  className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] transition-all bg-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditandoNome(false)}
                    className="flex-1 py-2 rounded-xl text-[#6B7280] hover:bg-slate-100 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarNome}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white font-medium text-sm"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF]">Nome</p>
                  <p className="font-semibold text-[#2C3E50] mt-0.5">{userName}</p>
                </div>
                <button
                  onClick={() => { setNovoNome(userName); setEditandoNome(true) }}
                  className="w-9 h-9 rounded-xl bg-[#F5F5F0] flex items-center justify-center"
                >
                  <Pencil className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Escala */}
        <section>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-widest font-semibold mb-2 px-1">
            Escala
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100/60 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#9CA3AF]">Escala atual</p>
                <p className="font-bold text-[#2C3E50] mt-0.5">{config.padrao}</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Entrada: {config.horarioInicio}</p>
              </div>
              <button
                onClick={() => setShowEscalaForm(!showEscalaForm)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F5F5F0] text-sm text-[#6B7280] font-medium"
              >
                Alterar
                {showEscalaForm
                  ? <ChevronUp   className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />
                }
              </button>
            </div>
            {showEscalaForm && (
              <div className="border-t border-slate-100 p-4">
                <EscalaForm
                  configAtual={config}
                  onSalvar={(novaConfig) => {
                    onSalvarConfig(novaConfig)
                    setShowEscalaForm(false)
                  }}
                  onCancelar={() => setShowEscalaForm(false)}
                />
              </div>
            )}
          </div>
        </section>

        {/* Premium */}
        <section>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-widest font-semibold mb-2 px-1">
            Premium
          </p>
          <div className="bg-gradient-to-r from-[#2C3E50] to-[#34495E] rounded-2xl p-4 flex items-center gap-4 shadow-lg border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C5993A] opacity-[0.08] rounded-full blur-2xl" />
            <div className="w-12 h-12 bg-gradient-to-br from-[#C5993A] to-[#D4872C] rounded-xl flex items-center justify-center shadow-lg relative z-10 shrink-0">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="font-semibold text-white text-[15px]">Versão Premium</p>
              <p className="text-xs text-white/50 mt-0.5">Extras, permutas e relatórios. Em breve!</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 relative z-10 shrink-0" />
          </div>
        </section>

        {/* Resetar */}
        <section>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/60">
            <button
              onClick={onResetConfig}
              className="w-full py-2 rounded-xl font-medium text-red-500 hover:bg-red-50 flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Resetar Configuração
            </button>
          </div>
        </section>

        {/* Sobre */}
        <section>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-widest font-semibold mb-2 px-1">
            Sobre
          </p>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/60 text-center">
            <p className="text-sm font-semibold text-[#2C3E50]">ServGo v2.0</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">por iVertice Digital</p>
          </div>
        </section>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ESCALA FORM (reutilizável)
// ─────────────────────────────────────────────
function EscalaForm({
  configAtual,
  onSalvar,
  onCancelar,
}: {
  configAtual?: EscalaConfig
  onSalvar: (config: EscalaConfig) => void
  onCancelar?: () => void
}) {
  const [escala,        setEscala]        = useState(configAtual?.padrao || '')
  const [periodos,      setPeriodos]      = useState<PeriodoEscala[]>(configAtual?.periodos || [])
  const [horario,       setHorario]       = useState(configAtual?.horarioInicio || '07:00')
  const [primeiroPlantao, setPrimeiroPlantao] = useState(() => {
    if (!configAtual?.primeiroPlantao) {
      const n = new Date()
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
    }
    const d = configAtual.primeiroPlantao instanceof Date
      ? configAtual.primeiroPlantao
      : new Date(String(configAtual.primeiroPlantao).split('T')[0] + 'T12:00:00')
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [showCustom,  setShowCustom]  = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [customError, setCustomError] = useState('')

  const isPredefinida = ESCALAS_PREDEFINIDAS.some(e => e.label === escala)

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
    onSalvar({
      padrao: escala,
      periodos,
      horarioInicio: horario,
      primeiroPlantao: new Date(primeiroPlantao + 'T12:00:00'),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Seleção de escala */}
      <div>
        <label className="block text-sm font-medium text-[#2C3E50] mb-3">
          Qual sua escala?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ESCALAS_PREDEFINIDAS.map((e) => (
            <button
              key={e.label}
              onClick={() => handleSelectEscala(e.label)}
              className={`p-3.5 rounded-2xl border-2 text-center transition-all duration-200 ${
                escala === e.label
                  ? 'border-[#C5993A] bg-gradient-to-br from-amber-50 to-orange-50 text-[#C5993A] shadow-sm'
                  : 'border-slate-200 bg-white text-[#6B7280] hover:border-slate-300 active:scale-[0.98]'
              }`}
            >
              <span className="text-sm font-bold">{e.label}</span>
            </button>
          ))}
          {/* Personalizada */}
          <button
            onClick={() => setShowCustom(true)}
            className={`p-3.5 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
              !isPredefinida && escala
                ? 'border-[#C5993A] bg-gradient-to-br from-amber-50 to-orange-50 text-[#C5993A] shadow-sm'
                : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400'
            }`}
          >
            {!isPredefinida && escala ? (
              <span className="text-sm font-bold">{escala}</span>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span className="text-xs font-medium">Personalizada</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal escala personalizada */}
      {showCustom && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <label className="block text-sm font-medium text-[#2C3E50] mb-1">
            Digite sua escala
          </label>
          <p className="text-xs text-[#9CA3AF] mb-3">
            Formato: trabalho x folga... Ex: 12x24x12x72
          </p>
          <input
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(
                e.target.value.toUpperCase().replace(/[^0-9X]/g, '').toLowerCase()
              )
              setCustomError('')
            }}
            placeholder="Ex: 12x24x12x72"
            className="w-full p-3 border border-slate-200 rounded-xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] font-mono transition-all bg-white"
          />
          {customError && (
            <p className="text-red-500 text-xs mt-1">{customError}</p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setShowCustom(false); setCustomInput(''); setCustomError('') }}
              className="flex-1 py-2 rounded-xl text-[#6B7280] hover:bg-slate-100 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCustomEscala}
              disabled={!customInput}
              className="flex-1 py-2 rounded-xl bg-[#C5993A] text-white font-medium text-sm disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* Preview da escala */}
      {periodos.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50/60 to-amber-50/40 rounded-2xl p-3 border border-amber-100/60">
          <p className="text-xs text-[#2C3E50] font-semibold mb-2 uppercase tracking-wide">
            Sua escala:
          </p>
          <div className="flex flex-wrap gap-2">
            {periodos.map((p, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                  p.tipo === 'trabalho'
                    ? 'bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white'
                    : 'bg-slate-200/80 text-[#6B7280]'
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
        <label className="block text-sm font-medium text-[#2C3E50] mb-2">
          Quando foi/será seu primeiro plantão?
        </label>
        <input
          type="date"
          value={primeiroPlantao}
          onChange={(e) => setPrimeiroPlantao(e.target.value)}
          className="w-full p-3.5 border border-slate-200 rounded-2xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] transition-all bg-white"
        />
      </div>

      {/* Horário de entrada */}
      <div>
        <label className="block text-sm font-medium text-[#2C3E50] mb-2">
          Horário de entrada
        </label>
        <input
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          className="w-full p-3.5 border border-slate-200 rounded-2xl text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#C5993A]/30 focus:border-[#C5993A] transition-all bg-white"
        />
      </div>

      {/* Botões */}
      <div className="flex flex-col gap-2 pb-2">
        <button
          onClick={handleSalvar}
          disabled={!escala || periodos.length === 0}
          className={`w-full py-4 rounded-2xl font-semibold transition-all duration-300 ${
            escala && periodos.length > 0
              ? 'bg-gradient-to-r from-[#C5993A] to-[#D4872C] text-white hover:shadow-lg hover:shadow-amber-200/50 active:scale-[0.99]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {configAtual ? 'Salvar Alterações' : 'Começar'}
        </button>
        {onCancelar && (
          <button
            onClick={onCancelar}
            className="w-full py-3 rounded-2xl font-medium text-[#6B7280] hover:bg-slate-100 text-sm"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition, useEffect } from "react"
import {
  DollarSign,
  CheckSquare,
  FileText,
  Target,
  Settings,
  Home,
  TrendingUp,
  Plus,
  Circle,
  CheckCircle2,
  Clock,
  Menu,
  X,
  Loader2,
  LogOut,
} from "lucide-react"
import type { LifeItem, TaskItem } from "@/types/items"
import type { User} from "@/types/user"
import { createItem, getItems, getTaskStats, getTransactionStats, toggleTaskComplete as toggleTaskCompleteService } from "@/lib/services/items.service"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface DashboardProps {
  initialItems: LifeItem[];
  user: User
}

export function LifeDashboard({ initialItems, user }: DashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeNav, setActiveNav] = useState("dashboard")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [items, setItems] = useState<LifeItem[]>(initialItems)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, completed: 0, dueToday: 0 })
  const [transactionStats, setTransactionStats] = useState({ 
    monthlyBalance: 0, 
    totalIncome: 0, 
    totalExpense: 0, 
    previousMonthBalance: 0, 
    percentageChange: 0 
  })

  // Estados dos formulários
  const [taskForm, setTaskForm] = useState({ title: "", date: "", priority: "medium" })
  const [financeForm, setFinanceForm] = useState({ amount: "", type: "expense", category: "food", description: "" })
  const [noteForm, setNoteForm] = useState({ title: "", content: "" })

  // Carrega estatísticas ao montar o componente
  useEffect(() => {
    const loadStats = async () => {
      const statsResult = await getTaskStats()
      if (statsResult.data) {
        setTaskStats(statsResult.data)
      }
      
      const transactionStatsResult = await getTransactionStats()
      if (transactionStatsResult.data) {
        setTransactionStats(transactionStatsResult.data)
      }
    }
    loadStats()
  }, [])

  // Função para recarregar itens
  const reloadItems = async () => {
    const result = await getItems()
    if (result.data) {
      setItems(result.data)
    }
    
    // Atualiza estatísticas de tarefas
    const statsResult = await getTaskStats()
    if (statsResult.data) {
      setTaskStats(statsResult.data)
    }
    
    // Atualiza estatísticas de transações
    const transactionStatsResult = await getTransactionStats()
    if (transactionStatsResult.data) {
      setTransactionStats(transactionStatsResult.data)
    }
  }

  // Função de logout
  const handleLogout = async () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST' })
        if (response.ok) {
          router.push('/login')
          router.refresh()
        }
      } catch (error) {
        console.error('Erro ao fazer logout:', error)
      }
    })
  }

  const toggleTaskComplete = async (id: string) => {
    startTransition(async () => {
      const result = await toggleTaskCompleteService(id)
      
      if (result.error) {
        alert(result.error)
      } else {
        await reloadItems()
        router.refresh()
      }
    })
  }

  const handleAddTask = async () => {
    if (!taskForm.title.trim()) return

    startTransition(async () => {
      const occurredAt = taskForm.date ? new Date(taskForm.date).toISOString() : new Date().toISOString()
      
      const result = await createItem({
        type: "task",
        title: taskForm.title,
        occurred_at: occurredAt,
        properties: {
          is_checked: false,
          priority: taskForm.priority as "low" | "medium" | "high",
        },
      })

      if (result.error) {
        alert(result.error)
      } else {
        setTaskForm({ title: "", date: "", priority: "medium" })
        setDialogOpen(false)
        await reloadItems()
        router.refresh()
      }
    })
  }

  const handleAddTransaction = async () => {
    if (!financeForm.amount || parseFloat(financeForm.amount) === 0) return

    startTransition(async () => {
      const amount = parseFloat(financeForm.amount)
      const finalAmount = financeForm.type === "expense" ? -Math.abs(amount) : Math.abs(amount)

      const result = await createItem({
        type: "transaction",
        title: financeForm.description || `${financeForm.type === "expense" ? "Despesa" : "Receita"} - ${financeForm.category}`,
        occurred_at: new Date().toISOString(),
        properties: {
          amount: finalAmount,
          currency: "BRL",
          direction: financeForm.type as "income" | "expense",
          category: financeForm.category,
        },
      })

      if (result.error) {
        alert(result.error)
      } else {
        setFinanceForm({ amount: "", type: "expense", category: "food", description: "" })
        setDialogOpen(false)
        await reloadItems()
        router.refresh()
      }
    })
  }

  const handleAddNote = async () => {
    if (!noteForm.title.trim()) return

    startTransition(async () => {
      const result = await createItem({
        type: "note",
        title: noteForm.title,
        occurred_at: new Date().toISOString(),
        properties: {
          body_content: noteForm.content,
        },
      })

      if (result.error) {
        alert(result.error)
      } else {
        setNoteForm({ title: "", content: "" })
        setDialogOpen(false)
        await reloadItems()
        router.refresh()
      }
    })
  }

  const groupedItems = items.reduce((acc, item) => {
    // 1. Configuração do formatador para forçar o fuso do Brasil
    // Isso garante que 01:00 AM UTC vire 22:00 PM do dia anterior
    const brazilOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    // 2. Converta as datas para STRING (ex: "16/12/2025")
    // É muito mais seguro comparar strings do que timestamps
    const itemDateStr = new Date(item.occurred_at).toLocaleDateString('pt-BR', brazilOptions);
    
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR', brazilOptions);
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('pt-BR', brazilOptions);

    // 3. A Comparação Lógica
    let label = itemDateStr; // Padrão: mostra a data (ex: 14/12/2025)

    if (itemDateStr === todayStr) {
      label = "Hoje";
    } else if (itemDateStr === yesterdayStr) {
      label = "Ontem";
    } else {
        // Se quiser formatar bonito para datas antigas (ex: "14 de dez.")
        // Recriamos a data baseada na string para não ter erro de fuso
        // (Hackzinho: split na string BR dia/mes/ano)
        const [dia, mes] = itemDateStr.split('/');
        const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        label = `${dia} de ${meses[parseInt(mes) - 1]}`;
    }

    if (!acc[label]) {
      acc[label] = [];
    }
    acc[label].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const navItems = [
    { id: "dashboard", label: "Painel", icon: Home },
    { id: "finances", label: "Finanças", icon: DollarSign },
    { id: "tasks", label: "Tarefas", icon: CheckSquare },
    { id: "notes", label: "Notas", icon: FileText },
    { id: "goals", label: "Metas", icon: Target },
    { id: "settings", label: "Configurações", icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-sidebar border border-border hover:bg-sidebar-accent transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <X className="w-6 h-6 text-sidebar-foreground" />
        ) : (
          <Menu className="w-6 h-6 text-sidebar-foreground" />
        )}
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-border bg-sidebar flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Life OS</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  activeNav === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">ES</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.user_metadata.full_name || user.email}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="cursor-pointer w-full" 
            onClick={handleLogout}
            disabled={isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isPending ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8 pt-20 lg:pt-8">
          {/* Header */}
          <div className="mb-8">
            <h1>Olá, {user.user_metadata?.full_name?.trim() ? user.user_metadata.full_name.trim().split(/\s+/)[0] : user.email}</h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Balanço Mensal</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${transactionStats.monthlyBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {transactionStats.monthlyBalance >= 0 ? '+ ' : '- '}
                  R$ {Math.abs(transactionStats.monthlyBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactionStats.percentageChange >= 0 ? '+' : ''}
                  {transactionStats.percentageChange.toFixed(1)}% em relação ao mês passado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tarefas Pendentes</CardTitle>
                <CheckSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{taskStats.pending} {taskStats.pending === 1 ? 'tarefa' : 'tarefas'}</div>
                <p className="text-xs text-muted-foreground mt-1">{taskStats.dueToday} para hoje</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Metas Ativas</CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">45%</div>
                <p className="text-xs text-muted-foreground mt-1">Viagem para Europa</p>
              </CardContent>
            </Card>
          </div>

          {/* Unified Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum item ainda</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Comece adicionando tarefas, transações ou notas usando o botão + abaixo.
                  </p>
                </div>
              ) : (
                Object.entries(groupedItems).map(([date, items]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">{date}</h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-4 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors"
                      >
                        {item.type === "transaction" && (
                          <>
                            <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                              <DollarSign className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <h4 className="font-medium">{item.title}</h4>
                                <span
                                  className={`font-semibold ${
                                    item.properties.amount > 0 ? "text-emerald-500" : "text-red-500"
                                  }`}
                                >
                                  {item.properties.amount > 0 ? "+" : ""}R$ 
                                  {Math.abs(item.properties.amount).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {item.properties.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.occurred_at).toLocaleTimeString("pt-BR", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </>
                        )}

                        {item.type === "task" && (
                          <>
                            <button onClick={() => toggleTaskComplete(item.id)} className="mt-0.5 transition-colors">
                              {item.properties.is_checked ? (
                                <CheckCircle2 className="w-6 h-6 cursor-pointer text-emerald-500" />
                              ) : (
                                <Circle className="cursor-pointer w-6 h-6 text-muted-foreground hover:text-foreground" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4
                                className={`font-medium mb-1 ${
                                  item.properties.is_checked ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {item.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {new Date(item.occurred_at).toLocaleTimeString("pt-BR", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </Badge>
                                {item.properties.priority === "high" && (
                                  <Badge variant="destructive" className="text-xs">
                                    Alta Prioridade
                                  </Badge>
                                )}
                                {item.properties.priority === "medium" && (
                                  <Badge variant="secondary" className="text-xs">
                                    Média
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {item.type === "note" && (
                          <>
                            <div className="mt-0.5 p-2 rounded-lg bg-accent">
                              <FileText className="w-5 h-5 text-accent-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-1">{item.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                                {item.properties.body_content}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.occurred_at).toLocaleTimeString("pt-BR", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Floating Action Button with Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="fixed cursor-pointer bottom-8 right-8 h-14 w-14 rounded-full shadow-lg">
            <Plus className="w-6 h-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Item</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="task" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger className="cursor-pointer" value="task">Tarefa</TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="finance">Finança</TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="note">Nota</TabsTrigger>
            </TabsList>

            <TabsContent value="task" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Título</Label>
                <Input 
                  id="task-title" 
                  placeholder="O que precisa ser feito?" 
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  disabled={isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-date">Data de Vencimento</Label>
                  <Input 
                    id="task-date" 
                    type="date" 
                    value={taskForm.date}
                    onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Prioridade</Label>
                  <Select 
                    value={taskForm.priority} 
                    onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                    disabled={isPending}
                  >
                    <SelectTrigger id="task-priority">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="cursor-pointer w-full" onClick={handleAddTask} disabled={isPending || !taskForm.title.trim()}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adicionando...</> : "Adicionar Tarefa"}
              </Button>
            </TabsContent>

            <TabsContent value="finance" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="finance-amount">Valor</Label>
                <Input 
                  id="finance-amount" 
                  type="number" 
                  placeholder="0,00" 
                  step="0.01" 
                  value={financeForm.amount}
                  onChange={(e) => setFinanceForm({ ...financeForm, amount: e.target.value })}
                  disabled={isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="finance-type">Tipo</Label>
                  <Select 
                    value={financeForm.type}
                    onValueChange={(value) => setFinanceForm({ ...financeForm, type: value })}
                    disabled={isPending}
                  >
                    <SelectTrigger id="finance-type">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finance-category">Categoria</Label>
                  <Select 
                    value={financeForm.category}
                    onValueChange={(value) => setFinanceForm({ ...financeForm, category: value })}
                    disabled={isPending}
                  >
                    <SelectTrigger id="finance-category">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Alimentação</SelectItem>
                      <SelectItem value="transport">Transporte</SelectItem>
                      <SelectItem value="entertainment">Entretenimento</SelectItem>
                      <SelectItem value="income">Renda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="finance-description">Descrição</Label>
                <Input 
                  id="finance-description" 
                  placeholder="Para que foi isso?" 
                  value={financeForm.description}
                  onChange={(e) => setFinanceForm({ ...financeForm, description: e.target.value })}
                  disabled={isPending}
                />
              </div>
              <Button className="cursor-pointer w-full" onClick={handleAddTransaction} disabled={isPending || !financeForm.amount}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adicionando...</> : "Adicionar Transação"}
              </Button>
            </TabsContent>

            <TabsContent value="note" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="note-title">Título</Label>
                <Input 
                  id="note-title" 
                  placeholder="Título da nota" 
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-content">Conteúdo</Label>
                <Textarea
                  id="note-content"
                  placeholder="Escreva seus pensamentos..."
                  className="min-h-[150px] resize-none"
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  disabled={isPending}
                />
              </div>
              <Button className="cursor-pointer w-full" onClick={handleAddNote} disabled={isPending || !noteForm.title.trim()}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Salvar Nota"}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

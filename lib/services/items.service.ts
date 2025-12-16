'use server'

import { createClient } from '@/lib/supabase/server'
import type { LifeItem, TaskProperties, TransactionProperties, NoteProperties, GoalProperties } from '@/types/items'
import { revalidatePath } from 'next/cache'

/**
 * Busca todos os itens do usuário autenticado
 */
export async function getItems(): Promise<{ data?: LifeItem[]; error?: string }> {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Usuário não autenticado' }
  }

  // Busca itens do usuário
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar itens:', error)
    return { error: 'Erro ao buscar itens' }
  }

  return { data: items as LifeItem[] }
}

/**
 * Busca estatísticas de tarefas do usuário
 */
export async function getTaskStats(): Promise<{
  data?: { total: number; pending: number; completed: number; dueToday: number }
  error?: string
}> {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Usuário não autenticado' }
  }

  // Busca todas as tarefas do usuário
  const { data: tasks, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'task')

  if (error) {
    console.error('Erro ao buscar tarefas:', error)
    return { error: 'Erro ao buscar tarefas' }
  }

  const typedTasks = tasks as LifeItem[]
  
  // Calcula estatísticas
  const total = typedTasks.length
  const pending = typedTasks.filter(task => task.status === 'pending').length
  const completed = typedTasks.filter(task => task.status === 'completed').length
  
  // Tarefas para hoje
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  
  const dueToday = typedTasks.filter(task => {
    const taskDate = new Date(task.occurred_at)
    return taskDate >= todayStart && taskDate < todayEnd && task.status === 'pending'
  }).length

  return {
    data: {
      total,
      pending,
      completed,
      dueToday,
    }
  }
}

/**
 * Busca estatísticas de transações do usuário (balanço mensal)
 */
export async function getTransactionStats(): Promise<{
  data?: { 
    monthlyBalance: number
    totalIncome: number
    totalExpense: number
    previousMonthBalance: number
    percentageChange: number
  }
  error?: string
}> {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Usuário não autenticado' }
  }

  const now = new Date()
  
  // Calcula período do mês atual
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  
  // Calcula período do mês anterior
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

  // Busca transações do mês atual
  const { data: currentTransactions, error: currentError } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'transaction')
    .gte('occurred_at', currentMonthStart.toISOString())
    .lt('occurred_at', currentMonthEnd.toISOString())

  if (currentError) {
    console.error('Erro ao buscar transações atuais:', currentError)
    return { error: 'Erro ao buscar transações' }
  }

  // Busca transações do mês anterior
  const { data: previousTransactions, error: previousError } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'transaction')
    .gte('occurred_at', previousMonthStart.toISOString())
    .lt('occurred_at', previousMonthEnd.toISOString())

  if (previousError) {
    console.error('Erro ao buscar transações anteriores:', previousError)
    return { error: 'Erro ao buscar transações' }
  }

  const typedCurrentTransactions = currentTransactions as LifeItem[]
  const typedPreviousTransactions = previousTransactions as LifeItem[]
  
  // Calcula totais do mês atual
  let totalIncome = 0
  let totalExpense = 0
  
  typedCurrentTransactions.forEach(transaction => {
    if (transaction.type === 'transaction') {
      const amount = transaction.properties.amount || 0
      if (amount > 0) {
        totalIncome += amount
      } else {
        totalExpense += Math.abs(amount)
      }
    }
  })
  
  const monthlyBalance = totalIncome - totalExpense
  
  // Calcula balanço do mês anterior
  let previousMonthBalance = 0
  typedPreviousTransactions.forEach(transaction => {
    if (transaction.type === 'transaction') {
      const amount = transaction.properties.amount || 0
      previousMonthBalance += amount
    }
  })
  
  // Calcula percentual de mudança
  let percentageChange = 0
  if (previousMonthBalance !== 0) {
    percentageChange = ((monthlyBalance - previousMonthBalance) / Math.abs(previousMonthBalance)) * 100
  } else if (monthlyBalance !== 0) {
    percentageChange = 100
  }

  return {
    data: {
      monthlyBalance,
      totalIncome,
      totalExpense,
      previousMonthBalance,
      percentageChange,
    }
  }
}

/**
 * Cria um novo item no banco de dados
 */
export async function createItem(data: {
  type: 'transaction' | 'task' | 'note' | 'goal'
  title: string
  description?: string
  occurred_at: string
  properties: TaskProperties | TransactionProperties | NoteProperties | GoalProperties
}) {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Usuário não autenticado' }
  }

  // Insere o item
  const { data: newItem, error } = await supabase
    .from('items')
    .insert({
      user_id: user.id,
      type: data.type,
      title: data.title,
      description: data.description,
      occurred_at: data.occurred_at,
      status: data.type === 'task' ? 'pending' : data.type === 'transaction' ? 'paid' : 'pending',
      properties: data.properties,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar item:', error)
    return { error: 'Erro ao criar item' }
  }

  revalidatePath('/')
  return { data: newItem as LifeItem }
}

/**
 * Atualiza um item existente
 */
export async function updateItem(
  id: string,
  updates: {
    title?: string
    description?: string
    occurred_at?: string
    status?: string
    properties?: Partial<TaskProperties | TransactionProperties | NoteProperties | GoalProperties>
  }
) {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Usuário não autenticado' }
  }

  // Atualiza o item
  const { data: updatedItem, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // Garante que só pode atualizar seus próprios itens
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar item:', error)
    return { error: 'Erro ao atualizar item' }
  }

  revalidatePath('/')
  return { data: updatedItem as LifeItem }
}

/**
 * Deleta um item
 */
export async function deleteItem(id: string) {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Usuário não autenticado' }
  }

  // Deleta o item
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // Garante que só pode deletar seus próprios itens

  if (error) {
    console.error('Erro ao deletar item:', error)
    return { error: 'Erro ao deletar item' }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Toggle do status de conclusão de uma tarefa
 */
export async function toggleTaskComplete(id: string) {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Usuário não autenticado' }
  }

  // Busca o item atual
  const { data: currentItem, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('type', 'task')
    .single()

  if (fetchError || !currentItem) {
    console.error('Erro ao buscar tarefa:', fetchError)
    return { error: 'Tarefa não encontrada' }
  }

  // Toggle do status
  const newStatus = currentItem.status === 'completed' ? 'pending' : 'completed'
  const newIsChecked = !currentItem.properties.is_checked

  const { data: updatedItem, error: updateError } = await supabase
    .from('items')
    .update({
      status: newStatus,
      properties: {
        ...currentItem.properties,
        is_checked: newIsChecked,
      },
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    console.error('Erro ao atualizar tarefa:', updateError)
    return { error: 'Erro ao atualizar tarefa' }
  }

  revalidatePath('/')
  return { data: updatedItem as LifeItem }
}

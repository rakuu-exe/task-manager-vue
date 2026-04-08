import type { ITodoCategory } from './categories'
import type { ITodoPriority } from './priorities'

export interface ITodoTask {
  id: string
  taskName: string | null
  taskSort: number
  createdDt: string
  dueDt: string | null
  isCompleted: boolean
  isArchived: boolean
  todoCategoryId: string
  todoPriorityId: string
  syncDt: string
}

export interface ITodoTaskCreate {
  taskName: string | null
  taskSort: number
  createdDt: string
  dueDt: string | null
  isCompleted: boolean
  isArchived: boolean
  todoCategoryId: string
  todoPriorityId: string
}

export interface ITaskFormDependencies {
  categories: ITodoCategory[]
  priorities: ITodoPriority[]
}

export interface ITodoPriority {
  id: string
  priorityName: string | null
  prioritySort: number
  syncDt: string
}

export interface ITodoPriorityCreate {
  priorityName: string | null
  prioritySort: number
}

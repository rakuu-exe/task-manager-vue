export interface ITodoCategory {
  id: string
  categoryName: string | null
  categorySort: number
  syncDt: string
  tag: string | null
}

export interface ITodoCategoryCreate {
  categoryName: string | null
  categorySort: number
  tag: string | null
}

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertCircle,
  Check,
  ClipboardList,
  GripVertical,
  History,
  PackageOpen,
  Plus,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import './App.css'

type ID = string

type Tab = 'catalog' | 'preparation' | 'store' | 'history'
type Unit = 'pieces' | 'liters' | 'grams'

interface Product {
  id: ID
  name: string
  unit: Unit
  targetQty: number
  orderIndex: number
  latestUnitPrice: number | null
  createdAt: string
  updatedAt: string
}

interface PreparedItem {
  id: ID
  productId: ID
  qty: number
  orderIndex: number
  estimatedUnitPrice: number | null
  actualUnitPrice: number | null
  picked: boolean
}

interface HistoryItem {
  id: ID
  productId: ID
  productName: string
  unit: Unit
  qty: number
  estimatedUnitPrice: number | null
  actualUnitPrice: number | null
  total: number
}

interface HistorySession {
  id: ID
  completedAt: string
  budget: number
  items: HistoryItem[]
}

interface AppSettings {
  defaultBudget: number
}

interface AppState {
  products: Product[]
  preparedItems: PreparedItem[]
  history: HistorySession[]
  settings: AppSettings
}

interface UndoAction {
  id: ID
  message: string
  expiresAt: number
  previousState: AppState
}

interface ZoneItem extends PreparedItem {
  estimatedTotal: number | null
  inZone: boolean
}

const STORAGE_KEY = 'sg_state_v3'
const DEFAULT_BUDGET = 5000

const defaultState: AppState = {
  products: [],
  preparedItems: [],
  history: [],
  settings: {
    defaultBudget: DEFAULT_BUDGET,
  },
}

function generateId(): ID {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function nowIso(): string {
  return new Date().toISOString()
}

function deepCloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState
}

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parsePositiveInt(value: string, fallback = 1): number {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }
  return parsed
}

function parsePriceInput(value: string): number | null {
  if (value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

function formatCurrencyRsd(value: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return '?'
  }
  return formatCurrencyRsd(value)
}

function unitLabel(unit: Unit): string {
  if (unit === 'liters') return 'л'
  if (unit === 'grams') return 'г'
  return 'шт'
}

function normalizeProductOrder(products: Product[]): Product[] {
  return products
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({
      ...item,
      orderIndex: index,
    }))
}

function normalizePreparedOrder(items: PreparedItem[]): PreparedItem[] {
  return items
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({
      ...item,
      orderIndex: index,
    }))
}

function migrateOldState(raw: unknown): AppState {
  const old = raw as {
    products?: Array<{
      id?: string
      name?: string
      unit?: string
      orderIndex?: number
      latestUnitPrice?: number
    }>
    sessions?: Array<{
      id?: string
      budgetTotal?: number
      items?: Array<{
        id?: string
        productId?: string
        plannedQty?: number
        plannedOrder?: number
        estimatedUnitPrice?: number
        actualUnitPrice?: number
        picked?: boolean
        removed?: boolean
      }>
      updatedAt?: string
    }>
    activeSessionId?: string
    history?: Array<{
      sessionId?: string
      productId?: string
      productName?: string
      qty?: number
      roundedUnitPrice?: number
      total?: number
      purchasedAt?: string
    }>
  }

  const migratedProducts: Product[] = Array.isArray(old.products)
    ? normalizeProductOrder(
        old.products
          .filter((p) => typeof p.id === 'string' && typeof p.name === 'string')
          .map((p, index) => ({
            id: p.id as string,
            name: (p.name ?? '').trim() || 'Без названия',
            unit: p.unit === 'liters' || p.unit === 'grams' ? p.unit : 'pieces',
            targetQty: 1,
            orderIndex: Number.isFinite(p.orderIndex) ? (p.orderIndex as number) : index,
            latestUnitPrice:
              typeof p.latestUnitPrice === 'number' && p.latestUnitPrice > 0
                ? p.latestUnitPrice
                : null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }))
      )
    : []

  const activeSession =
    Array.isArray(old.sessions) && old.activeSessionId
      ? old.sessions.find((session) => session.id === old.activeSessionId)
      : undefined

  const migratedPrepared: PreparedItem[] = activeSession?.items
    ? normalizePreparedOrder(
        activeSession.items
          .filter((item) => !item.removed && typeof item.productId === 'string')
          .map((item, index) => ({
            id: item.id ?? generateId(),
            productId: item.productId as string,
            qty:
              typeof item.plannedQty === 'number' && item.plannedQty > 0
                ? Math.floor(item.plannedQty)
                : 1,
            orderIndex:
              typeof item.plannedOrder === 'number' ? item.plannedOrder : index,
            estimatedUnitPrice:
              typeof item.estimatedUnitPrice === 'number' && item.estimatedUnitPrice > 0
                ? item.estimatedUnitPrice
                : null,
            actualUnitPrice:
              typeof item.actualUnitPrice === 'number' && item.actualUnitPrice > 0
                ? item.actualUnitPrice
                : null,
            picked: Boolean(item.picked),
          }))
      )
    : []

  const historyMap = new Map<string, HistorySession>()
  if (Array.isArray(old.history)) {
    old.history.forEach((entry) => {
      if (!entry.sessionId || !entry.productId) {
        return
      }
      const existing = historyMap.get(entry.sessionId)
      const historyItem: HistoryItem = {
        id: generateId(),
        productId: entry.productId,
        productName: entry.productName ?? 'Товар',
        unit: 'pieces',
        qty: entry.qty && entry.qty > 0 ? Math.floor(entry.qty) : 1,
        estimatedUnitPrice: null,
        actualUnitPrice:
          typeof entry.roundedUnitPrice === 'number' && entry.roundedUnitPrice > 0
            ? entry.roundedUnitPrice
            : null,
        total: typeof entry.total === 'number' && entry.total > 0 ? entry.total : 0,
      }

      if (existing) {
        existing.items.push(historyItem)
      } else {
        historyMap.set(entry.sessionId, {
          id: entry.sessionId,
          completedAt: entry.purchasedAt ?? nowIso(),
          budget:
            typeof activeSession?.budgetTotal === 'number' ? activeSession.budgetTotal : DEFAULT_BUDGET,
          items: [historyItem],
        })
      }
    })
  }

  return {
    products: migratedProducts,
    preparedItems: migratedPrepared,
    history: Array.from(historyMap.values()).sort((a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ),
    settings: {
      defaultBudget:
        typeof activeSession?.budgetTotal === 'number' && activeSession.budgetTotal > 0
          ? activeSession.budgetTotal
          : DEFAULT_BUDGET,
    },
  }
}

function loadState(): AppState {
  const stored = safeLoad<unknown>(STORAGE_KEY, null)
  if (stored && typeof stored === 'object') {
    const typed = stored as AppState
    if (
      Array.isArray(typed.products) &&
      Array.isArray(typed.preparedItems) &&
      Array.isArray(typed.history) &&
      typed.settings &&
      typeof typed.settings.defaultBudget === 'number'
    ) {
      return {
        products: normalizeProductOrder(
          typed.products.map((product) => ({
            ...product,
            unit:
              product.unit === 'liters' || product.unit === 'grams' ? product.unit : 'pieces',
            targetQty: product.targetQty && product.targetQty > 0 ? Math.floor(product.targetQty) : 1,
            latestUnitPrice:
              typeof product.latestUnitPrice === 'number' && product.latestUnitPrice > 0
                ? product.latestUnitPrice
                : null,
          }))
        ),
        preparedItems: normalizePreparedOrder(
          typed.preparedItems.map((item) => ({
            ...item,
            qty: item.qty && item.qty > 0 ? Math.floor(item.qty) : 1,
            estimatedUnitPrice:
              typeof item.estimatedUnitPrice === 'number' && item.estimatedUnitPrice > 0
                ? item.estimatedUnitPrice
                : null,
            actualUnitPrice:
              typeof item.actualUnitPrice === 'number' && item.actualUnitPrice > 0
                ? item.actualUnitPrice
                : null,
          }))
        ),
        history: typed.history,
        settings: {
          defaultBudget:
            typed.settings.defaultBudget > 0
              ? Math.floor(typed.settings.defaultBudget)
              : DEFAULT_BUDGET,
        },
      }
    }
    return migrateOldState(stored)
  }

  const oldV2 = safeLoad<unknown>('sg_state_v2', null)
  if (oldV2) {
    return migrateOldState(oldV2)
  }

  return defaultState
}

function DroppableList({
  id,
  items,
  children,
  className,
}: {
  id: string
  items: ID[]
  children: ReactNode
  className?: string
}) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={className}>
        {children}
      </div>
    </SortableContext>
  )
}

function SortableRow({
  id,
  children,
  className,
}: {
  id: string
  children: ReactNode
  className?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`line-row sortable-row${isDragging ? ' dragging' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="drag-handle"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Перетащить"
      >
        <GripVertical size={18} />
      </button>
      {children}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('catalog')
  const [state, setState] = useState<AppState>(() => loadState())
  const [newProductName, setNewProductName] = useState('')
  const [newProductQty, setNewProductQty] = useState('1')
  const [newProductUnit, setNewProductUnit] = useState<Unit>('pieces')
  const [newProductPrice, setNewProductPrice] = useState('')

  const [undoAction, setUndoAction] = useState<UndoAction | undefined>(undefined)
  const [catalogBulkMode, setCatalogBulkMode] = useState(false)
  const [preparedBulkMode, setPreparedBulkMode] = useState(false)
  const [storeBulkMode, setStoreBulkMode] = useState(false)

  const [catalogSelectedIds, setCatalogSelectedIds] = useState<Set<ID>>(() => new Set())
  const [preparedSelectedIds, setPreparedSelectedIds] = useState<Set<ID>>(() => new Set())
  const [storeSelectedIds, setStoreSelectedIds] = useState<Set<ID>>(() => new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!undoAction) return

    const timeoutMs = Math.max(0, undoAction.expiresAt - Date.now())
    const timeoutId = window.setTimeout(() => {
      setUndoAction((current) =>
        current?.id === undoAction.id ? undefined : current
      )
    }, timeoutMs)

    return () => window.clearTimeout(timeoutId)
  }, [undoAction])

  const orderedProducts = useMemo(
    () => state.products.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [state.products]
  )

  const productMap = useMemo(
    () => new Map(state.products.map((product) => [product.id, product])),
    [state.products]
  )

  const preparedItems = useMemo(
    () => state.preparedItems.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [state.preparedItems]
  )

  const zoneItems = useMemo<ZoneItem[]>(() => {
    const budget = state.settings.defaultBudget

    const reduced = preparedItems.reduce<{
      covered: number
      items: ZoneItem[]
    }>(
      (acc, item) => {
        const estimatedTotal =
          item.estimatedUnitPrice === null ? null : item.estimatedUnitPrice * item.qty
        const inZone =
          estimatedTotal !== null &&
          estimatedTotal > 0 &&
          acc.covered + estimatedTotal <= budget

        return {
          covered: inZone && estimatedTotal !== null ? acc.covered + estimatedTotal : acc.covered,
          items: [
            ...acc.items,
            {
              ...item,
              estimatedTotal,
              inZone,
            },
          ],
        }
      },
      {
        covered: 0,
        items: [],
      }
    )

    return reduced.items
  }, [preparedItems, state.settings.defaultBudget])

  const coveredTotal = zoneItems.reduce(
    (sum, item) => (item.inZone && item.estimatedTotal !== null ? sum + item.estimatedTotal : sum),
    0
  )

  const budgetRemaining = Math.max(0, state.settings.defaultBudget - coveredTotal)

  const inStoreSpent = preparedItems.reduce((sum, item) => {
    if (!item.picked || item.actualUnitPrice === null) {
      return sum
    }
    return sum + item.actualUnitPrice * item.qty
  }, 0)

  const inStoreRemaining = state.settings.defaultBudget - inStoreSpent

  const candidateProducts = orderedProducts.filter(
    (product) => !preparedItems.some((item) => item.productId === product.id)
  )

  const unpickedItems = zoneItems.filter((i) => !i.picked)
  const pickedItems = zoneItems.filter((i) => i.picked)

  const createUndo = (message: string, previousState: AppState) => {
    setUndoAction({
      id: generateId(),
      message,
      previousState,
      expiresAt: Date.now() + 5000,
    })
  }

  const applyWithUndo = (message: string, updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const previousState = deepCloneState(prev)
      const next = updater(prev)
      createUndo(message, previousState)
      return next
    })
  }

  const undoLastDelete = () => {
    if (!undoAction) {
      return
    }
    setState(undoAction.previousState)
    setUndoAction(undefined)
    setCatalogBulkMode(false)
    setPreparedBulkMode(false)
    setStoreBulkMode(false)
    setCatalogSelectedIds(new Set())
    setPreparedSelectedIds(new Set())
    setStoreSelectedIds(new Set())
  }

  const updateBudget = (value: string) => {
    const parsed = Math.floor(toNumber(value, DEFAULT_BUDGET))
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        defaultBudget: parsed > 0 ? parsed : DEFAULT_BUDGET,
      },
    }))
  }

  const addProduct = () => {
    const name = newProductName.trim()
    if (!name) {
      return
    }

    const targetQty = parsePositiveInt(newProductQty, 1)
    const price = parsePriceInput(newProductPrice)

    setState((prev) => {
      const timestamp = nowIso()
      const nextProduct: Product = {
        id: generateId(),
        name,
        unit: newProductUnit,
        targetQty,
        orderIndex: prev.products.length,
        latestUnitPrice: price,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      return {
        ...prev,
        products: [...prev.products, nextProduct],
      }
    })

    setNewProductName('')
    setNewProductQty('1')
    setNewProductUnit('pieces')
    setNewProductPrice('')
  }

  const handleNewProductKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      addProduct()
    }
  }

  const updateProduct = (productId: ID, patch: Partial<Product>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.id === productId
          ? {
              ...product,
              ...patch,
              updatedAt: nowIso(),
            }
          : product
      ),
    }))
  }

  const onCatalogDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    setState((prev) => {
      const sorted = prev.products.slice().sort((a, b) => a.orderIndex - b.orderIndex)
      const oldIndex = sorted.findIndex((item) => item.id === active.id)
      const newIndex = sorted.findIndex((item) => item.id === over.id)
      if (oldIndex < 0 || newIndex < 0) {
        return prev
      }

      const moved = arrayMove(sorted, oldIndex, newIndex).map((item, index) => ({
        ...item,
        orderIndex: index,
        updatedAt: nowIso(),
      }))

      return {
        ...prev,
        products: moved,
      }
    })
  }

  const onPreparationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    setState((prev) => {
      const activePreparedIdx = prev.preparedItems.findIndex(i => i.productId === activeId)
      const activeProductIdx = prev.products.findIndex(p => p.id === activeId)
      
      const overPreparedIdx = prev.preparedItems.findIndex(i => i.productId === overId)
      const overProductIdx = prev.products.findIndex(p => p.id === overId)

      const isTargetPrepared = overId === 'prepared-list' || overPreparedIdx !== -1
      const isTargetAssortment = overId === 'assortment-list' || (overProductIdx !== -1 && overPreparedIdx === -1)
      
      const isSourcePrepared = activePreparedIdx !== -1
      
      let newPreparedItems = [...prev.preparedItems]

      if (isSourcePrepared && isTargetPrepared && overPreparedIdx !== -1) {
        newPreparedItems = arrayMove(newPreparedItems, activePreparedIdx, overPreparedIdx)
      } else if (!isSourcePrepared && isTargetAssortment && overProductIdx !== -1) {
        let newProducts = [...prev.products]
        if (activeProductIdx !== overProductIdx) {
          newProducts = arrayMove(newProducts, activeProductIdx, overProductIdx)
          newProducts = newProducts.map((p, i) => ({ ...p, orderIndex: i }))
          return { ...prev, products: newProducts }
        }
      } else if (isSourcePrepared && isTargetAssortment) {
        newPreparedItems.splice(activePreparedIdx, 1)
      } else if (!isSourcePrepared && isTargetPrepared) {
        const activeProduct = prev.products[activeProductIdx]
        if (!activeProduct) return prev
        const newItem: PreparedItem = {
          id: generateId(),
          productId: activeId,
          qty: activeProduct.targetQty > 0 ? activeProduct.targetQty : 1,
          orderIndex: newPreparedItems.length,
          estimatedUnitPrice: activeProduct.latestUnitPrice,
          actualUnitPrice: null,
          picked: false,
        }
        if (overPreparedIdx !== -1) {
          newPreparedItems.splice(overPreparedIdx, 0, newItem)
        } else {
          newPreparedItems.push(newItem)
        }
      }

      return {
        ...prev,
        preparedItems: normalizePreparedOrder(newPreparedItems)
      }
    })
  }

  const onStoreDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    setState((prev) => {
      const activeItemIdx = prev.preparedItems.findIndex(i => i.productId === activeId)
      if (activeItemIdx === -1) return prev

      let newPreparedItems = [...prev.preparedItems]
      const activeItem = { ...newPreparedItems[activeItemIdx] }
      
      const overItemIdx = newPreparedItems.findIndex(i => i.productId === overId)

      const isTargetPicked = overId === 'picked-list' || (overItemIdx !== -1 && newPreparedItems[overItemIdx].picked)
      const isTargetUnpicked = overId === 'unpicked-list' || (overItemIdx !== -1 && !newPreparedItems[overItemIdx].picked)

      if (isTargetPicked) {
        activeItem.picked = true
      } else if (isTargetUnpicked) {
        activeItem.picked = false
      }

      newPreparedItems[activeItemIdx] = activeItem

      if (overItemIdx !== -1 && activeItemIdx !== overItemIdx) {
        newPreparedItems = arrayMove(newPreparedItems, activeItemIdx, overItemIdx)
      }

      return {
        ...prev,
        preparedItems: normalizePreparedOrder(newPreparedItems)
      }
    })
  }

  const confirmBulkDeleteProducts = () => {
    if (catalogSelectedIds.size === 0) return
    applyWithUndo('Удалены выбранные товары', (prev) => ({
      ...prev,
      products: normalizeProductOrder(
        prev.products.filter((item) => !catalogSelectedIds.has(item.id))
      ),
      preparedItems: normalizePreparedOrder(
        prev.preparedItems.filter((item) => !catalogSelectedIds.has(item.productId))
      ),
    }))
    setCatalogSelectedIds(new Set())
    setCatalogBulkMode(false)
  }

  const confirmBulkDeletePrepared = () => {
    if (preparedSelectedIds.size === 0) return
    applyWithUndo('Удалены выбранные элементы списка', (prev) => ({
      ...prev,
      preparedItems: normalizePreparedOrder(
        prev.preparedItems.filter((item) => !preparedSelectedIds.has(item.productId))
      ),
    }))
    setPreparedSelectedIds(new Set())
    setPreparedBulkMode(false)
  }

  const confirmBulkDeleteStore = () => {
    if (storeSelectedIds.size === 0) return
    applyWithUndo('Удалены выбранные элементы списка', (prev) => ({
      ...prev,
      preparedItems: normalizePreparedOrder(
        prev.preparedItems.filter((item) => !storeSelectedIds.has(item.productId))
      ),
    }))
    setStoreSelectedIds(new Set())
    setStoreBulkMode(false)
  }

  const updatePreparedQty = (productId: ID, nextQty: number) => {
    setState((prev) => ({
      ...prev,
      preparedItems: prev.preparedItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              qty: Math.max(1, Math.floor(nextQty)),
            }
          : item
      ),
    }))
  }

  const updatePreparedPriceFromInput = (
    productId: ID,
    field: 'estimatedUnitPrice' | 'actualUnitPrice',
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = parsePriceInput(event.target.value)
    setState((prev) => ({
      ...prev,
      preparedItems: prev.preparedItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }))
  }

  const togglePicked = (productId: ID) => {
    setState((prev) => ({
      ...prev,
      preparedItems: prev.preparedItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              picked: !item.picked,
            }
          : item
      ),
    }))
  }

  const completePurchases = () => {
    if (preparedItems.length === 0) return

    const shouldComplete = window.confirm('Завершить покупки и перенести в историю?')
    if (!shouldComplete) return

    setState((prev) => {
      const completedAt = nowIso()
      const historyItems: HistoryItem[] = normalizePreparedOrder(prev.preparedItems).map((item) => {
        const product = prev.products.find((entry) => entry.id === item.productId)
        const chosenPrice = item.actualUnitPrice ?? item.estimatedUnitPrice

        return {
          id: generateId(),
          productId: item.productId,
          productName: product?.name ?? 'Товар',
          unit: product?.unit ?? 'pieces',
          qty: item.qty,
          estimatedUnitPrice: item.estimatedUnitPrice,
          actualUnitPrice: item.actualUnitPrice,
          total: chosenPrice === null ? 0 : chosenPrice * item.qty,
        }
      })

      const updatedProducts = prev.products.map((product) => {
        const lastForProduct = historyItems.filter((item) => item.productId === product.id).at(-1)
        if (!lastForProduct) return product

        const latest = lastForProduct.actualUnitPrice ?? lastForProduct.estimatedUnitPrice

        return {
          ...product,
          latestUnitPrice: latest,
          updatedAt: completedAt,
        }
      })

      const nextSession: HistorySession = {
        id: generateId(),
        completedAt,
        budget: prev.settings.defaultBudget,
        items: historyItems,
      }

      return {
        ...prev,
        products: updatedProducts,
        preparedItems: [],
        history: [nextSession, ...prev.history],
      }
    })

    setPreparedBulkMode(false)
    setStoreBulkMode(false)
    setPreparedSelectedIds(new Set())
    setStoreSelectedIds(new Set())
    setTab('history')
  }

  const restoreFromHistory = (session: HistorySession) => {
    if (preparedItems.length > 0) {
      const shouldReplace = window.confirm(
        'Текущий список покупок не пуст. Заменить его выбранной историей?'
      )
      if (!shouldReplace) return
    }

    setState((prev) => {
      const restoredItems: PreparedItem[] = session.items.map((item, index) => ({
        id: generateId(),
        productId: item.productId,
        qty: item.qty,
        orderIndex: index,
        estimatedUnitPrice: item.estimatedUnitPrice,
        actualUnitPrice: null,
        picked: false,
      }))

      return {
        ...prev,
        preparedItems: normalizePreparedOrder(restoredItems),
      }
    })

    setTab('preparation')
  }

  const nextDeferred = zoneItems.find((item) => !item.inZone)

  return (
    <div className="app">
      <header className="app-header">
        <ShoppingCart className="header-icon" size={24} />
        <span>Умные покупки</span>
      </header>

      {tab === 'catalog' && (
        <main className="tab-content">
          <section className="panel">
            <h2 className="panel-title">Добавить товар</h2>
            <div className="form-row">
              <input
                className="field"
                type="text"
                placeholder="Название"
                value={newProductName}
                onChange={(event) => setNewProductName(event.target.value)}
                onKeyDown={handleNewProductKeyDown}
              />
              <select
                className="field field-sm"
                value={newProductUnit}
                onChange={(event) => setNewProductUnit(event.target.value as Unit)}
              >
                <option value="pieces">Штуки</option>
                <option value="liters">Литры</option>
                <option value="grams">Граммы</option>
              </select>
              <input
                className="field field-sm"
                type="number"
                min={1}
                value={newProductQty}
                onChange={(event) => setNewProductQty(event.target.value)}
              />
              <input
                className="field field-sm"
                type="number"
                min={0}
                placeholder="Цена"
                value={newProductPrice}
                onChange={(event) => setNewProductPrice(event.target.value)}
              />
              <button className="btn btn-primary" onClick={addProduct}>
                <Plus size={16} /> Добавить
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-toolbar">
              <h2 className="panel-title">Ассортимент</h2>
              <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-icon"
                  onClick={() => {
                    setCatalogBulkMode(!catalogBulkMode)
                    setCatalogSelectedIds(new Set())
                  }}
                  aria-label="Режим массового удаления"
                >
                  <Trash2 size={20} />
                </button>
                {catalogBulkMode && (
                  <button
                    className="btn-icon danger"
                    disabled={catalogSelectedIds.size === 0}
                    onClick={confirmBulkDeleteProducts}
                    aria-label="Подтвердить удаление"
                  >
                    <Check size={20} />
                  </button>
                )}
              </div>
            </div>

            {orderedProducts.length === 0 ? (
              <div className="empty-state small">
                <PackageOpen size={32} />
                <p>Ассортимент пока пуст.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onCatalogDragEnd}
              >
                <SortableContext
                  items={orderedProducts.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="list">
                    {orderedProducts.map((product) => (
                      <SortableRow key={product.id} id={product.id}>
                        {catalogBulkMode && (
                          <input
                            type="checkbox"
                            checked={catalogSelectedIds.has(product.id)}
                            onChange={(event) => {
                              const next = new Set(catalogSelectedIds)
                              if (event.target.checked) {
                                next.add(product.id)
                              } else {
                                next.delete(product.id)
                              }
                              setCatalogSelectedIds(next)
                            }}
                          />
                        )}
                        <input
                          className="row-name"
                          type="text"
                          value={product.name}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              name: event.target.value,
                            })
                          }
                        />
                        <div className="counter-wrap">
                          <button
                            className="counter-btn"
                            onClick={() => updateProduct(product.id, { targetQty: Math.max(1, product.targetQty - 1) })}
                          >
                            -
                          </button>
                          <input
                            className="counter-input"
                            type="number"
                            min={1}
                            value={product.targetQty}
                            onChange={(event) =>
                              updateProduct(product.id, {
                                targetQty: parsePositiveInt(event.target.value, 1),
                              })
                            }
                          />
                          <button
                            className="counter-btn"
                            onClick={() => updateProduct(product.id, { targetQty: product.targetQty + 1 })}
                          >
                            +
                          </button>
                        </div>
                        <select
                          className="row-unit"
                          value={product.unit}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              unit: event.target.value as Unit,
                            })
                          }
                        >
                          <option value="pieces">Шт</option>
                          <option value="liters">Л</option>
                          <option value="grams">Г</option>
                        </select>
                        <input
                          className="row-price"
                          type="number"
                          min={0}
                          placeholder="?"
                          value={product.latestUnitPrice ?? ''}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              latestUnitPrice: parsePriceInput(event.target.value),
                            })
                          }
                        />
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </main>
      )}

      {tab === 'preparation' && (
        <main className="tab-content">
          <div style={{ marginBottom: '16px' }}>
            <h2 className="panel-title" style={{ marginBottom: '8px' }}>Бюджет</h2>
            <div className="budget-row">
              <label htmlFor="budget-preparation">Общий бюджет (RSD)</label>
              <input
                id="budget-preparation"
                className="field field-sm"
                type="number"
                min={1}
                value={state.settings.defaultBudget}
                onChange={(event) => updateBudget(event.target.value)}
              />
            </div>
            <div className="budget-summary-line">
              <span>В зоне: {formatCurrencyRsd(coveredTotal)}</span>
              <span>Остаток: {formatCurrencyRsd(budgetRemaining)}</span>
            </div>
            {nextDeferred && (
              <div className="budget-warning">
                <AlertCircle size={16} />
                <span>
                  Остаток {formatCurrencyRsd(budgetRemaining)} не покрывает следующий товар.
                </span>
              </div>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onPreparationDragEnd}
          >
            <div style={{ marginBottom: '16px' }}>
              <div className="panel-toolbar" style={{ marginBottom: '8px' }}>
                <h2 className="panel-title">К покупке</h2>
                <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setPreparedBulkMode(!preparedBulkMode)
                      setPreparedSelectedIds(new Set())
                    }}
                  >
                    <Trash2 size={20} />
                  </button>
                  {preparedBulkMode && (
                    <button
                      className="btn-icon danger"
                      disabled={preparedSelectedIds.size === 0}
                      onClick={confirmBulkDeletePrepared}
                    >
                      <Check size={20} />
                    </button>
                  )}
                </div>
              </div>
              <DroppableList id="prepared-list" items={zoneItems.map(i => i.productId)}>
                <div className="list">
                  {zoneItems.map((item) => {
                    const product = productMap.get(item.productId)
                    if (!product) return null

                    return (
                      <SortableRow
                        key={item.productId}
                        id={item.productId}
                        className={item.inZone ? 'zone-covered' : 'zone-out'}
                      >
                        {preparedBulkMode && (
                          <input
                            type="checkbox"
                            checked={preparedSelectedIds.has(item.productId)}
                            onChange={(event) => {
                              const next = new Set(preparedSelectedIds)
                              if (event.target.checked) next.add(item.productId)
                              else next.delete(item.productId)
                              setPreparedSelectedIds(next)
                            }}
                          />
                        )}
                        <span className="row-name static">{product.name}</span>
                        <div className="counter-wrap">
                          <button
                            className="counter-btn"
                            onClick={() => updatePreparedQty(item.productId, item.qty - 1)}
                          >
                            -
                          </button>
                          <input
                            className="counter-input"
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(event) =>
                              updatePreparedQty(item.productId, parsePositiveInt(event.target.value, 1))
                            }
                          />
                          <button
                            className="counter-btn"
                            onClick={() => updatePreparedQty(item.productId, item.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                        <span className="row-unit fixed">{unitLabel(product.unit)}</span>
                        <input
                          className="row-price"
                          type="number"
                          min={0}
                          placeholder="?"
                          value={item.estimatedUnitPrice ?? ''}
                          onChange={(event) =>
                            updatePreparedPriceFromInput(item.productId, 'estimatedUnitPrice', event)
                          }
                        />
                      </SortableRow>
                    )
                  })}
                  {zoneItems.length === 0 && (
                    <div className="empty-state small">
                      <p>Пусто</p>
                    </div>
                  )}
                </div>
              </DroppableList>
            </div>

            <div>
              <div className="panel-toolbar" style={{ marginBottom: '8px' }}>
                <h2 className="panel-title">Ассортимент</h2>
                <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setCatalogBulkMode(!catalogBulkMode)
                      setCatalogSelectedIds(new Set())
                    }}
                  >
                    <Trash2 size={20} />
                  </button>
                  {catalogBulkMode && (
                    <button
                      className="btn-icon danger"
                      disabled={catalogSelectedIds.size === 0}
                      onClick={confirmBulkDeleteProducts}
                    >
                      <Check size={20} />
                    </button>
                  )}
                </div>
              </div>
              <DroppableList id="assortment-list" items={candidateProducts.map(p => p.id)}>
                <div className="list">
                  {candidateProducts.map((product) => (
                    <SortableRow key={product.id} id={product.id}>
                      {catalogBulkMode && (
                        <input
                          type="checkbox"
                          checked={catalogSelectedIds.has(product.id)}
                          onChange={(event) => {
                            const next = new Set(catalogSelectedIds)
                            if (event.target.checked) next.add(product.id)
                            else next.delete(product.id)
                            setCatalogSelectedIds(next)
                          }}
                        />
                      )}
                      <span className="row-name static">{product.name}</span>
                      <span className="row-muted">{product.targetQty} {unitLabel(product.unit)}</span>
                      <span className="row-muted">{formatPrice(product.latestUnitPrice)}</span>
                    </SortableRow>
                  ))}
                  {candidateProducts.length === 0 && (
                    <div className="empty-state small">
                      <p>Пусто</p>
                    </div>
                  )}
                </div>
              </DroppableList>
            </div>
          </DndContext>
        </main>
      )}

      {tab === 'store' && (
        <main className="tab-content">
          <div style={{ marginBottom: '16px' }}>
            <h2 className="panel-title" style={{ marginBottom: '8px' }}>Бюджет</h2>
            <div className="budget-row">
              <label htmlFor="budget-store">Общий бюджет (RSD)</label>
              <input
                id="budget-store"
                className="field field-sm"
                type="number"
                min={1}
                value={state.settings.defaultBudget}
                onChange={(event) => updateBudget(event.target.value)}
              />
            </div>
            <div className="budget-summary-line">
              <span>Потрачено: {formatCurrencyRsd(inStoreSpent)}</span>
              <span>Остаток: {formatCurrencyRsd(inStoreRemaining)}</span>
            </div>
            {inStoreRemaining < 0 && (
              <div className="budget-warning danger">
                <AlertCircle size={16} />
                <span>Превышен бюджет.</span>
              </div>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onStoreDragEnd}
          >
            <div style={{ marginBottom: '16px' }}>
              <div className="panel-toolbar" style={{ marginBottom: '8px' }}>
                <h2 className="panel-title">К покупке</h2>
                <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setStoreBulkMode(!storeBulkMode)
                      setStoreSelectedIds(new Set())
                    }}
                  >
                    <Trash2 size={20} />
                  </button>
                  {storeBulkMode && (
                    <button
                      className="btn-icon danger"
                      disabled={storeSelectedIds.size === 0}
                      onClick={confirmBulkDeleteStore}
                    >
                      <Check size={20} />
                    </button>
                  )}
                </div>
              </div>
              <DroppableList id="unpicked-list" items={unpickedItems.map(i => i.productId)}>
                <div className="list">
                  {unpickedItems.map((item) => {
                    const product = productMap.get(item.productId)
                    if (!product) return null
                    const chosenPrice = item.actualUnitPrice ?? item.estimatedUnitPrice
                    const rowTotal = chosenPrice === null ? null : chosenPrice * item.qty
                    return (
                      <SortableRow
                        key={item.productId}
                        id={item.productId}
                        className={item.inZone ? 'zone-covered' : 'zone-out'}
                      >
                        {storeBulkMode && (
                          <input
                            type="checkbox"
                            checked={storeSelectedIds.has(item.productId)}
                            onChange={(event) => {
                              const next = new Set(storeSelectedIds)
                              if (event.target.checked) next.add(item.productId)
                              else next.delete(item.productId)
                              setStoreSelectedIds(next)
                            }}
                          />
                        )}
                        <button
                          className={`pick-btn${item.picked ? ' checked' : ''}`}
                          onClick={() => togglePicked(item.productId)}
                          type="button"
                        >
                          <Check size={14} />
                        </button>
                        <span className="row-name static">{product.name}</span>
                        <span className="row-muted">{item.qty} {unitLabel(product.unit)}</span>
                        <input
                          className="row-price"
                          type="number"
                          min={0}
                          placeholder="?"
                          value={item.actualUnitPrice ?? ''}
                          onChange={(event) =>
                            updatePreparedPriceFromInput(item.productId, 'actualUnitPrice', event)
                          }
                        />
                        <span className="row-muted">{rowTotal === null ? '?' : formatCurrencyRsd(rowTotal)}</span>
                      </SortableRow>
                    )
                  })}
                  {unpickedItems.length === 0 && (
                    <div className="empty-state small">
                      <p>Пусто</p>
                    </div>
                  )}
                </div>
              </DroppableList>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div className="panel-toolbar" style={{ marginBottom: '8px' }}>
                <h2 className="panel-title">В корзине</h2>
              </div>
              <DroppableList id="picked-list" items={pickedItems.map(i => i.productId)}>
                <div className="list">
                  {pickedItems.map((item) => {
                    const product = productMap.get(item.productId)
                    if (!product) return null
                    const chosenPrice = item.actualUnitPrice ?? item.estimatedUnitPrice
                    const rowTotal = chosenPrice === null ? null : chosenPrice * item.qty
                    return (
                      <SortableRow
                        key={item.productId}
                        id={item.productId}
                        className={item.inZone ? 'zone-covered' : 'zone-out'}
                      >
                        {storeBulkMode && (
                          <input
                            type="checkbox"
                            checked={storeSelectedIds.has(item.productId)}
                            onChange={(event) => {
                              const next = new Set(storeSelectedIds)
                              if (event.target.checked) next.add(item.productId)
                              else next.delete(item.productId)
                              setStoreSelectedIds(next)
                            }}
                          />
                        )}
                        <button
                          className={`pick-btn${item.picked ? ' checked' : ''}`}
                          onClick={() => togglePicked(item.productId)}
                          type="button"
                        >
                          <Check size={14} />
                        </button>
                        <span className="row-name static">{product.name}</span>
                        <span className="row-muted">{item.qty} {unitLabel(product.unit)}</span>
                        <input
                          className="row-price"
                          type="number"
                          min={0}
                          placeholder="?"
                          value={item.actualUnitPrice ?? ''}
                          onChange={(event) =>
                            updatePreparedPriceFromInput(item.productId, 'actualUnitPrice', event)
                          }
                        />
                        <span className="row-muted">{rowTotal === null ? '?' : formatCurrencyRsd(rowTotal)}</span>
                      </SortableRow>
                    )
                  })}
                  {pickedItems.length === 0 && (
                    <div className="empty-state small">
                      <p>Пусто</p>
                    </div>
                  )}
                </div>
              </DroppableList>
            </div>
          </DndContext>
          
          <div className="panel-footer" style={{ marginTop: '16px' }}>
            <button
              className="btn btn-primary"
              onClick={completePurchases}
              disabled={preparedItems.length === 0}
            >
              Завершить покупки
            </button>
          </div>
        </main>
      )}

      {tab === 'history' && (
        <main className="tab-content">
          <section className="panel">
            <h2 className="panel-title">История покупок</h2>
            {state.history.length === 0 ? (
              <div className="empty-state small">
                <History size={32} />
                <p>История пока пуста.</p>
              </div>
            ) : (
              <div className="history-list">
                {state.history.map((session) => {
                  const total = session.items.reduce((sum, item) => sum + item.total, 0)
                  return (
                    <div key={session.id} className="history-card">
                      <div className="history-head">
                        <strong>
                          {new Date(session.completedAt).toLocaleString('ru-RU')}
                        </strong>
                        <span>{formatCurrencyRsd(total)}</span>
                      </div>
                      {session.items.map((item) => (
                        <div key={item.id} className="history-row">
                          <span>
                            {item.productName} ({item.qty} {unitLabel(item.unit)})
                          </span>
                          <span>{item.total === 0 ? '?' : formatCurrencyRsd(item.total)}</span>
                        </div>
                      ))}
                      <button
                        className="btn btn-outline"
                        onClick={() => restoreFromHistory(session)}
                      >
                        <RotateCcw size={14} /> Возобновить
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {undoAction && (
        <div className="undo-banner">
          <span>{undoAction.message}. Доступна отмена 5 секунд.</span>
          <button className="btn btn-outline" onClick={undoLastDelete}>
            Отмена удаления
          </button>
        </div>
      )}

      <nav className="bottom-nav">
        <button
          className={`nav-btn${tab === 'catalog' ? ' active' : ''}`}
          onClick={() => setTab('catalog')}
        >
          <PackageOpen size={20} />
          <span>Ассортимент</span>
        </button>
        <button
          className={`nav-btn${tab === 'preparation' ? ' active' : ''}`}
          onClick={() => setTab('preparation')}
        >
          <ClipboardList size={20} />
          <span>Подготовка</span>
        </button>
        <button
          className={`nav-btn${tab === 'store' ? ' active' : ''}`}
          onClick={() => setTab('store')}
        >
          <ShoppingBag size={20} />
          <span>Магазин</span>
        </button>
        <button
          className={`nav-btn${tab === 'history' ? ' active' : ''}`}
          onClick={() => setTab('history')}
        >
          <History size={20} />
          <span>История</span>
        </button>
      </nav>
    </div>
  )
}

import {
  useState,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import './App.css'

type ID = string

type StockStatus = 'in_stock' | 'low' | 'out'
type SessionStatus = 'draft' | 'in_progress' | 'completed'
type PriceRoundingStep = 10 | 50 | 100

interface Product {
  id: ID
  name: string
  unit: string
  stockStatus: StockStatus
  orderIndex: number
  latestUnitPrice: number
  createdAt: string
  updatedAt: string
}

interface ShoppingItem {
  id: ID
  productId: ID
  plannedQty: number
  plannedOrder: number
  estimatedUnitPrice: number
  picked: boolean
  actualUnitPrice: number
  removed: boolean
}

interface ShoppingSession {
  id: ID
  status: SessionStatus
  budgetTotal: number
  roundingStep: PriceRoundingStep
  items: ShoppingItem[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

interface PurchaseHistoryEntry {
  id: ID
  sessionId: ID
  productId: ID
  productName: string
  qty: number
  roundedUnitPrice: number
  total: number
  purchasedAt: string
}

interface AppState {
  products: Product[]
  sessions: ShoppingSession[]
  history: PurchaseHistoryEntry[]
  activeSessionId?: ID
}

type Tab = 'catalog' | 'preparation' | 'store' | 'history'

const STORAGE_STATE_V2 = 'sg_state_v2'
const LEGACY_STORAGE_PRODUCTS = 'sg_products'
const LEGACY_STORAGE_SHOPPING = 'sg_shopping'

const defaultState: AppState = {
  products: [],
  sessions: [],
  history: [],
  activeSessionId: undefined,
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function nowIso(): string {
  return new Date().toISOString()
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function roundUpToStep(value: number, step: PriceRoundingStep): number {
  if (value <= 0) return 0
  return Math.ceil(value / step) * step
}

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function normalizeOrder(items: ShoppingItem[]): ShoppingItem[] {
  return items
    .slice()
    .sort((a, b) => a.plannedOrder - b.plannedOrder)
    .map((item, index) => ({ ...item, plannedOrder: index }))
}

function migrateLegacyState(): AppState {
  const legacyProducts = safeLoad<Array<{ id: string; name: string }>>(
    LEGACY_STORAGE_PRODUCTS,
    []
  )
  const legacyShopping = safeLoad<Array<{ productId: string }>>(
    LEGACY_STORAGE_SHOPPING,
    []
  )

  if (legacyProducts.length === 0 && legacyShopping.length === 0) {
    return defaultState
  }

  const migratedProducts: Product[] = legacyProducts.map((p, index) => ({
    id: p.id,
    name: p.name,
    unit: 'шт',
    stockStatus: 'out',
    orderIndex: index,
    latestUnitPrice: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))

  const validLegacyItems = legacyShopping.filter((item) =>
    migratedProducts.some((p) => p.id === item.productId)
  )

  if (validLegacyItems.length === 0) {
    return {
      products: migratedProducts,
      sessions: [],
      history: [],
      activeSessionId: undefined,
    }
  }

  const sessionId = generateId()
  const draftSession: ShoppingSession = {
    id: sessionId,
    status: 'draft',
    budgetTotal: 0,
    roundingStep: 10,
    items: validLegacyItems.map((item, index) => ({
      id: generateId(),
      productId: item.productId,
      plannedQty: 1,
      plannedOrder: index,
      estimatedUnitPrice: 0,
      picked: false,
      actualUnitPrice: 0,
      removed: false,
    })),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  return {
    products: migratedProducts,
    sessions: [draftSession],
    history: [],
    activeSessionId: sessionId,
  }
}

function loadState(): AppState {
  const stored = safeLoad<AppState | null>(STORAGE_STATE_V2, null)
  if (stored && Array.isArray(stored.products) && Array.isArray(stored.sessions)) {
    return {
      products: stored.products,
      sessions: stored.sessions,
      history: stored.history ?? [],
      activeSessionId: stored.activeSessionId,
    }
  }

  return migrateLegacyState()
}

function formatCurrencyRsd(value: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(value)
}

function getStockStatusLabel(status: StockStatus): string {
  if (status === 'in_stock') return 'В наличии'
  if (status === 'low') return 'Мало'
  return 'Нужно купить'
}

export default function App() {
  const [tab, setTab] = useState<Tab>('catalog')
  const [state, setState] = useState<AppState>(() => loadState())
  const [newProductName, setNewProductName] = useState('')
  const [newProductUnit, setNewProductUnit] = useState('шт')
  const [newProductPrice, setNewProductPrice] = useState('0')
  const [newProductStatus, setNewProductStatus] = useState<StockStatus>('out')
  const [draftBudget, setDraftBudget] = useState('5000')
  const [draftRoundingStep, setDraftRoundingStep] =
    useState<PriceRoundingStep>(10)

  useEffect(() => {
    localStorage.setItem(STORAGE_STATE_V2, JSON.stringify(state))
  }, [state])

  const activeSession =
    state.activeSessionId === undefined
      ? undefined
      : state.sessions.find((session) => session.id === state.activeSessionId)

  const orderedProducts = state.products
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const productMap = useMemo(
    () => new Map(state.products.map((p) => [p.id, p])),
    [state.products]
  )

  const orderedSessionItems = normalizeOrder(activeSession?.items ?? []).filter(
    (item) => !item.removed
  )

  const zoneItems = orderedSessionItems.reduce<
    Array<ShoppingItem & { estimatedTotal: number; inZone: boolean }>
  >((acc, item) => {
    const coveredSoFar = acc
      .filter((accItem) => accItem.inZone)
      .reduce((sum, accItem) => sum + accItem.estimatedTotal, 0)
    const estimatedTotal = item.estimatedUnitPrice * item.plannedQty
    const inZone = coveredSoFar + estimatedTotal <= (activeSession?.budgetTotal ?? 0)
    acc.push({
      ...item,
      estimatedTotal,
      inZone,
    })
    return acc
  }, [])

  const coveredTotal = zoneItems
    .filter((item) => item.inZone)
    .reduce((sum, item) => sum + item.estimatedTotal, 0)

  const deferredItems = zoneItems.filter((item) => !item.inZone)
  const nextDeferred = deferredItems[0]
  const budgetRemainingForPlan = Math.max((activeSession?.budgetTotal ?? 0) - coveredTotal, 0)

  const inStoreSpent = zoneItems
    .filter((item) => item.picked)
    .reduce((sum, item) => {
      const rounded = roundUpToStep(
        item.actualUnitPrice,
        activeSession?.roundingStep ?? 10
      )
      return sum + rounded * item.plannedQty
    }, 0)

  const inStoreRemaining = (activeSession?.budgetTotal ?? 0) - inStoreSpent

  const addProduct = () => {
    const name = newProductName.trim()
    const unit = newProductUnit.trim() || 'шт'
    const price = clampNonNegative(toNumber(newProductPrice, 0))
    if (!name) return

    setState((prev) => {
      const createdAt = nowIso()
      const nextProduct: Product = {
        id: generateId(),
        name,
        unit,
        stockStatus: newProductStatus,
        orderIndex: prev.products.length,
        latestUnitPrice: price,
        createdAt,
        updatedAt: createdAt,
      }
      return {
        ...prev,
        products: [...prev.products, nextProduct],
      }
    })

    setNewProductName('')
    setNewProductUnit('шт')
    setNewProductPrice('0')
    setNewProductStatus('out')
  }

  const handleNewProductKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addProduct()
  }

  const deleteProduct = (id: string) => {
    setState((prev) => {
      const remainingProducts = prev.products
        .filter((p) => p.id !== id)
        .map((p, index) => ({ ...p, orderIndex: index }))

      const sessions = prev.sessions.map((session) => ({
        ...session,
        items: normalizeOrder(session.items.filter((item) => item.productId !== id)),
        updatedAt: nowIso(),
      }))

      return {
        ...prev,
        products: remainingProducts,
        sessions,
        history: prev.history.filter((entry) => entry.productId !== id),
      }
    })
  }

  const updateProduct = (id: string, patch: Partial<Product>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.id === id
          ? {
              ...product,
              ...patch,
              updatedAt: nowIso(),
            }
          : product
      ),
    }))
  }

  const moveProductOrder = (id: string, direction: -1 | 1) => {
    setState((prev) => {
      const ordered = prev.products.slice().sort((a, b) => a.orderIndex - b.orderIndex)
      const index = ordered.findIndex((p) => p.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) {
        return prev
      }

      const swapped = ordered.slice()
      const temp = swapped[index]
      swapped[index] = swapped[nextIndex]
      swapped[nextIndex] = temp

      return {
        ...prev,
        products: swapped.map((p, idx) => ({ ...p, orderIndex: idx })),
      }
    })
  }

  const createDraftSession = () => {
    const budget = clampNonNegative(toNumber(draftBudget, 0))
    if (budget <= 0) return

    setState((prev) => {
      const sessionId = generateId()
      const createdAt = nowIso()
      const session: ShoppingSession = {
        id: sessionId,
        status: 'draft',
        budgetTotal: budget,
        roundingStep: draftRoundingStep,
        items: [],
        createdAt,
        updatedAt: createdAt,
      }

      return {
        ...prev,
        sessions: [...prev.sessions, session],
        activeSessionId: sessionId,
      }
    })
  }

  const closeActiveSession = () => {
    setState((prev) => ({
      ...prev,
      activeSessionId: undefined,
    }))
  }

  const updateActiveSession = (updater: (session: ShoppingSession) => ShoppingSession) => {
    if (!activeSession) return
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === activeSession.id ? updater(session) : session
      ),
    }))
  }

  const toggleIncludeInSession = (productId: string) => {
    if (!activeSession || activeSession.status !== 'draft') return

    updateActiveSession((session) => {
      const existing = session.items.find(
        (item) => item.productId === productId && !item.removed
      )

      if (existing) {
        return {
          ...session,
          items: normalizeOrder(
            session.items.map((item) =>
              item.id === existing.id ? { ...item, removed: true } : item
            )
          ),
          updatedAt: nowIso(),
        }
      }

      const product = productMap.get(productId)
      const newItem: ShoppingItem = {
        id: generateId(),
        productId,
        plannedQty: 1,
        plannedOrder: session.items.filter((item) => !item.removed).length,
        estimatedUnitPrice: product?.latestUnitPrice ?? 0,
        picked: false,
        actualUnitPrice: 0,
        removed: false,
      }

      return {
        ...session,
        items: normalizeOrder([...session.items, newItem]),
        updatedAt: nowIso(),
      }
    })
  }

  const isIncludedInActiveSession = (productId: string) =>
    activeSession?.items.some((item) => item.productId === productId && !item.removed) ??
    false

  const moveShoppingItem = (itemId: string, direction: -1 | 1) => {
    if (!activeSession || activeSession.status !== 'draft') return
    updateActiveSession((session) => {
      const activeItems = normalizeOrder(session.items.filter((item) => !item.removed))
      const index = activeItems.findIndex((item) => item.id === itemId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= activeItems.length) {
        return session
      }

      const reordered = activeItems.slice()
      const temp = reordered[index]
      reordered[index] = reordered[nextIndex]
      reordered[nextIndex] = temp

      const reorderedIds = reordered.map((item) => item.id)
      const updatedItems = session.items.map((item) => {
        const order = reorderedIds.indexOf(item.id)
        if (order === -1) return item
        return { ...item, plannedOrder: order }
      })

      return {
        ...session,
        items: updatedItems,
        updatedAt: nowIso(),
      }
    })
  }

  const updateSessionItemField = (
    itemId: string,
    field: 'plannedQty' | 'estimatedUnitPrice' | 'actualUnitPrice',
    value: number
  ) => {
    if (!activeSession) return
    updateActiveSession((session) => ({
      ...session,
      items: session.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: clampNonNegative(value),
            }
          : item
      ),
      updatedAt: nowIso(),
    }))
  }

  const updateSessionItemNumericFromInput = (
    itemId: string,
    field: 'plannedQty' | 'estimatedUnitPrice' | 'actualUnitPrice',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    updateSessionItemField(itemId, field, toNumber(e.target.value, 0))
  }

  const setSessionRoundingStep = (step: PriceRoundingStep) => {
    if (!activeSession || activeSession.status !== 'draft') return
    updateActiveSession((session) => ({
      ...session,
      roundingStep: step,
      updatedAt: nowIso(),
    }))
  }

  const setSessionBudget = (value: number) => {
    if (!activeSession || activeSession.status !== 'draft') return
    updateActiveSession((session) => ({
      ...session,
      budgetTotal: clampNonNegative(value),
      updatedAt: nowIso(),
    }))
  }

  const startShopping = () => {
    if (!activeSession || activeSession.status !== 'draft') return
    updateActiveSession((session) => ({
      ...session,
      status: 'in_progress',
      updatedAt: nowIso(),
    }))
    setTab('store')
  }

  const togglePicked = (itemId: string) => {
    if (!activeSession || activeSession.status !== 'in_progress') return
    updateActiveSession((session) => ({
      ...session,
      items: session.items.map((item) =>
        item.id === itemId ? { ...item, picked: !item.picked } : item
      ),
      updatedAt: nowIso(),
    }))
  }

  const removeSessionItem = (itemId: string) => {
    if (!activeSession) return
    updateActiveSession((session) => ({
      ...session,
      items: normalizeOrder(
        session.items.map((item) =>
          item.id === itemId ? { ...item, removed: true, picked: false } : item
        )
      ),
      updatedAt: nowIso(),
    }))
  }

  const completeSession = () => {
    if (!activeSession || activeSession.status !== 'in_progress') return

    const completedAt = nowIso()
    const pickedItems = normalizeOrder(activeSession.items).filter(
      (item) => !item.removed && item.picked
    )

    const entries: PurchaseHistoryEntry[] = pickedItems.map((item) => {
      const product = productMap.get(item.productId)
      const rounded = roundUpToStep(item.actualUnitPrice, activeSession.roundingStep)
      return {
        id: generateId(),
        sessionId: activeSession.id,
        productId: item.productId,
        productName: product?.name ?? 'Удаленный товар',
        qty: item.plannedQty,
        roundedUnitPrice: rounded,
        total: rounded * item.plannedQty,
        purchasedAt: completedAt,
      }
    })

    setState((prev) => {
      const updatedProducts = prev.products.map((product) => {
        const latestForProduct = entries
          .filter((entry) => entry.productId === product.id)
          .at(-1)
        if (!latestForProduct) return product
        return {
          ...product,
          latestUnitPrice: latestForProduct.roundedUnitPrice,
          updatedAt: completedAt,
        }
      })

      const updatedSessions = prev.sessions.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              status: 'completed' as const,
              completedAt,
              updatedAt: completedAt,
            }
          : session
      )

      return {
        ...prev,
        products: updatedProducts,
        sessions: updatedSessions,
        history: [...prev.history, ...entries],
        activeSessionId: undefined,
      }
    })

    setTab('history')
  }

  const completedSessions = state.sessions
    .filter((session) => session.status === 'completed')
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.completedAt ?? a.updatedAt).getTime()
      const tb = new Date(b.completedAt ?? b.updatedAt).getTime()
      return tb - ta
    })

  const activeSessionItemCount = orderedSessionItems.length

  const stockFilters: Array<{ value: StockStatus; label: string }> = [
    { value: 'out', label: 'Нужно купить' },
    { value: 'low', label: 'Мало' },
    { value: 'in_stock', label: 'В наличии' },
  ]

  const candidateProducts = orderedProducts.filter(
    (product) => product.stockStatus === 'out' || product.stockStatus === 'low'
  )

  return (
    <div className="app">
      <header className="app-header">🛒 Умный список покупок</header>

      <nav className="tabs">
        <button
          className={`tab-btn${tab === 'catalog' ? ' active' : ''}`}
          onClick={() => setTab('catalog')}
        >
          Ассортимент
        </button>
        <button
          className={`tab-btn${tab === 'preparation' ? ' active' : ''}`}
          onClick={() => setTab('preparation')}
        >
          Подготовка
        </button>
        <button
          className={`tab-btn${tab === 'store' ? ' active' : ''}`}
          onClick={() => setTab('store')}
        >
          В магазине
        </button>
        <button
          className={`tab-btn${tab === 'history' ? ' active' : ''}`}
          onClick={() => setTab('history')}
        >
          История
        </button>
      </nav>

      {tab === 'catalog' && (
        <main className="tab-content">
          <div className="add-form">
            <input
              type="text"
              placeholder="Название продукта"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              onKeyDown={handleNewProductKeyDown}
              autoFocus
            />
            <input
              className="small-input"
              type="text"
              value={newProductUnit}
              onChange={(e) => setNewProductUnit(e.target.value)}
              placeholder="Ед."
            />
            <input
              className="small-input"
              type="number"
              min={0}
              value={newProductPrice}
              onChange={(e) => setNewProductPrice(e.target.value)}
              placeholder="Цена"
            />
            <select
              className="status-select"
              value={newProductStatus}
              onChange={(e) => setNewProductStatus(e.target.value as StockStatus)}
            >
              {stockFilters.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={addProduct}>
              Добавить
            </button>
          </div>

          {orderedProducts.length === 0 ? (
            <div className="empty-state">
              <span className="icon">🥦</span>
              Список ассортимента пуст.
              <br />
              Добавьте продукты выше.
            </div>
          ) : (
            <>
              <p className="section-title">Ассортимент</p>
              <div className="product-list">
                {orderedProducts.map((product) => {
                  return (
                    <div key={product.id} className="product-item">
                      <div className="product-main">
                        <input
                          className="inline-text"
                          type="text"
                          value={product.name}
                          onChange={(e) =>
                            updateProduct(product.id, { name: e.target.value })
                          }
                        />
                        <input
                          className="inline-unit"
                          type="text"
                          value={product.unit}
                          onChange={(e) =>
                            updateProduct(product.id, { unit: e.target.value })
                          }
                        />
                        <input
                          className="inline-price"
                          type="number"
                          min={0}
                          value={product.latestUnitPrice}
                          onChange={(e) =>
                            updateProduct(product.id, {
                              latestUnitPrice: clampNonNegative(toNumber(e.target.value, 0)),
                            })
                          }
                        />
                        <select
                          className="status-select"
                          value={product.stockStatus}
                          onChange={(e) =>
                            updateProduct(product.id, {
                              stockStatus: e.target.value as StockStatus,
                            })
                          }
                        >
                          {stockFilters.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="product-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => moveProductOrder(product.id, -1)}
                          title="Вверх"
                        >
                          ↑
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => moveProductOrder(product.id, 1)}
                          title="Вниз"
                        >
                          ↓
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => deleteProduct(product.id)}
                          title="Удалить продукт"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </main>
      )}

      {tab === 'preparation' && (
        <main className="tab-content">
          {!activeSession ? (
            <div className="card">
              <p className="section-title">Создать сессию покупок</p>
              <div className="grid-row">
                <label className="field-label" htmlFor="budget-input">
                  Целевой бюджет (RSD)
                </label>
                <input
                  id="budget-input"
                  type="number"
                  min={0}
                  value={draftBudget}
                  onChange={(e) => setDraftBudget(e.target.value)}
                />
              </div>
              <div className="grid-row">
                <label className="field-label" htmlFor="rounding-step">
                  Шаг округления цены
                </label>
                <select
                  id="rounding-step"
                  value={draftRoundingStep}
                  onChange={(e) =>
                    setDraftRoundingStep(Number(e.target.value) as PriceRoundingStep)
                  }
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={createDraftSession}>
                Создать
              </button>
            </div>
          ) : (
            <>
              <div className="shopping-summary">
                <span>Статус: {activeSession.status === 'draft' ? 'Черновик' : 'В процессе'}</span>
                <span>Бюджет: {formatCurrencyRsd(activeSession.budgetTotal)}</span>
              </div>

              <div className="card">
                <p className="section-title">Параметры сессии</p>
                <div className="grid-row">
                  <label className="field-label" htmlFor="session-budget">
                    Целевой бюджет (RSD)
                  </label>
                  <input
                    id="session-budget"
                    type="number"
                    min={0}
                    disabled={activeSession.status !== 'draft'}
                    value={activeSession.budgetTotal}
                    onChange={(e) => setSessionBudget(toNumber(e.target.value, 0))}
                  />
                </div>
                <div className="grid-row">
                  <label className="field-label" htmlFor="session-rounding">
                    Шаг округления цены
                  </label>
                  <select
                    id="session-rounding"
                    disabled={activeSession.status !== 'draft'}
                    value={activeSession.roundingStep}
                    onChange={(e) =>
                      setSessionRoundingStep(Number(e.target.value) as PriceRoundingStep)
                    }
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="actions-row">
                  <button
                    className="btn btn-primary"
                    disabled={activeSession.status !== 'draft' || activeSessionItemCount === 0}
                    onClick={startShopping}
                  >
                    Начать покупки
                  </button>
                  <button className="btn btn-outline" onClick={closeActiveSession}>
                    Закрыть сессию
                  </button>
                </div>
              </div>

              <p className="section-title">Отметка из ассортимента</p>
              {candidateProducts.length === 0 ? (
                <div className="empty-state">Нет товаров со статусом «Нужно купить» или «Мало».</div>
              ) : (
                <div className="product-list">
                  {candidateProducts.map((product) => {
                    const included = isIncludedInActiveSession(product.id)
                    return (
                      <div key={product.id} className={`product-item${included ? ' in-cart' : ''}`}>
                        <div className="candidate-main">
                          <strong>{product.name}</strong>
                          <span>
                            {getStockStatusLabel(product.stockStatus)} · {formatCurrencyRsd(product.latestUnitPrice)} / {product.unit}
                          </span>
                        </div>
                        <button
                          className={`btn ${included ? 'btn-outline' : 'btn-primary'}`}
                          disabled={activeSession.status !== 'draft'}
                          onClick={() => toggleIncludeInSession(product.id)}
                        >
                          {included ? 'Убрать' : 'Добавить'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="section-title">Список покупок и бюджетная зона</p>
              {zoneItems.length === 0 ? (
                <div className="empty-state">Добавьте товары из ассортимента.</div>
              ) : (
                <>
                  <div className="budget-zone-summary">
                    <span>Покрыто бюджетом: {formatCurrencyRsd(coveredTotal)}</span>
                    <span>Остаток: {formatCurrencyRsd(budgetRemainingForPlan)}</span>
                    {nextDeferred && budgetRemainingForPlan < nextDeferred.estimatedTotal && (
                      <span className="warn-text">
                        Недорасходованный остаток {formatCurrencyRsd(budgetRemainingForPlan)} — недостаточно для следующего товара
                      </span>
                    )}
                  </div>
                  <div className="product-list">
                    {zoneItems.map((item) => {
                      const product = productMap.get(item.productId)
                      if (!product) return null
                      return (
                        <div
                          key={item.id}
                          className={`shopping-item budget-item${item.inZone ? ' in-budget' : ' out-budget'}`}
                        >
                          <div className="zone-indicator">{item.inZone ? 'В бюджете' : 'Вне бюджета'}</div>
                          <div className="shopping-name-col">
                            <strong className="shopping-name">{product.name}</strong>
                            <span className="muted-line">
                              Оценка: {formatCurrencyRsd(item.estimatedTotal)} ({formatCurrencyRsd(item.estimatedUnitPrice)} × {item.plannedQty})
                            </span>
                          </div>
                          <div className="item-controls">
                            <input
                              className="small-input"
                              type="number"
                              min={1}
                              disabled={activeSession.status !== 'draft'}
                              value={item.plannedQty}
                              onChange={(e) =>
                                updateSessionItemNumericFromInput(item.id, 'plannedQty', e)
                              }
                            />
                            <input
                              className="small-input"
                              type="number"
                              min={0}
                              disabled={activeSession.status !== 'draft'}
                              value={item.estimatedUnitPrice}
                              onChange={(e) =>
                                updateSessionItemNumericFromInput(
                                  item.id,
                                  'estimatedUnitPrice',
                                  e
                                )
                              }
                            />
                            <button
                              className="btn btn-outline"
                              disabled={activeSession.status !== 'draft'}
                              onClick={() => moveShoppingItem(item.id, -1)}
                              title="Вверх"
                            >
                              ↑
                            </button>
                            <button
                              className="btn btn-outline"
                              disabled={activeSession.status !== 'draft'}
                              onClick={() => moveShoppingItem(item.id, 1)}
                              title="Вниз"
                            >
                              ↓
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => removeSessionItem(item.id)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      )}

      {tab === 'store' && (
        <main className="tab-content">
          {!activeSession ? (
            <div className="empty-state">
              Нет активной сессии.
              <br />
              Перейдите на вкладку «Подготовка».
            </div>
          ) : activeSession.status === 'draft' ? (
            <div className="empty-state">
              Сессия в статусе черновика.
              <br />
              Нажмите «Начать покупки» на вкладке «Подготовка».
            </div>
          ) : (
            <>
              <div className="shopping-summary">
                <span>Потрачено: {formatCurrencyRsd(inStoreSpent)}</span>
                <span>Остаток: {formatCurrencyRsd(inStoreRemaining)}</span>
              </div>

              {inStoreRemaining < 0 && (
                <div className="warn-box">Превышение бюджета. Удалите позиции или скорректируйте цены.</div>
              )}

              <p className="section-title">В магазине</p>
              <div className="product-list">
                {zoneItems.map((item) => {
                  const product = productMap.get(item.productId)
                  if (!product) return null
                  const rounded = roundUpToStep(
                    item.actualUnitPrice,
                    activeSession.roundingStep
                  )
                  const actualTotal = rounded * item.plannedQty
                  return (
                    <div key={item.id} className={`shopping-item${item.picked ? ' bought' : ''}`}>
                      <button
                        className={`checkbox-btn${item.picked ? ' checked' : ''}`}
                        onClick={() => togglePicked(item.id)}
                      >
                        {item.picked ? '✓' : ''}
                      </button>
                      <div className="shopping-name-col">
                        <strong className="shopping-name">{product.name}</strong>
                        <span className="muted-line">{product.unit} · Кол-во: {item.plannedQty}</span>
                        <span className="muted-line">
                          Округлено: {formatCurrencyRsd(rounded)} · Сумма: {formatCurrencyRsd(actualTotal)}
                        </span>
                      </div>
                      <div className="item-controls">
                        <input
                          className="small-input"
                          type="number"
                          min={0}
                          value={item.actualUnitPrice}
                          onChange={(e) =>
                            updateSessionItemNumericFromInput(item.id, 'actualUnitPrice', e)
                          }
                        />
                        <button className="btn btn-danger" onClick={() => removeSessionItem(item.id)}>
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button className="btn btn-primary" onClick={completeSession}>
                Завершить покупку
              </button>
            </>
          )}
        </main>
      )}

      {tab === 'history' && (
        <main className="tab-content">
          {completedSessions.length === 0 ? (
            <div className="empty-state">История пока пуста.</div>
          ) : (
            <div className="product-list">
              {completedSessions.map((session) => {
                const entries = state.history.filter((entry) => entry.sessionId === session.id)
                const total = entries.reduce((sum, entry) => sum + entry.total, 0)
                return (
                  <div key={session.id} className="history-card">
                    <div className="history-head">
                      <strong>{new Date(session.completedAt ?? session.updatedAt).toLocaleString('ru-RU')}</strong>
                      <span>{formatCurrencyRsd(total)}</span>
                    </div>
                    <div className="history-list">
                      {entries.map((entry) => (
                        <div key={entry.id} className="history-row">
                          <span>{entry.productName}</span>
                          <span>
                            {entry.qty} × {formatCurrencyRsd(entry.roundedUnitPrice)} = {formatCurrencyRsd(entry.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      )}
    </div>
  )
}

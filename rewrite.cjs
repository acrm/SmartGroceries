const fs = require('fs');

const appTsxContent = `import {
  useState,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { 
  PackageOpen, 
  ClipboardList, 
  ShoppingCart, 
  History, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  AlertCircle,
  ShoppingBag,
  X
} from 'lucide-react'
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
  const [newProductPrice, setNewProductPrice] = useState('')
  const [newProductStatus, setNewProductStatus] = useState<StockStatus>('out')
  const [draftBudget, setDraftBudget] = useState('5000')
  const [draftRoundingStep, setDraftRoundingStep] =
    useState<PriceRoundingStep>(10)
  const [showAddForm, setShowAddForm] = useState(false)

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
    setNewProductPrice('')
    setNewProductStatus('out')
    setShowAddForm(false)
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

  const updateSessionItemNumericFromInput = (
    itemId: string,
    field: 'plannedQty' | 'estimatedUnitPrice' | 'actualUnitPrice',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    if (!activeSession) return
    updateActiveSession((session) => ({
      ...session,
      items: session.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: clampNonNegative(toNumber(e.target.value, 0)),
            }
          : item
      ),
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

  return (
    <div className="app">
      <header className="app-header">
        <ShoppingCart className="header-icon" size={28} />
        <span>Умные покупки</span>
      </header>

      {tab === 'catalog' && (
        <main className="tab-content">
          <div className="flex-row">
            <h2 className="section-title flex-1">Ассортимент продуктов</h2>
            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={18} /> Добавить
            </button>
          </div>

          {showAddForm && (
            <div className="card">
              <div className="input-group">
                <label className="input-label">Название</label>
                <input
                  className="modern-input"
                  type="text"
                  placeholder="Например: Молоко"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  onKeyDown={handleNewProductKeyDown}
                  autoFocus
                />
              </div>
              <div className="flex-row">
                <div className="input-group flex-1">
                  <label className="input-label">Цена</label>
                  <input
                    className="modern-input"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ width: '80px' }}>
                  <label className="input-label">Ед.</label>
                  <input
                    className="modern-input"
                    type="text"
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Статус</label>
                <select
                  className="modern-select"
                  value={newProductStatus}
                  onChange={(e) => setNewProductStatus(e.target.value as StockStatus)}
                >
                  <option value="out">Нужно купить</option>
                  <option value="low">Мало</option>
                  <option value="in_stock">В наличии</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={addProduct}>
                Сохранить
              </button>
            </div>
          )}

          {orderedProducts.length === 0 ? (
            <div className="empty-state">
              <PackageOpen size={48} className="empty-icon" />
              <h3>Ассортимент пуст</h3>
              <p>Добавьте свои первые продукты, чтобы начать составлять списки покупок.</p>
            </div>
          ) : (
            <div className="list-container">
              {orderedProducts.map((product) => (
                <div key={product.id} className="list-item">
                  <div className="item-header">
                    <div className="item-title-col">
                      <input
                        className="item-title modern-input"
                        style={{ padding: '4px 8px', margin: '-4px -8px', width: '100%', border: '1px solid transparent' }}
                        value={product.name}
                        onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                      />
                      <div className="item-subtitle" style={{marginTop: '4px'}}>
                        <span className={\`badge badge-\${product.stockStatus}\`}>
                          {getStockStatusLabel(product.stockStatus)}
                        </span>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button className="btn-icon" onClick={() => moveProductOrder(product.id, -1)}><ArrowUp size={20} /></button>
                      <button className="btn-icon" onClick={() => moveProductOrder(product.id, 1)}><ArrowDown size={20} /></button>
                      <button className="btn-icon danger" onClick={() => deleteProduct(product.id)}><Trash2 size={20} /></button>
                    </div>
                  </div>
                  <div className="item-controls-row">
                    <select
                      className="modern-select"
                      style={{ width: '140px', padding: '6px' }}
                      value={product.stockStatus}
                      onChange={(e) => updateProduct(product.id, { stockStatus: e.target.value as StockStatus })}
                    >
                      <option value="out">Нужно купить</option>
                      <option value="low">Мало</option>
                      <option value="in_stock">В наличии</option>
                    </select>
                    <div className="inline-edit flex-1">
                      <input
                        className="inline-input"
                        style={{flex: 1, textAlign: 'right'}}
                        type="number"
                        min={0}
                        value={product.latestUnitPrice || ''}
                        placeholder="Цена"
                        onChange={(e) => updateProduct(product.id, { latestUnitPrice: clampNonNegative(toNumber(e.target.value, 0)) })}
                      />
                      <span style={{color: 'var(--color-text-secondary)', paddingRight: '8px'}}>RSD /{product.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {tab === 'preparation' && (
        <main className="tab-content">
          {!activeSession ? (
            <div className="empty-state">
              <ClipboardList size={48} className="empty-icon" />
              <h3>Подготовка к покупкам</h3>
              <p>Создайте новую сессию, чтобы распланировать бюджет и выбрать товары.</p>
              <div className="card" style={{width: '100%', marginTop: '16px', textAlign: 'left'}}>
                <div className="input-group">
                  <label className="input-label">Бюджет (RSD)</label>
                  <input className="modern-input" type="number" min={0} value={draftBudget} onChange={(e) => setDraftBudget(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Округление цен</label>
                  <select className="modern-select" value={draftRoundingStep} onChange={(e) => setDraftRoundingStep(Number(e.target.value) as PriceRoundingStep)}>
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={createDraftSession}>Создать план</button>
              </div>
            </div>
          ) : (
            <>
              <div className="budget-summary">
                <div className="budget-summary-row">
                  <span>Общий бюджет:</span>
                  <strong>{formatCurrencyRsd(activeSession.budgetTotal)}</strong>
                </div>
                <div className="budget-summary-row" style={{color: 'var(--color-bought-text)'}}>
                  <span>В зоне бюджета:</span>
                  <strong>{formatCurrencyRsd(coveredTotal)}</strong>
                </div>
                <div className="budget-summary-row" style={{color: 'var(--color-warn-text)'}}>
                  <span>Остаток:</span>
                  <strong>{formatCurrencyRsd(budgetRemainingForPlan)}</strong>
                </div>
              </div>

              {nextDeferred && budgetRemainingForPlan < nextDeferred.estimatedTotal && (
                <div className="budget-alert">
                  <AlertCircle size={20} />
                  <span>Остаток {formatCurrencyRsd(budgetRemainingForPlan)} не покрывает следующий товар «{productMap.get(nextDeferred.productId)?.name}».</span>
                </div>
              )}

              <div className="flex-row">
                <button className="btn btn-primary flex-1" onClick={startShopping} disabled={activeSession.status !== 'draft' || orderedSessionItems.length === 0}>
                  Начать покупки
                </button>
                <button className="btn btn-outline" onClick={closeActiveSession}>
                  Отмена
                </button>
              </div>

              <h2 className="section-title">Нужно купить</h2>
              {orderedProducts.filter(p => !isIncludedInActiveSession(p.id) && p.stockStatus !== 'in_stock').length === 0 ? (
                <p style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)'}}>Все нужные товары уже в списке.</p>
              ) : (
                <div className="list-container">
                  {orderedProducts.filter(p => p.stockStatus !== 'in_stock').map((product) => {
                    const included = isIncludedInActiveSession(product.id)
                    return (
                      <div key={product.id} className="list-item" style={{ flexDirection: 'row', alignItems: 'center', padding: '12px 16px', opacity: included ? 0.6 : 1 }}>
                        <div className="flex-1">
                          <div className="item-title">{product.name}</div>
                          <div className="item-subtitle">{formatCurrencyRsd(product.latestUnitPrice)}</div>
                        </div>
                        <button className={\`btn \${included ? 'btn-outline' : 'btn-primary'}\`} onClick={() => toggleIncludeInSession(product.id)} style={{padding: '8px 12px'}}>
                          {included ? 'Убрать' : 'Добавить'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <h2 className="section-title">План покупок</h2>
              {zoneItems.length === 0 ? (
                <p style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)'}}>Добавьте товары из списка выше.</p>
              ) : (
                <div className="list-container">
                  {zoneItems.map((item) => {
                    const product = productMap.get(item.productId)
                    if (!product) return null
                    return (
                      <div key={item.id} className={\`list-item \${item.inZone ? 'zone-in' : 'zone-out'}\`}>
                        <div className="item-header">
                          <div className="item-title-col">
                            <div className="item-title">{product.name}</div>
                            <div className="item-subtitle">Итого: {formatCurrencyRsd(item.estimatedTotal)}</div>
                          </div>
                          <div className="item-actions">
                            <button className="btn-icon" onClick={() => moveShoppingItem(item.id, -1)}><ArrowUp size={20} /></button>
                            <button className="btn-icon" onClick={() => moveShoppingItem(item.id, 1)}><ArrowDown size={20} /></button>
                            <button className="btn-icon danger" onClick={() => removeSessionItem(item.id)}><X size={20} /></button>
                          </div>
                        </div>
                        <div className="item-controls-row">
                          <div className="inline-edit flex-1">
                            <input className="inline-input" type="number" min={1} value={item.plannedQty} onChange={(e) => updateSessionItemNumericFromInput(item.id, 'plannedQty', e)} />
                            <span style={{color: 'var(--color-text-secondary)', paddingRight: '8px'}}>{product.unit}</span>
                          </div>
                          <div className="inline-edit flex-1">
                            <input className="inline-input" type="number" min={0} value={item.estimatedUnitPrice} onChange={(e) => updateSessionItemNumericFromInput(item.id, 'estimatedUnitPrice', e)} />
                            <span style={{color: 'var(--color-text-secondary)', paddingRight: '8px'}}>RSD</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {tab === 'store' && (
        <main className="tab-content">
          {!activeSession || activeSession.status === 'draft' ? (
            <div className="empty-state">
              <ShoppingBag size={48} className="empty-icon" />
              <h3>Режим магазина</h3>
              <p>Начните сессию на вкладке «Подготовка», чтобы собирать корзину.</p>
            </div>
          ) : (
            <>
              <div className="budget-summary">
                <div className="budget-summary-row">
                  <span>Потрачено:</span>
                  <strong style={{color: 'var(--color-bought-text)'}}>{formatCurrencyRsd(inStoreSpent)}</strong>
                </div>
                <div className="budget-summary-row">
                  <span>Осталось от бюджета:</span>
                  <strong style={{color: inStoreRemaining < 0 ? 'var(--color-danger)' : 'inherit'}}>
                    {formatCurrencyRsd(inStoreRemaining)}
                  </strong>
                </div>
              </div>

              {inStoreRemaining < 0 && (
                <div className="budget-alert" style={{background: 'var(--color-danger)', color: 'white'}}>
                  <AlertCircle size={20} /> Превышение бюджета!
                </div>
              )}

              <div className="list-container">
                {zoneItems.map((item) => {
                  const product = productMap.get(item.productId)
                  if (!product) return null
                  const rounded = roundUpToStep(item.actualUnitPrice, activeSession.roundingStep)
                  const actualTotal = rounded * item.plannedQty
                  return (
                    <div key={item.id} className="list-item" style={{padding: '12px', background: item.picked ? 'var(--color-primary-light)' : 'var(--color-white)'}}>
                      <div className={\`store-item \${item.picked ? 'checked' : ''}\`}>
                        <div className={\`check-circle \${item.picked ? 'checked' : ''}\`} onClick={() => togglePicked(item.id)}>
                          <Check size={20} />
                        </div>
                        <div className="item-title-col">
                          <div className="item-title">{product.name}</div>
                          <div className="item-subtitle">
                            {item.plannedQty} {product.unit} × {formatCurrencyRsd(rounded)} = {formatCurrencyRsd(actualTotal)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="item-controls-row" style={{marginTop: '4px'}}>
                        <div className="inline-edit flex-1">
                          <span style={{color: 'var(--color-text-secondary)', paddingLeft: '8px'}}>Ввод цены:</span>
                          <input 
                            className="inline-input" 
                            style={{ flex: 1, textAlign: 'right' }}
                            type="number" 
                            min={0} 
                            value={item.actualUnitPrice || ''} 
                            placeholder="0"
                            onChange={(e) => {
                              updateSessionItemNumericFromInput(item.id, 'actualUnitPrice', e);
                              if (!item.picked && Number(e.target.value) > 0) togglePicked(item.id);
                            }} 
                          />
                          <span style={{color: 'var(--color-text-secondary)', paddingRight: '8px'}}>RSD</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="btn btn-primary" style={{marginTop: 'auto'}} onClick={completeSession}>
                Завершить покупку
              </button>
            </>
          )}
        </main>
      )}

      {tab === 'history' && (
        <main className="tab-content">
          {state.sessions.filter((s) => s.status === 'completed').length === 0 ? (
            <div className="empty-state">
              <History size={48} className="empty-icon" />
              <h3>История пуста</h3>
              <p>Здесь будут отображаться ваши завершенные покупки.</p>
            </div>
          ) : (
            <div className="list-container">
              {state.sessions
                .filter((s) => s.status === 'completed')
                .slice()
                .sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime())
                .map((session) => {
                  const entries = state.history.filter((entry) => entry.sessionId === session.id)
                  const total = entries.reduce((sum, entry) => sum + entry.total, 0)
                  return (
                    <div key={session.id} className="card">
                      <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '8px'}}>
                        <strong style={{color: 'var(--color-text-secondary)'}}>
                          {new Date(session.completedAt ?? session.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </strong>
                        <strong style={{fontSize: '1.1rem'}}>{formatCurrencyRsd(total)}</strong>
                      </div>
                      {entries.map((entry) => (
                        <div key={entry.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px'}}>
                          <span>{entry.productName} ({entry.qty})</span>
                          <span>{formatCurrencyRsd(entry.total)}</span>
                        </div>
                      ))}
                    </div>
                  )
              })}
            </div>
          )}
        </main>
      )}

      <nav className="bottom-nav">
        <button className={\`nav-btn \${tab === 'catalog' ? 'active' : ''}\`} onClick={() => setTab('catalog')}>
          <PackageOpen size={24} />
          <span>Ассортимент</span>
        </button>
        <button className={\`nav-btn \${tab === 'preparation' ? 'active' : ''}\`} onClick={() => setTab('preparation')}>
          <ClipboardList size={24} />
          <span>Подготовка</span>
        </button>
        <button className={\`nav-btn \${tab === 'store' ? 'active' : ''}\`} onClick={() => setTab('store')}>
          <ShoppingCart size={24} />
          <span>В магазине</span>
        </button>
        <button className={\`nav-btn \${tab === 'history' ? 'active' : ''}\`} onClick={() => setTab('history')}>
          <History size={24} />
          <span>История</span>
        </button>
      </nav>
    </div>
  )
}
`

fs.writeFileSync('src/App.tsx', appTsxContent);

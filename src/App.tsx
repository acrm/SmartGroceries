import { useState, useEffect, useCallback, type KeyboardEvent } from 'react'
import './App.css'

interface Product {
  id: string
  name: string
}

interface ShoppingItem {
  productId: string
  bought: boolean
}

type Tab = 'products' | 'shopping'

const STORAGE_PRODUCTS = 'sg_products'
const STORAGE_SHOPPING = 'sg_shopping'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage<Product[]>(STORAGE_PRODUCTS, [])
  )
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() =>
    loadFromStorage<ShoppingItem[]>(STORAGE_SHOPPING, [])
  )
  const [newProductName, setNewProductName] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products))
  }, [products])

  useEffect(() => {
    localStorage.setItem(STORAGE_SHOPPING, JSON.stringify(shoppingList))
  }, [shoppingList])

  const addProduct = useCallback(() => {
    const name = newProductName.trim()
    if (!name) return
    setProducts((prev) => [...prev, { id: generateId(), name }])
    setNewProductName('')
  }, [newProductName])

  const handleNewProductKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') addProduct()
    },
    [addProduct]
  )

  const deleteProduct = useCallback(
    (id: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      setShoppingList((prev) => prev.filter((item) => item.productId !== id))
    },
    []
  )

  const isInCart = useCallback(
    (productId: string) => shoppingList.some((item) => item.productId === productId),
    [shoppingList]
  )

  const toggleCart = useCallback(
    (productId: string) => {
      setShoppingList((prev) => {
        if (prev.some((item) => item.productId === productId)) {
          return prev.filter((item) => item.productId !== productId)
        }
        return [...prev, { productId, bought: false }]
      })
    },
    []
  )

  const toggleBought = useCallback(
    (productId: string) => {
      setShoppingList((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, bought: !item.bought } : item
        )
      )
    },
    []
  )

  const removeFromShopping = useCallback(
    (productId: string) => {
      setShoppingList((prev) => prev.filter((item) => item.productId !== productId))
    },
    []
  )

  const clearBought = useCallback(() => {
    setShoppingList((prev) => prev.filter((item) => !item.bought))
  }, [])

  const shoppingProducts = shoppingList.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    return product ? { ...item, name: product.name } : null
  }).filter(Boolean) as (ShoppingItem & { name: string })[]

  const boughtCount = shoppingProducts.filter((i) => i.bought).length
  const totalCount = shoppingProducts.length

  return (
    <div className="app">
      <header className="app-header">🛒 SmartGroceries</header>

      <nav className="tabs">
        <button
          className={`tab-btn${tab === 'products' ? ' active' : ''}`}
          onClick={() => setTab('products')}
        >
          📋 Продукты
        </button>
        <button
          className={`tab-btn${tab === 'shopping' ? ' active' : ''}`}
          onClick={() => setTab('shopping')}
        >
          🛍 Покупки
          {shoppingList.length > 0 && (
            <span style={{ marginLeft: 6, background: '#4caf50', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: '0.75rem' }}>
              {shoppingList.length}
            </span>
          )}
        </button>
      </nav>

      {tab === 'products' && (
        <main className="tab-content">
          <div className="add-form">
            <input
              type="text"
              placeholder="Добавить продукт..."
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              onKeyDown={handleNewProductKeyDown}
              autoFocus
            />
            <button className="btn btn-primary" onClick={addProduct}>
              Добавить
            </button>
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <span className="icon">🥦</span>
              Список продуктов пуст.
              <br />
              Добавьте продукты выше.
            </div>
          ) : (
            <>
              <p className="section-title">Все продукты</p>
              <div className="product-list">
                {products.map((product) => {
                  const inCart = isInCart(product.id)
                  return (
                    <div
                      key={product.id}
                      className={`product-item${inCart ? ' in-cart' : ''}`}
                    >
                      <span className="product-name">{product.name}</span>
                      <div className="product-actions">
                        {inCart && <span className="badge">В списке</span>}
                        <button
                          className={`btn ${inCart ? 'btn-outline' : 'btn-primary'}`}
                          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                          onClick={() => toggleCart(product.id)}
                          title={inCart ? 'Убрать из списка покупок' : 'Добавить в список покупок'}
                        >
                          {inCart ? '−' : '+'}
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

      {tab === 'shopping' && (
        <main className="tab-content">
          {shoppingProducts.length === 0 ? (
            <div className="empty-state">
              <span className="icon">🛒</span>
              Список покупок пуст.
              <br />
              Перейдите в «Продукты» и добавьте нужные.
            </div>
          ) : (
            <>
              <div className="shopping-summary">
                <span>
                  Куплено: {boughtCount} / {totalCount}
                </span>
                {boughtCount > 0 && (
                  <button className="btn btn-outline" onClick={clearBought}>
                    Очистить купленные
                  </button>
                )}
              </div>

              <p className="section-title">Нужно купить</p>
              <div className="product-list">
                {shoppingProducts.map((item) => (
                  <div
                    key={item.productId}
                    className={`shopping-item${item.bought ? ' bought' : ''}`}
                    onClick={() => toggleBought(item.productId)}
                  >
                    <div className="checkbox">
                      {item.bought && '✓'}
                    </div>
                    <span className="shopping-name">{item.name}</span>
                    <button
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromShopping(item.productId)
                      }}
                      title="Убрать из списка"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      )}
    </div>
  )
}

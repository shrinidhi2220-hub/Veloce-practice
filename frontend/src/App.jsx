import { useEffect, useMemo, useState } from 'react'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import ProductCard from './components/ProductCard.jsx'
import { categories, products } from './data/products.js'
import './App.css'

const money = (amount) => `$${amount.toFixed(2)}`

function getRoute() {
  const [path = '/', query = ''] = window.location.hash.slice(1).split('?')
  const params = new URLSearchParams(query)
  const segments = path.split('/').filter(Boolean)

  if (segments[0] === 'product' && segments[1]) {
    return { page: 'product', productId: segments[1] }
  }
  if (['shop', 'cart', 'checkout', 'confirmation', 'wholesale', 'resale'].includes(segments[0])) {
    return { page: segments[0], category: params.get('category') || 'All' }
  }
  return { page: 'home', category: 'All' }
}

function readSavedCart() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('veloce-cart') || '[]')
    if (!Array.isArray(saved)) return []
    return saved.filter(
      (item) =>
        item &&
        products.some((product) => product.id === item.id) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    )
  } catch {
    return []
  }
}

function HomePage({ onOpenProduct, onAdd }) {
  const featuredProducts = products.slice(0, 4)
  const categoryDetails = [
    { name: 'Home', text: 'Objects with intention', symbol: '⌂' },
    { name: 'Style', text: 'Everyday, elevated', symbol: '↗' },
    { name: 'Bags', text: 'Made to go places', symbol: '◇' },
    { name: 'Lifestyle', text: 'Little daily rituals', symbol: '◌' },
    { name: 'All', text: 'Find your next favorite', symbol: '✳' },
  ]

  return (
    <main>
      <section className="hero">
        <img
          className="hero-image"
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2000&q=90"
          alt="A warm, sunlit independent design shop"
        />
        <div className="hero-content">
          <p className="eyebrow">Good things, thoughtfully found</p>
          <h1>Make room for<br />the good stuff.</h1>
          <p className="hero-copy">
            A considered collection of everyday pieces from independent makers
                  and brands worth knowing.
          </p>
          <a className="button" href="#/shop">Shop the collection <span aria-hidden="true">→</span></a>
        </div>
        <span className="hero-note">A marketplace for living well · Est. 2025</span>
      </section>

      <nav className="category-strip" aria-label="Shop by category">
        {categoryDetails.map((category) => (
          <a
            href={category.name === 'All' ? '#/shop' : `#/shop?category=${category.name}`}
            className="category-tile"
            key={category.name}
          >
            <span>
              <span className="category-name">{category.name}</span>
              <span className="category-sub">{category.text}</span>
            </span>
            <span className="category-arrow" aria-hidden="true">{category.symbol}</span>
          </a>
        ))}
      </nav>

      <section className="section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Chosen with care</p>
            <h2>Good finds, right now.</h2>
          </div>
          <a className="text-link" href="#/shop">View all products <span aria-hidden="true">→</span></a>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onOpen={onOpenProduct} onAdd={onAdd} />
          ))}
        </div>
      </section>

      <section className="promise-band" aria-label="Our values">
        <div className="promise-item">
          <span className="promise-icon" aria-hidden="true">✳</span>
          <span><strong>Independent by nature</strong><span>Discover makers with a point of view</span></span>
        </div>
        <div className="promise-item">
          <span className="promise-icon" aria-hidden="true">♡</span>
          <span><strong>Better, not more</strong><span>Thoughtful pieces for everyday living</span></span>
        </div>
        <div className="promise-item">
          <span className="promise-icon" aria-hidden="true">↗</span>
          <span><strong>Good things travel</strong><span>Complimentary shipping over $100</span></span>
        </div>
      </section>

      <section className="promo-grid">
        <a href="#/wholesale" className="promo-card">
          <img
            src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1100&q=85"
            alt=""
          />
          <div className="promo-copy">
            <p className="eyebrow">For shops & studios</p>
            <h2>Good things belong together.</h2>
            <p>Meet the collection from a wholesale perspective.</p>
            <span className="button">Discover wholesale <span aria-hidden="true">→</span></span>
          </div>
        </a>
        <a href="#/resale" className="promo-card promo-card-alt">
          <img
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85"
            alt=""
          />
          <div className="promo-copy">
            <p className="eyebrow">A second life</p>
            <h2>Pass the good stuff on.</h2>
            <p>Explore what resale at VELOCE is all about.</p>
            <span className="button">Discover resale <span aria-hidden="true">→</span></span>
          </div>
        </a>
      </section>
    </main>
  )
}

function ShopPage({ categoryFromUrl, onOpenProduct, onAdd, search, setSearch }) {
  const [category, setCategory] = useState(categoryFromUrl)
  const [sort, setSort] = useState('featured')

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const result = products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.category} ${product.color}`.toLowerCase().includes(normalizedSearch)
      return matchesCategory && matchesSearch
    })

    if (sort === 'price-low') result.sort((a, b) => a.price - b.price)
    if (sort === 'price-high') result.sort((a, b) => b.price - a.price)
    if (sort === 'rating') result.sort((a, b) => b.rating - a.rating)
    return result
  }, [category, search, sort])

  return (
    <main className="page-main">
      <div className="page-heading">
        <p className="eyebrow">The VELOCE collection</p>
        <h1>{search ? 'Search results' : 'Find your next favorite.'}</h1>
        <p>Thoughtful everyday goods from independent makers and brands worth knowing.</p>
      </div>
      <div className="shop-tools">
        <div className="filter-list" aria-label="Filter by category">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={`filter-button${category === item ? ' active' : ''}`}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="sort-control">
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
      </div>
      <section className="section-wrap shop-grid-wrap">
        <p className="results-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'piece' : 'pieces'} to explore</p>
        {visibleProducts.length ? (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} onOpen={onOpenProduct} onAdd={onAdd} />
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <h2>No matches just yet.</h2>
            <p>Try a different search or browse the whole collection.</p>
            <button type="button" className="button" onClick={() => { setCategory('All'); setSearch('') }}>
              See all products
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function ProductPage({ product, onAdd }) {
  const [quantity, setQuantity] = useState(1)

  if (!product) {
    return (
      <main className="page-main empty-results">
        <h2>We couldn’t find that piece.</h2>
        <p>It may have moved on. Take a look at the rest of the collection.</p>
        <a className="button" href="#/shop">Browse the collection</a>
      </main>
    )
  }

  return (
    <main className="page-main detail-layout">
      <div className="detail-image-wrap">
        <img className="detail-image" src={product.image} alt={product.name} />
        {product.badge && <span className="product-badge">{product.badge}</span>}
      </div>
      <section className="detail-copy">
        <p className="breadcrumbs"><a href="#/">Home</a> &nbsp; / &nbsp; <a href="#/shop">Shop</a> &nbsp; / &nbsp; {product.category}</p>
        <p className="eyebrow">{product.category} · {product.color}</p>
        <h1>{product.name}</h1>
        <p className="detail-rating"><span aria-hidden="true">★</span> {product.rating} <span>·</span> {product.reviews} considered reviews</p>
        <p className="detail-price">{money(product.price)}</p>
        <p className="detail-description">{product.description}</p>
        <p className="detail-availability"><span className="availability-dot" /> In stock and ready to ship</p>
        <div className="quantity-row">
          <span>Quantity</span>
          <div className="quantity-control" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
            <output aria-live="polite">{quantity}</output>
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(99, value + 1))}>+</button>
          </div>
        </div>
        <button type="button" className="button" onClick={() => onAdd(product.id, quantity)}>
          Add to bag · {money(product.price * quantity)}
        </button>
        <p className="detail-note">Complimentary shipping on orders over $100.</p>
      </section>
    </main>
  )
}

function OrderSummary({ subtotal, shipping, total, children, action }) {
  return (
    <aside className="summary-card">
      <h2>Order summary</h2>
      {children}
      <div className="summary-line"><span>Subtotal</span><span>{money(subtotal)}</span></div>
      <div className="summary-line"><span>Shipping</span><span>{shipping === 0 ? 'Complimentary' : money(shipping)}</span></div>
      <div className="summary-line summary-total"><span>Total</span><span>{money(total)}</span></div>
      <p className="summary-note">Taxes, if applicable, are included in this demo total.</p>
      {action}
    </aside>
  )
}

function CartPage({ items, subtotal, shipping, total, onChangeQuantity, onRemove }) {
  if (items.length === 0) {
    return (
      <main className="page-main">
        <div className="page-heading">
          <p className="eyebrow">Your VELOCE bag</p>
          <h1>A little room for something good.</h1>
        </div>
        <div className="empty-cart">
          <span className="empty-cart-icon" aria-hidden="true">◇</span>
          <h2>Your bag is taking a breather.</h2>
          <p>When something catches your eye, it will be right here.</p>
          <a className="button" href="#/shop">Explore the collection <span aria-hidden="true">→</span></a>
        </div>
      </main>
    )
  }

  return (
    <main className="page-main">
      <div className="page-heading">
        <p className="eyebrow">Your VELOCE bag</p>
        <h1>Good choices.</h1>
      </div>
      <div className="cart-layout">
        <section className="cart-items" aria-label="Items in your bag">
          {items.map(({ product, quantity }) => (
            <article className="cart-row" key={product.id}>
              <a href={`#/product/${product.id}`}><img className="cart-row-image" src={product.image} alt={product.name} /></a>
              <div>
                <a className="cart-item-name" href={`#/product/${product.id}`}>{product.name}</a>
                <p className="cart-item-category">{product.category} · {product.color}</p>
                <div className="quantity-control" aria-label={`Quantity of ${product.name}`}>
                  <button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => onChangeQuantity(product.id, quantity - 1)}>−</button>
                  <output>{quantity}</output>
                  <button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => onChangeQuantity(product.id, quantity + 1)}>+</button>
                </div>
              </div>
              <div className="cart-row-end">
                <strong>{money(product.price * quantity)}</strong>
                <button type="button" className="remove-button" onClick={() => onRemove(product.id)}>Remove</button>
              </div>
            </article>
          ))}
        </section>
        <OrderSummary
          subtotal={subtotal}
          shipping={shipping}
          total={total}
          action={<a className="button" href="#/checkout">Continue to checkout <span aria-hidden="true">→</span></a>}
        >
          <p className="summary-line"><span>Items ({items.reduce((sum, item) => sum + item.quantity, 0)})</span><span>{money(subtotal)}</span></p>
        </OrderSummary>
      </div>
    </main>
  )
}

function CheckoutPage({ items, subtotal, shipping, total, onSubmit }) {
  if (!items.length) {
    return (
      <main className="page-main empty-cart">
        <h2>Your bag is empty.</h2>
        <p>Add something you love before heading to checkout.</p>
        <a className="button" href="#/shop">Browse the collection</a>
      </main>
    )
  }

  return (
    <main className="page-main">
      <div className="page-heading">
        <p className="eyebrow">A simple, secure demo checkout</p>
        <h1>Almost yours.</h1>
      </div>
      <div className="checkout-layout">
        <section>
          <h2 className="checkout-title">Your details</h2>
          <form className="checkout-form" onSubmit={onSubmit}>
            <label className="form-field form-field-wide">
              Full name
              <input name="name" autoComplete="name" required minLength="2" placeholder="Your name" />
            </label>
            <label className="form-field form-field-wide">
              Email address
              <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            </label>
            <label className="form-field form-field-wide">
              Delivery address
              <textarea name="address" autoComplete="street-address" required minLength="8" placeholder="Street address, city, postal code" />
            </label>
            <p className="checkout-disclaimer">
              Demo checkout only. No payment is collected; this order will be marked as cash on delivery for demonstration purposes.
            </p>
            <button className="button" type="submit">Place demo order · {money(total)}</button>
          </form>
        </section>
        <OrderSummary subtotal={subtotal} shipping={shipping} total={total}>
          <ul className="checkout-items">
            {items.map(({ product, quantity }) => (
              <li key={product.id}><span>{product.name} × {quantity}</span><strong>{money(product.price * quantity)}</strong></li>
            ))}
          </ul>
        </OrderSummary>
      </div>
    </main>
  )
}

function ConfirmationPage({ order }) {
  if (!order) {
    return (
      <main className="page-main empty-cart confirmation-missing">
        <h2>No order to confirm.</h2>
        <p>Place a demo order at checkout to see your confirmation details here.</p>
        <a className="button" href="#/shop">Continue shopping</a>
      </main>
    )
  }

  return (
    <main className="page-main">
      <div className="page-heading">
        <p className="eyebrow">Thank you, {order.name.split(' ')[0]}</p>
        <h1>That’s a good choice.</h1>
      </div>
      <section className="confirmation-wrap">
        <div className="confirmation-card">
          <span className="success-mark" aria-hidden="true">✓</span>
          <h1>Your demo order is in.</h1>
          <p>We’ve prepared this local demo confirmation for <strong>{order.email}</strong>. No payment was taken and no order was sent to a server.</p>
          <div className="order-reference">ORDER REFERENCE &nbsp; {order.reference}</div>
          <ul className="confirmation-items">
            {order.items.map(({ product, quantity }) => (
              <li key={product.id}><span>{product.name} × {quantity}</span><span>{money(product.price * quantity)}</span></li>
            ))}
          </ul>
          <div className="confirmation-total"><span>Demo total · cash on delivery</span><span>{money(order.total)}</span></div>
          <a className="button" href="#/shop">Back to the collection</a>
        </div>
      </section>
    </main>
  )
}

function BusinessPage({ type }) {
  const wholesale = type === 'wholesale'
  const title = wholesale ? 'For shops with a good eye.' : 'Good things deserve another go.'
  const kicker = wholesale ? 'VELOCE for business' : 'The VELOCE resale edit'
  const description = wholesale
    ? 'Bring independent design and considered everyday goods to your shelves. We’re shaping a home for thoughtful retail partnerships.'
    : 'A more thoughtful way to find pre-loved pieces. We’re exploring how great design can keep moving, with less going to waste.'
  const benefits = wholesale
    ? [
        ['01', 'A considered edit', 'Distinctive goods from independent makers, gathered in one place.'],
        ['02', 'Made for discovery', 'A complementary collection for retailers building a point of view.'],
        ['03', 'Let’s talk', 'Tell us about your shop and the makers you would love to meet.'],
      ]
    : [
        ['01', 'Keep good things moving', 'Give well-made everyday pieces a chance to find their next home.'],
        ['02', 'A second look', 'Explore an evolving idea for more considered shopping and reuse.'],
        ['03', 'Stay in the loop', 'Share your interest while we shape this part of the marketplace.'],
      ]

  return (
    <main className="page-main">
      <section className="business-hero">
        <img
          src={wholesale
            ? 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=85'
            : 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85'}
          alt=""
        />
        <div className="business-panel">
          <p className="eyebrow">{kicker}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <a className="button" href={`mailto:hello@veloce.example?subject=${encodeURIComponent(wholesale ? 'Wholesale enquiry' : 'Resale interest')}`}>
            {wholesale ? 'Start a conversation' : 'Share your interest'} <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
      <section className="business-benefits" aria-label={`${wholesale ? 'Wholesale' : 'Resale'} information`}>
        {benefits.map(([number, heading, body]) => (
          <article className="benefit-card" key={number}>
            <span className="benefit-number">{number} / 03</span>
            <h2>{heading}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <section className="business-cta">
        <h2>Good things start with a hello.</h2>
        <p>This is an introductory page only. Partnerships and resale are not managed through this demo.</p>
        <a className="button button-dark" href="mailto:hello@veloce.example">Contact VELOCE</a>
      </section>
    </main>
  )
}

function App() {
  const [route, setRoute] = useState(getRoute)
  const [cart, setCart] = useState(readSavedCart)
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('veloce-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const cartItems = useMemo(
    () => cart
      .map((item) => ({ product: products.find((product) => product.id === item.id), quantity: item.quantity }))
      .filter((item) => item.product),
    [cart],
  )
  const cartCount = cart.reduce((totalCount, item) => totalCount + item.quantity, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shipping = subtotal === 0 || subtotal >= 100 ? 0 : 8.95
  const total = subtotal + shipping

  function addToCart(productId, quantity = 1) {
    setCart((current) => {
      const existing = current.find((item) => item.id === productId)
      if (existing) {
        return current.map((item) =>
          item.id === productId ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item,
        )
      }
      return [...current, { id: productId, quantity: Math.min(99, quantity) }]
    })
    setNotice('Added to your bag')
  }

  function changeQuantity(productId, quantity) {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== productId))
      return
    }
    setCart((current) => current.map((item) =>
      item.id === productId ? { ...item, quantity: Math.min(99, quantity) } : item,
    ))
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  function submitSearch(value) {
    setSearch(value)
    window.location.hash = '/shop'
  }

  function placeOrder(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const address = String(formData.get('address') || '').trim()
    if (name.length < 2 || !email || address.length < 8 || !cartItems.length) return

    const reference = `VC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    setOrder({ name, email, address, reference, items: cartItems, total })
    setCart([])
    window.location.hash = '/confirmation'
  }

  const selectedProduct = products.find((product) => product.id === route.productId)

  return (
    <div className="app-shell">
      <Header cartCount={cartCount} onSearch={submitSearch} />
      {route.page === 'home' && (
        <HomePage
          onOpenProduct={(id) => { window.location.hash = `/product/${id}` }}
          onAdd={addToCart}
        />
      )}
      {route.page === 'shop' && (
        <ShopPage
          key={route.category}
          categoryFromUrl={route.category}
          onOpenProduct={(id) => { window.location.hash = `/product/${id}` }}
          onAdd={addToCart}
          search={search}
          setSearch={setSearch}
        />
      )}
      {route.page === 'product' && <ProductPage key={route.productId} product={selectedProduct} onAdd={addToCart} />}
      {route.page === 'cart' && (
        <CartPage
          items={cartItems}
          subtotal={subtotal}
          shipping={shipping}
          total={total}
          onChangeQuantity={changeQuantity}
          onRemove={removeFromCart}
        />
      )}
      {route.page === 'checkout' && (
        <CheckoutPage items={cartItems} subtotal={subtotal} shipping={shipping} total={total} onSubmit={placeOrder} />
      )}
      {route.page === 'confirmation' && <ConfirmationPage order={order} />}
      {(route.page === 'wholesale' || route.page === 'resale') && <BusinessPage type={route.page} />}
      <Footer />
      {notice && <div role="status" className="toast">{notice} <a href="#/cart">View bag</a></div>}
    </div>
  )
}

export default App

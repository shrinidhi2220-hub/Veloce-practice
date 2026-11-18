import { useEffect, useMemo, useState } from 'react'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import ProductCard from './components/ProductCard.jsx'
import { api, clearSession, getSavedUser, getToken, setSession } from './api.js'
import { products as demoProducts } from './data/products.js'
import './App.css'

const money = (amount, currency = 'USD') => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
}).format(Number(amount || 0))

function getRoute() {
  const [path = '/', query = ''] = window.location.hash.slice(1).split('?')
  const params = new URLSearchParams(query)
  const segments = path.split('/').filter(Boolean)
  return {
    page: segments[0] && ['shop','cart','checkout','confirmation','wholesale','resale','account','login','rewards','surprise'].includes(segments[0])
      ? segments[0] : segments[0] === 'product' ? 'product' : 'home',
    productId: segments[1],
    category: params.get('category') || 'All',
  }
}

function getSessionId() {
  let id = window.localStorage.getItem('veloce-session')
  if (!id) {
    id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `veloce-${Date.now()}`
    window.localStorage.setItem('veloce-session', id)
  }
  return id
}

function getDemoCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('veloce-cart') || '[]')
    if (!Array.isArray(saved)) return []
    return saved.filter(item =>
      item &&
      demoProducts.some(product => product.id === item.id) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      item.quantity <= 99
    )
  } catch {
    return []
  }
}

function normalizeProduct(product) {
  return {
    ...product,
    id: product.id,
    image: product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=85',
    rating: product.rating ?? null,
    reviews: product.reviews?.length || product.reviewsCount || 0,
    color: product.brand || product.city || 'VELOCE selection',
  }
}

function HomePage({ products, currency, onOpen, onAdd }) {
  return (
    <main>
      <section className="hero">
        <img className="hero-image" src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2000&q=90" alt="Curated VELOCE store" />
        <div className="hero-content">
          <p className="eyebrow">Good things, thoughtfully found</p>
          <h1>Make room for<br />the good stuff.</h1>
          <p className="hero-copy">A considered collection of everyday pieces, pre-loved finds, and rewards worth discovering.</p>
          <a className="button" href="#/shop">Shop the collection <span>→</span></a>
        </div>
      </section>
      <nav className="category-strip">
        {['All','Electronics','Fashion','Home','Accessories','Sports'].map((name) => (
          <a className="category-tile" key={name} href={name === 'All' ? '#/shop' : `#/shop?category=${name}`}>
            <span><span className="category-name">{name}</span><span className="category-sub">Explore the edit</span></span>
            <span className="category-arrow">↗</span>
          </a>
        ))}
      </nav>
      <section className="section-wrap">
        <div className="section-heading"><div><p className="eyebrow">Chosen with care</p><h2>Good finds, right now.</h2></div><a className="text-link" href="#/shop">View all products →</a></div>
        {products.length?<div className="product-grid">{products.slice(0,4).map((product) => <ProductCard key={product.id} product={product} currency={currency} onOpen={onOpen} onAdd={onAdd} />)}</div>:<p className="muted">The catalog is empty right now. Please check back soon.</p>}
      </section>
    </main>
  )
}

function ShopPage({ products, currency, categoryFromUrl, search, setSearch, onOpen, onAdd }) {
  const [category, setCategory] = useState(categoryFromUrl)
  const [sort, setSort] = useState('featured')
  const [city, setCity] = useState('All')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const visible = useMemo(() => {
    let result = products.filter((product) => {
      const haystack = `${product.name} ${product.description || ''} ${product.category} ${product.brand || ''}`.toLowerCase()
      return (category === 'All' || product.category === category) &&
        (city === 'All' || product.city === city) &&
        (!minPrice || product.price >= Number(minPrice)) &&
        (!maxPrice || product.price <= Number(maxPrice)) &&
        (!search || haystack.includes(search.trim().toLowerCase()))
    })
    if (sort === 'low') result = [...result].sort((a,b) => a.price-b.price)
    if (sort === 'high') result = [...result].sort((a,b) => b.price-a.price)
    if (sort === 'rating') result = [...result].sort((a,b) => b.rating-a.rating)
    return result
  }, [products, category, city, minPrice, maxPrice, search, sort])

  return (
    <main className="page-main">
      <div className="page-heading"><p className="eyebrow">The VELOCE collection</p><h1>{search ? 'Search results' : 'Find your next favorite.'}</h1></div>
      <div className="shop-tools">
        <div className="filter-list">{[...new Set(['All', ...products.map(p => p.category)])].map(item => <button key={item} className={`filter-button${category === item ? ' active' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <label className="sort-control">Sort <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select></label>
        <label className="sort-control">City <select value={city} onChange={e => setCity(e.target.value)}><option>All</option>{[...new Set(products.map(p=>p.city).filter(Boolean))].map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="sort-control">Min price <input aria-label="Minimum price" type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} /></label>
        <label className="sort-control">Max price <input aria-label="Maximum price" type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} /></label>
      </div>
      <section className="section-wrap shop-grid-wrap">
        <p className="results-count">{visible.length} pieces to explore</p>
        {visible.length ? <div className="product-grid">{visible.map(product => <ProductCard key={product.id} product={product} currency={currency} onOpen={onOpen} onAdd={onAdd} />)}</div> :
          <div className="empty-results"><h2>No matches just yet.</h2><button className="button" onClick={() => {setCategory('All');setSearch('')}}>See all products</button></div>}
      </section>
    </main>
  )
}

function ProductPage({ product, currency, onAdd }) {
  const [quantity,setQuantity] = useState(1)
  const [reviews,setReviews] = useState([])
  const [reviewText,setReviewText] = useState('')
  const [rating,setRating] = useState(5)
  const [message,setMessage] = useState('')
  const [reviewsError,setReviewsError] = useState('')
  useEffect(() => {
    if(!product?.id)return
    api.reviews(product.id).then(r => {setReviews(r.data || []);setReviewsError('')})
      .catch(error => setReviewsError(error.message))
  }, [product?.id])
  if(!product) return <main className="page-main empty-results"><h2>We couldn’t find that piece.</h2><a className="button" href="#/shop">Browse</a></main>
  async function submitReview(e) {
    e.preventDefault()
    try {
      await api.createReview({ productId: product.id, rating, comment: reviewText })
      setMessage('Review published. Thank you!')
      setReviewText('')
      const fresh = await api.reviews(product.id)
      setReviews(fresh.data || [])
    } catch (error) { setMessage(error.message) }
  }
  return (
    <main className="page-main detail-layout">
      <div className="detail-image-wrap"><img className="detail-image" src={product.image} alt={product.name} /></div>
      <section className="detail-copy">
        <p className="eyebrow">{product.category} · {product.brand || product.city}</p><h1>{product.name}</h1>
        {product.rating&&<p className="detail-rating">★ {product.rating} · {product.reviews||0} reviews</p>}<p className="detail-price">{money(product.price, currency)}</p>
        <p className="detail-description">{product.description}</p><p className="detail-availability"><span className="availability-dot"/> {product.stock > 0 ? `${product.stock} in stock` : 'Currently unavailable'}</p>
        <div className="quantity-row"><span>Quantity</span><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1,quantity-1))}>−</button><output>{quantity}</output><button onClick={() => setQuantity(Math.min(99,quantity+1))}>+</button></div></div>
        <button className="button" disabled={!product.stock} onClick={() => onAdd(product.id, quantity)}>Add to bag · {money(product.price * quantity, currency)}</button>
        <div className="review-block"><h2>Verified reviews</h2>{reviewsError&&<p className="form-error">{reviewsError}</p>}{!reviewsError&&!reviews.length&&<p className="muted">No reviews yet.</p>}{reviews.map(review => <article className="review" key={review.id}><strong>{review.user?.name || 'VELOCE customer'} {review.isVerified && <span>✓ Verified purchase</span>}</strong><p>{'★'.repeat(review.rating)} {review.comment || ''}</p></article>)}
        {getSavedUser() ? <form className="checkout-form" onSubmit={submitReview}><label className="form-field form-field-wide">Rating<select value={rating} onChange={e=>setRating(Number(e.target.value))}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label><label className="form-field form-field-wide">Review<textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} /></label><button className="button">Submit review</button></form> : <p className="muted">Sign in after purchasing to leave a verified review.</p>}
        {message && <p className="form-message">{message}</p>}
        </div>
      </section>
    </main>
  )
}

function CartPage({ items, subtotal, currency, onChange, onRemove }) {
  if (!items.length) return <main className="page-main empty-cart"><span className="empty-cart-icon">◇</span><h2>Your bag is taking a breather.</h2><a className="button" href="#/shop">Explore</a></main>
  return <main className="page-main"><div className="page-heading"><p className="eyebrow">Your VELOCE bag</p><h1>Good choices.</h1></div><div className="cart-layout"><section className="cart-items">{items.map(({product,quantity,unitPrice}) => <article className="cart-row" key={product.id}><img className="cart-row-image" src={product.image} alt={product.name}/><div><a className="cart-item-name" href={`#/product/${product.id}`}>{product.name}</a><div className="quantity-control"><button onClick={()=>onChange(product.id,quantity-1)}>−</button><output>{quantity}</output><button onClick={()=>onChange(product.id,quantity+1)}>+</button></div></div><div className="cart-row-end"><strong>{money(unitPrice*quantity,currency)}</strong><button className="remove-button" onClick={()=>onRemove(product.id)}>Remove</button></div></article>)}</section><aside className="summary-card"><h2>Order summary</h2><div className="summary-line"><span>Subtotal</span><span>{money(subtotal,currency)}</span></div><div className="summary-line"><span>Shipping</span><span>Calculated at delivery</span></div><div className="summary-line summary-total"><span>Total</span><span>{money(subtotal,currency)}</span></div><a className="button" href="#/checkout">Continue to checkout →</a></aside></div></main>
}

function CheckoutPage({ items, subtotal, currency, onSubmit, busy }) {
  if (!items.length) return <main className="page-main empty-cart"><h2>Your bag is empty.</h2><a className="button" href="#/shop">Browse</a></main>
  return <main className="page-main"><div className="page-heading"><p className="eyebrow">Cash on delivery</p><h1>Almost yours.</h1></div><div className="checkout-layout"><form className="checkout-form" onSubmit={onSubmit}>
    <label className="form-field form-field-wide">Full name<input name="fullName" required /></label><label className="form-field">Phone<input name="phone" required /></label><label className="form-field">City<input name="city" required /></label><label className="form-field form-field-wide">Address<input name="addressLine1" required /></label><label className="form-field">State<input name="state" required /></label><label className="form-field">Postal code<input name="postalCode" required /></label><label className="form-field form-field-wide">Country<input name="country" defaultValue="India" required /></label><button className="button" disabled={busy}>{busy?'Placing order...':`Place COD order · ${money(subtotal,currency)}`}</button>
  </form><aside className="summary-card"><h2>Order summary</h2>{items.map(({product,quantity,unitPrice}) => <div className="summary-line" key={product.id}><span>{product.name} × {quantity}</span><span>{money(unitPrice*quantity,currency)}</span></div>)}</aside></div></main>
}

function AuthPage({ mode, onDone }) {
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault(); setBusy(true); setError('')
    const data=Object.fromEntries(new FormData(e.currentTarget))
    try{
      const response = mode==='login' ? await api.login({email:data.email,password:data.password}) : await api.register({name:data.name,email:data.email,password:data.password,phone:data.phone,city:data.city,referralCode:data.referralCode})
      setSession(response.data); onDone(response.data.user)
      window.location.hash='/account'
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <main className="page-main auth-layout"><section className="auth-card"><p className="eyebrow">{mode==='login'?'Welcome back':'Join VELOCE'}</p><h1>{mode==='login'?'Sign in':'Create account'}</h1><form className="checkout-form" onSubmit={submit}>{mode==='register'&&<><label className="form-field form-field-wide">Full name<input name="name" required /></label><label className="form-field">Phone<input name="phone" /></label><label className="form-field">City<input name="city" /></label></>}<label className="form-field form-field-wide">Email<input name="email" type="email" required /></label><label className="form-field form-field-wide">Password<input name="password" type="password" minLength="8" required /></label>{mode==='register'&&<label className="form-field form-field-wide">Referral code (optional)<input name="referralCode" /></label>}<button className="button" disabled={busy}>{busy?'Please wait':mode==='login'?'Sign in':'Create account'}</button></form>{error&&<p className="form-error">{error}</p>}<p className="auth-switch">{mode==='login'?<>New here? <a href="#/login?mode=register">Create account</a></>:<>Already have an account? <a href="#/login?mode=login">Sign in</a></>}</p></section></main>
}

function AccountPage({ user, onUser }) {
  const [message,setMessage]=useState('')
  const [consentError,setConsentError]=useState('')
  const [consents,setConsents]=useState([])
  const [consentLoading,setConsentLoading]=useState(true)
  useEffect(()=>{if(!user)return;setConsentLoading(true);api.consents().then(r=>{setConsents(r.data||[]);setConsentError('')}).catch(e=>setConsentError(e.message)).finally(()=>setConsentLoading(false))},[user])
  async function save(e){e.preventDefault();try{const data=Object.fromEntries(new FormData(e.currentTarget));const r=await api.updateMe(data);setMessage('Profile updated');onUser(r.data.user)}catch(err){setMessage(err.message)}}
  async function toggle(type,enabled){try{const r=await api.setConsent(type,enabled);setConsents(current=>{const rest=current.filter(c=>c.dataType!==type);return [...rest,r.data]});setConsentError('')}catch(err){setConsentError(err.message)}}
  if(!user)return <main className="page-main auth-layout"><section className="auth-card"><h1>Sign in required</h1><a className="button" href="#/login?mode=login">Sign in</a></section></main>
  const values=['PROFILE_DATA','ORDER_HISTORY','PREFERENCES']
  return <main className="page-main account-layout"><aside className="summary-card"><p className="eyebrow">Your VELOCE profile</p><h1>{user.name||'VELOCE member'}</h1><p>{user.email}</p>{user.referralCode&&<div className="referral-code"><span>Your referral code</span><strong>{user.referralCode}</strong></div>}<button className="button button-secondary" onClick={()=>{clearSession();onUser(null);window.location.hash='/login?mode=login'}}>Sign out</button></aside><section><h2>Profile details</h2><form className="checkout-form" onSubmit={save}><label className="form-field">Name<input name="name" defaultValue={user.name||''}/></label><label className="form-field">Phone<input name="phone" defaultValue={user.phone||''}/></label><label className="form-field form-field-wide">City<input name="city" defaultValue={user.city||''}/></label><button className="button">Save profile</button></form><h2 className="consent-title">Information sharing</h2>{consentLoading&&!consentError&&<p className="muted">Loading permission settings…</p>}{consentError&&<p className="form-error">{consentError}</p>}{values.map(type=>{const record=consents.find(c=>c.dataType===type);const enabled=record?.isConsent===true;return <div className="consent-row" key={type}><div><strong>{type.replace('_',' ')}</strong><span>{enabled?'Permission granted':'No permission granted'}</span></div><button disabled={consentLoading||!!consentError} className={`toggle${enabled?' active':''}`} aria-label={`Toggle ${type}`} onClick={()=>toggle(type,!enabled)}><span/></button></div>})}{message&&<p className="form-message">{message}</p>}</section></main>
}

function ResalePage({ user, currency }) {
  const [listings,setListings]=useState([])
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [purchaseId,setPurchaseId]=useState('')
  useEffect(()=>{api.resale().then(r=>setListings(r.data||[])).catch(e=>setError(e.message))},[])
  async function submit(e){
    e.preventDefault()
    try{
      const body=Object.fromEntries(new FormData(e.currentTarget))
      body.askingPrice=Number(body.askingPrice)
      await api.createResale(body)
      setNotice('Listing submitted for approval')
      e.currentTarget.reset()
    }catch(err){setError(err.message)}
  }
  async function purchase(e){
    e.preventDefault()
    const form=e.currentTarget
    const data=Object.fromEntries(new FormData(form))
    const shippingAddress={
      fullName:data.fullName,phone:data.phone,addressLine1:data.addressLine1,
      city:data.city,state:data.state,postalCode:data.postalCode,country:data.country,
    }
    try{
      const response=await api.purchaseResale(purchaseId,shippingAddress)
      setListings(current=>current.filter(item=>item.id!==purchaseId))
      setPurchaseId('')
      setNotice(`COD resale order ${response.data.orderNumber} placed`)
    }catch(err){setError(err.message)}
  }
  return <main className="page-main">
    <div className="page-heading"><p className="eyebrow">A second life</p><h1>Pass the good stuff on.</h1></div>
    <div className="resale-layout">
      {user&&<section className="summary-card"><h2>List an item</h2><form className="checkout-form" onSubmit={submit}>
        <label className="form-field form-field-wide">Product name<input name="productName" required /></label>
        <label className="form-field">Condition<input name="condition" required placeholder="Excellent" /></label>
        <label className="form-field">Asking price<input name="askingPrice" type="number" min="1" required /></label>
        <label className="form-field">City<input name="city" required /></label>
        <label className="form-field form-field-wide">Description<textarea name="description" /></label>
        <button className="button">Submit for approval</button>
      </form></section>}
      <section className="resale-feed">
        <div className="section-heading"><h2>Approved finds</h2></div>
        {error&&<p className="form-error">{error}</p>}
        {!error&&!listings.length&&<p className="muted">No approved resale listings yet.</p>}
        <div className="product-grid">{listings.map(item=><article className="resale-card" key={item.id}>
          <div className="resale-placeholder">{item.productName[0]}</div>
          <div className="product-info"><p className="product-meta">{item.condition} · {item.city}</p><h3>{item.productName}</h3>
            <strong>{money(item.askingPrice,currency)}</strong><p>{item.description}</p>
            {user?(item.userId===user.id?<p className="muted">Your listing</p>:<button className="card-add-button" onClick={()=>setPurchaseId(item.id)}>Purchase with COD</button>):<a className="card-add-button" href="#/login?mode=login">Sign in to purchase</a>}
          </div>
        </article>)}</div>
        {purchaseId&&<form className="summary-card resale-checkout" onSubmit={purchase}>
          <h2>Delivery details · {money(listings.find(item=>item.id===purchaseId)?.askingPrice,currency)}</h2>
          <label className="form-field">Full name<input name="fullName" required /></label>
          <label className="form-field">Phone<input name="phone" required /></label>
          <label className="form-field form-field-wide">Address<input name="addressLine1" required /></label>
          <label className="form-field">City<input name="city" required /></label>
          <label className="form-field">State<input name="state" required /></label>
          <label className="form-field">Postal code<input name="postalCode" required /></label>
          <label className="form-field">Country<input name="country" defaultValue="India" required /></label>
          <button className="button">Place cash-on-delivery order</button>
        </form>}
        {notice&&<p className="form-message">{notice}</p>}
      </section>
    </div>
  </main>
}

function RewardsPage({ user }) {
  const [rewards,setRewards]=useState(null);const [result,setResult]=useState('');const [gameWon,setGameWon]=useState(false);const [error,setError]=useState('');const [gameError,setGameError]=useState(false)
  useEffect(()=>{if(user)api.rewards().then(r=>{setRewards(r.data);setError('')}).catch(e=>setError(e.message))},[user])
  async function play(){try{const r=await api.playGame();setGameWon(r.data?.pointsAwarded>0);setResult(r.message);setGameError(false);if(r.data?.totalPoints!=null)setRewards(current=>({...current,totalPoints:r.data.totalPoints}));const updated=await api.rewards();setRewards(updated.data);setError('')}catch(e){setResult(e.message);setGameError(true)}}
  if(!user)return <main className="page-main auth-layout"><section className="auth-card"><h1>Rewards await</h1><p>Sign in to earn and track VELOCE points.</p><a className="button" href="#/login?mode=login">Sign in</a></section></main>
  return <main className="page-main"><div className="page-heading"><p className="eyebrow">VELOCE rewards</p><h1>{rewards?`${rewards.totalPoints} points`:'Rewards loading'}</h1></div><div className="rewards-layout"><section className="summary-card"><h2>Reward game</h2><p>Play once a day. The server draws the result; wins earn 25 points.</p><button className={`game-orb${gameWon?' won':''}`} onClick={play}>?</button>{result&&<p className={gameError?'form-error':'form-message'}>{result}</p>}</section><section className="summary-card"><h2>Points history</h2>{error&&<p className="form-error">{error}</p>}{rewards?.entries?.length?<div className="ledger">{rewards.entries.map(entry=><div className="ledger-row" key={entry.id}><div><strong>{entry.action.replaceAll('_',' ')}</strong><span>{new Date(entry.createdAt).toLocaleDateString()}</span></div><strong>+{entry.points}</strong></div>)}</div>:!error&&rewards&&<p className="muted">No reward activity yet.</p>}</section></div></main>
}

function SurprisePage({ user, products }) {
  const [requests,setRequests]=useState([]);  const [selected,setSelected]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('')
  const [preferences,setPreferences]=useState(()=>{try{return JSON.parse(localStorage.getItem('veloce-preferences')||'[]')}catch{return []}})
  useEffect(()=>{if(user)api.surprise().then(r=>{setRequests(r.data||[]);setError('')}).catch(e=>setError(e.message))},[user])
  function chooseUnexpected(){if(!products.length)return;const matching=preferences.length?products.filter(p=>preferences.includes(p.category)):products;const options=matching.length?matching:products;const index=Math.floor(Math.random()*options.length);setSelected(options[index].id)}
  function togglePreference(category){setPreferences(current=>{const next=current.includes(category)?current.filter(value=>value!==category):[...current,category];localStorage.setItem('veloce-preferences',JSON.stringify(next));return next})}
  async function submit(e){e.preventDefault();try{const body=Object.fromEntries(new FormData(e.currentTarget));body.productId=selected||null;await api.createSurprise(body);setMessage('Surprise request submitted');setError('');e.currentTarget.reset();const r=await api.surprise();setRequests(r.data||[])}catch(err){setError(err.message)}}
  if(!user)return <main className="page-main auth-layout"><section className="auth-card"><h1>Meet the Surprise Agent</h1><p>Sign in to create a thoughtful surprise request.</p><a className="button" href="#/login?mode=login">Sign in</a></section></main>
  const pick=products.find(p=>p.id===selected)
  return <main className="page-main"><div className="page-heading"><p className="eyebrow">Surprise Agent</p><h1>Something unexpected.</h1><p>Recommendations use the interests you choose here, then pick an unexpected item in those categories.</p></div><div className="surprise-layout"><section className="summary-card"><h2>Choose a recipient</h2><fieldset className="preference-options"><legend>Your interests</legend>{[...new Set(products.map(product=>product.category))].map(category=><label key={category}><input type="checkbox" checked={preferences.includes(category)} onChange={()=>togglePreference(category)}/>{category}</label>)}</fieldset><form className="checkout-form" onSubmit={submit}><label className="form-field form-field-wide">Recipient name<input name="recipientName" required /></label><label className="form-field form-field-wide">Recipient phone<input name="recipientPhone" required /></label><label className="form-field form-field-wide">Gift note<textarea name="message" /></label><button type="button" className="button button-secondary" onClick={chooseUnexpected} disabled={!products.length}>Let the Agent surprise me</button>{pick&&<div className="surprise-pick"><img src={pick.image} alt={pick.name}/><div><span>Recommended for them</span><strong>{pick.name}</strong></div></div>}<button className="button">Submit surprise request</button></form>{message&&<p className="form-message">{message}</p>}{error&&<p className="form-error">{error}</p>}</section><section className="summary-card"><h2>Your requests</h2>{error&&<p className="form-error">{error}</p>}{requests.map(r=><div className="ledger-row" key={r.id}><div><strong>{r.recipientName}</strong><span>{r.status}</span></div></div>)}{!error&&!requests.length&&<p className="muted">No requests yet.</p>}</section></div></main>
}

function ConfirmationPage({ order, demo }) {
  return <main className="page-main empty-cart"><span className="success-mark">✓</span><h1>{demo?'Demo order preview':'Order placed.'}</h1><p>{demo?'This preview was not sent to VELOCE and does not create a real order.':order ? `Reference ${order.orderNumber || order.id}` : 'Your confirmation is unavailable.'}</p><a className="button" href="#/shop">Continue shopping</a></main>
}

function App() {
  const [route,setRoute]=useState(getRoute)
  const [search,setSearch]=useState('')
  const [products,setProducts]=useState(demoProducts.map(normalizeProduct))
  const [apiStatus,setApiStatus]=useState('checking')
  const [cart,setCart]=useState(getDemoCart)
  const [user,setUser]=useState(getSavedUser)
  const [order,setOrder]=useState(null)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [demoOrder,setDemoOrder]=useState(false)
  const sessionId=getSessionId()

  useEffect(()=>{const sync=()=>setRoute(getRoute());window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
  useEffect(()=>{
    api.health()
      .then(()=>api.products('?limit=100'))
      .then(r=>{
        setProducts((r.data || []).map(normalizeProduct))
        setApiStatus('connected')
      })
      .catch(()=>setApiStatus('demo'))
  },[])
  useEffect(()=>{
    if(!getToken())return
    api.me().then(r=>{setSession({token:getToken(),user:r.data.user});setUser(r.data.user)})
      .catch(()=>{clearSession();setUser(null)})
  },[])
  useEffect(()=>{
    if(apiStatus!=='connected')return
    api.cartGet(sessionId).then(r=>setCart((r.data?.items||[]).map(item=>({id:item.productId||item.product?.id,quantity:item.quantity,product:item.product,unitPrice:item.unitPrice})).filter(i=>i.id))).catch(err=>setNotice(err.message))
  },[apiStatus,sessionId])
  useEffect(()=>{
    if(apiStatus==='demo')localStorage.setItem('veloce-cart',JSON.stringify(cart))
  },[apiStatus,cart])

  const cartItems=useMemo(()=>cart.map(item=>{const product=item.product?normalizeProduct(item.product):products.find(p=>p.id===item.id);return {product,quantity:item.quantity,unitPrice:item.unitPrice??product?.price}}).filter(i=>i.product),[cart,products])
  const subtotal=cartItems.reduce((sum,i)=>sum+i.unitPrice*i.quantity,0)
  const apiAvailable=apiStatus==='connected'
  const currency=apiAvailable?'INR':'USD'

  async function addToCart(productId,quantity=1){
    if(apiStatus==='checking'){setNotice('Connecting to the VELOCE store. Please try again in a moment.');return}
    if(apiAvailable){try{await api.cartAdd(sessionId,productId,quantity);const r=await api.cartGet(sessionId);setCart((r.data?.items||[]).map(item=>({id:item.productId||item.product?.id,quantity:item.quantity,product:item.product,unitPrice:item.unitPrice})))}catch(err){setNotice(err.message);return}}
    else setCart(current=>{const existing=current.find(i=>i.id===productId);return existing?current.map(i=>i.id===productId?{...i,quantity:Math.min(99,i.quantity+quantity)}:i):[...current,{id:productId,quantity}]})
    setNotice('Added to your bag')
  }
  async function changeQuantity(productId,quantity){
    if(quantity<=0){onRemove(productId);return}
    if(apiAvailable){try{await api.cartUpdate(sessionId,productId,quantity);const r=await api.cartGet(sessionId);setCart((r.data?.items||[]).map(item=>({id:item.productId||item.product?.id,quantity:item.quantity,product:item.product,unitPrice:item.unitPrice})))}catch(err){setNotice(err.message)}}else setCart(current=>current.map(i=>i.id===productId?{...i,quantity}:i))
  }
  async function onRemove(productId){if(apiAvailable){try{await api.cartRemove(sessionId,productId);const r=await api.cartGet(sessionId);setCart((r.data?.items||[]).map(item=>({id:item.productId||item.product?.id,quantity:item.quantity,product:item.product,unitPrice:item.unitPrice})))}catch(err){setNotice(err.message)}}else setCart(current=>current.filter(i=>i.id!==productId))}

  function placeOrder(e){
    e.preventDefault();setBusy(true)
    if(apiStatus==='checking'){setBusy(false);setNotice('Connecting to the VELOCE store. Please try again in a moment.');return}
    const data=Object.fromEntries(new FormData(e.currentTarget))
    const shippingAddress={fullName:data.fullName,phone:data.phone,addressLine1:data.addressLine1,city:data.city,state:data.state,postalCode:data.postalCode,country:data.country}
    if(!apiAvailable){
      setTimeout(()=>{const demo={id:`VC-${Date.now()}`,orderNumber:`DEMO-${Date.now().toString().slice(-8)}`};setOrder(demo);setDemoOrder(true);setCart([]);setBusy(false);window.location.hash='/confirmation'},400);return
    }
    api.checkout({sessionId,paymentMethod:'COD',shippingAddress}).then(r=>{setOrder(r.data);setDemoOrder(false);setCart([]);window.location.hash='/confirmation'}).catch(err=>setNotice(err.message)).finally(()=>setBusy(false))
  }

  const selected=products.find(p=>p.id===route.productId)
  const authMode=new URLSearchParams(window.location.hash.split('?')[1]||'').get('mode')==='register'?'register':'login'

  return <div className="app-shell"><Header cartCount={cartItems.reduce((n,i)=>n+i.quantity,0)} onSearch={(value)=>{setSearch(value);window.location.hash='/shop'}}/>
    {route.page==='home'&&<HomePage products={products} currency={currency} onOpen={(id)=>window.location.hash=`/product/${id}`} onAdd={addToCart}/>}
    {route.page==='shop'&&<ShopPage key={route.category} products={products} currency={currency} categoryFromUrl={route.category} search={search} setSearch={setSearch} onOpen={(id)=>window.location.hash=`/product/${id}`} onAdd={addToCart}/>}
    {route.page==='product'&&<ProductPage key={route.productId} product={selected} currency={currency} onAdd={addToCart}/>}
    {route.page==='cart'&&<CartPage items={cartItems} subtotal={subtotal} currency={currency} onChange={changeQuantity} onRemove={onRemove}/>}
    {route.page==='checkout'&&<CheckoutPage items={cartItems} subtotal={subtotal} currency={currency} onSubmit={placeOrder} busy={busy}/>}
    {route.page==='login'&&<AuthPage mode={authMode} onDone={setUser}/>}
    {route.page==='account'&&<AccountPage user={user} onUser={setUser}/>}
    {route.page==='resale'&&<ResalePage user={user} currency={currency}/>}
    {route.page==='rewards'&&<RewardsPage user={user}/>}
    {route.page==='surprise'&&<SurprisePage user={user} products={products}/>}
    {route.page==='confirmation'&&<ConfirmationPage order={order} demo={demoOrder}/>}
    {(route.page==='wholesale')&&<main className="page-main business-cta"><h1>VELOCE for business</h1><p>Wholesale enquiries can be directed to your team’s sales channel.</p><a className="button" href="mailto:hello@veloce.example">Contact VELOCE</a></main>}
    <Footer/>
    {apiStatus==='checking'&&<div className="demo-ribbon">Connecting to VELOCE…</div>}
    {apiStatus==='demo'&&<div className="demo-ribbon">Demo mode · live backend unavailable</div>}
    {notice&&<div role="status" className="toast" onClick={()=>setNotice('')}>{notice}<span>×</span></div>}
  </div>
}

export default App

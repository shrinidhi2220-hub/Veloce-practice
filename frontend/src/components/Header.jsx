import { useState } from 'react'

export default function Header({ cartCount, onSearch }) {
  const [search, setSearch] = useState('')

  function submitSearch(event) {
    event.preventDefault()
    onSearch(search.trim())
  }

  return (
    <>
      <div className="announcement">
        A little something on us — complimentary shipping over $100
        <span aria-hidden="true"> · </span>
        <a href="#/shop">Explore the collection</a>
      </div>
      <header className="site-header">
        <a className="wordmark" href="#/" aria-label="Veloce home">
          VELOCE<span className="wordmark-dot">.</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#/shop">Shop</a>
          <a href="#/wholesale">Wholesale</a>
          <a href="#/resale">Resale</a>
        </nav>
        <form className="search-form" role="search" onSubmit={submitSearch}>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label="Search products"
            placeholder="Search the collection"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="sr-only">Search</button>
        </form>
        <a className="cart-link" href="#/cart" aria-label={`Shopping bag, ${cartCount} items`}>
          <svg className="bag-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 8.5h14l1 12H4l1-12Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="cart-label">Bag</span>
          <span className="cart-count">{cartCount}</span>
        </a>
      </header>
    </>
  )
}

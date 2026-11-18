export default function ProductCard({ product, onOpen, onAdd }) {
  return (
    <article className="product-card">
      <button
        className="product-image-button"
        type="button"
        onClick={() => onOpen(product.id)}
        aria-label={`View ${product.name}`}
      >
        <img className="product-image" src={product.image} alt={product.name} />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <span className="quick-add">Quick add <span aria-hidden="true">+</span></span>
      </button>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.category}</span>
          <span className="rating"><span aria-hidden="true">★</span> {product.rating}</span>
        </div>
        <div className="product-title-row">
          <button type="button" className="product-title" onClick={() => onOpen(product.id)}>
            {product.name}
          </button>
          <span className="product-price">${product.price.toFixed(2)}</span>
        </div>
        <p className="product-color">{product.color}</p>
        <button type="button" className="card-add-button" onClick={() => onAdd(product.id)}>
          Add to bag
        </button>
      </div>
    </article>
  )
}

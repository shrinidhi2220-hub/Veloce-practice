export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="wordmark footer-wordmark" href="#/">VELOCE<span className="wordmark-dot">.</span></a>
          <p>Good things, thoughtfully found.<br />A marketplace for living well.</p>
        </div>
        <div className="footer-links">
          <div>
            <h2>Explore</h2>
            <a href="#/shop">Shop all</a>
            <a href="#/shop?category=Home">Home</a>
            <a href="#/shop?category=Style">Style</a>
          </div>
          <div>
            <h2>For business</h2>
            <a href="#/wholesale">Wholesale</a>
            <a href="#/resale">Resale</a>
            <a href="mailto:hello@veloce.example">Get in touch</a>
          </div>
          <div>
            <h2>Our promise</h2>
            <span>Independent makers</span>
            <span>Considered design</span>
            <span>Better everyday goods</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 VELOCE Market. Made for finding your next favorite.</span>
        <span>Thoughtful finds, made to last.</span>
      </div>
    </footer>
  )
}

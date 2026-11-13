/**
 * Shopee Link-in-Bio Client Application
 * Feature F2: Instant Product Search, Diacritic Stripping, and Empty State Management
 * Zero external dependencies.
 */
(function () {
  'use strict';

  // DOM Elements
  const searchInput = document.getElementById('productSearch');
  const clearBtn = document.getElementById('clearSearch');
  const visibleCountSpan = document.getElementById('visibleCount');
  const emptyState = document.getElementById('emptyState');
  const resetSearchBtn = document.getElementById('resetSearchBtn');
  const productGrid = document.getElementById('productGrid');

  // Debounce utility (150ms)
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }

  // Normalize string: lowercase, remove accents/diacritics, trim
  function normalizeStr(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Retrieve all product cards currently in DOM
  function getProductCards() {
    return Array.from(document.querySelectorAll('.product-card'));
  }

  // Update live search counter
  function updateCount(count) {
    if (visibleCountSpan) {
      visibleCountSpan.textContent = count;
    }
  }

  // Filter products based on search query
  function filterProducts(query) {
    const rawQuery = query ? query.trim() : '';
    const normalizedQuery = normalizeStr(rawQuery);
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const cards = getProductCards();
    let visibleCount = 0;

    // Toggle clear button
    if (clearBtn) {
      clearBtn.hidden = rawQuery.length === 0;
    }

    if (tokens.length === 0) {
      // Restore all
      cards.forEach(card => card.classList.remove('is-hidden'));
      visibleCount = cards.length;
      if (emptyState) emptyState.hidden = true;
      if (productGrid) productGrid.hidden = false;
      updateCount(visibleCount);
      return;
    }

    cards.forEach(card => {
      const title = card.getAttribute('data-title') || card.querySelector('.card-title')?.textContent || '';
      const price = card.getAttribute('data-price') || card.querySelector('.card-price')?.textContent || '';
      const haystack = normalizeStr(`${title} ${price}`);

      // All tokens must match haystack
      const matchesAllTokens = tokens.every(token => haystack.includes(token));

      if (matchesAllTokens) {
        card.classList.remove('is-hidden');
        visibleCount++;
      } else {
        card.classList.add('is-hidden');
      }
    });

    updateCount(visibleCount);

    if (visibleCount === 0) {
      if (emptyState) emptyState.hidden = false;
      if (productGrid) productGrid.hidden = true;
    } else {
      if (emptyState) emptyState.hidden = true;
      if (productGrid) productGrid.hidden = false;
    }
  }

  // Clear search and reset focus
  function clearSearch() {
    if (searchInput) {
      searchInput.value = '';
      filterProducts('');
      searchInput.focus();
    }
  }

  // HTML escaping helper to prevent XSS in dynamic fallback rendering
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Dynamic card renderer (fallback if DOM is not pre-rendered)
  function renderCards(products) {
    if (!productGrid) return;
    productGrid.innerHTML = '';

    products.forEach(p => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.setAttribute('data-id', p.id);
      card.setAttribute('data-title', p.title);
      card.setAttribute('data-price', p.price);

      const safeTitle = escapeHtml(p.title || '');
      const safePrice = escapeHtml(p.price || '');
      const safeLink = p.affiliate_link || '#';
      const safeImg = p.image_path || 'images/placeholder.jpg';

      card.innerHTML = `
        <div class="card-media">
          <img 
            src="${safeImg}" 
            alt="${safeTitle}" 
            loading="lazy" 
            decoding="async" 
            width="400" 
            height="400" 
            class="card-image"
            onerror="this.onerror=null; this.src='images/placeholder.jpg';"
          >
          <span class="card-badge">Achadinho</span>
        </div>
        <div class="card-body">
          <h2 class="card-title" title="${safeTitle}">${safeTitle}</h2>
          <div class="card-price-row">
            <span class="price-prefix">Por apenas</span>
            <span class="card-price">${safePrice}</span>
          </div>
          <a 
            href="${safeLink}" 
            class="btn-cta" 
            target="_blank" 
            rel="noopener"
            aria-label="Ver ${safeTitle} na Shopee"
          >
            <span class="btn-text">Ver na Shopee</span>
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/>
            </svg>
          </a>
        </div>
      `;
      productGrid.appendChild(card);
    });

    updateCount(products.length);
  }

  // Initialize application
  function init() {
    const existingCards = getProductCards();

    if (existingCards.length > 0) {
      updateCount(existingCards.length);
    } else {
      // Async fetch seed JSON if static HTML cards were not present
      fetch('data/products.json')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(products => {
          if (Array.isArray(products) && products.length > 0) {
            renderCards(products);
          }
        })
        .catch(err => {
          console.warn('Initial products.json fetch skipped or failed:', err);
        });
    }

    // Attach search event listeners
    if (searchInput) {
      const handleInput = debounce(e => {
        filterProducts(e.target.value);
      }, 150);

      searchInput.addEventListener('input', handleInput);

      // Escape key clears search
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          clearSearch();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', clearSearch);
    }

    if (resetSearchBtn) {
      resetSearchBtn.addEventListener('click', clearSearch);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

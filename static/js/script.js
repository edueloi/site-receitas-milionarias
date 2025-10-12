document.addEventListener('DOMContentLoaded', () => {
  // ======================================================
  // Helpers / Config
  // ======================================================
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const runningLiveServer = isLocalHost && window.location.port === '5500';

  const API_BASE_URL = (isLocalHost && runningLiveServer)
    ? 'http://localhost:8080'                 // Dev: front 5500 -> back 8080
    : window.location.origin;                  // Prod: mesmo domínio/host

  const buildImageUrl = (imagem_url) => {
    if (!imagem_url) return 'static/images/receitas_capa.png';
    if (/^https?:\/\//i.test(imagem_url)) return imagem_url; // absoluta
    const uploadIndex = imagem_url.indexOf('uploads');
    const path = uploadIndex !== -1 ? imagem_url.substring(uploadIndex) : imagem_url.replace(/^\//, '');
    return `${API_BASE_URL}/${path}`;
  };

  const getCreatedAtMs = (r) => {
    const cand = r.created_at ?? r.createdAt ?? r.data_criacao ?? r.dataCriacao;
    if (!cand) return null;
    if (typeof cand === 'number') return cand;
    const t = Date.parse(cand);
    return Number.isNaN(t) ? null : t;
  };

  const sortNewestFirst = (arr) =>
    [...arr].sort((a, b) => {
      const aMs = getCreatedAtMs(a);
      const bMs = getCreatedAtMs(b);
      if (aMs !== null && bMs !== null) return bMs - aMs;
      if (aMs !== null) return -1;
      if (bMs !== null) return 1;
      const aId = Number(a.id);
      const bId = Number(b.id);
      if (!Number.isNaN(aId) && !Number.isNaN(bId)) return bId - aId;
      return 0;
    });

  const getCategoryId = (r) => r?.categoria?.id ?? r?.categoria_id ?? r?.categoriaId ?? null;

(function() {
  const STORAGE_KEY = 'rm_afiliado';

  function getRefFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  }

  function saveAffiliate(code) {
    if (!code) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
      console.log(`[AFILIADO] Código salvo: ${code}`);
    } catch (e) {
      console.error('[AFILIADO] Erro ao salvar no localStorage:', e);
    }
  }

  function getAffiliate() {
    return localStorage.getItem(STORAGE_KEY);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Captura o 'ref' da URL e salva no localStorage
    const refFromUrl = getRefFromUrl();
    const currentRef = getAffiliate();
    if (refFromUrl && refFromUrl !== currentRef) {
      saveAffiliate(refFromUrl);
    }
    const finalRef = getAffiliate(); // Pega o código mais atual
    console.log('[AFILIADO] Código atual:', finalRef);

    // Se houver um código de afiliado, modifica os links de cadastro
    if (finalRef) {
      const signupLinks = document.querySelectorAll('a[href*="/authentication/sign-up"]');
      signupLinks.forEach(a => {
        try {
          // Garante que a URL base não tenha o código duplicado
          const baseUrl = a.href.split('/authentication/sign-up')[0] + '/authentication/sign-up';
          if (!a.href.endsWith(finalRef)) { // Evita adicionar várias vezes
            const finalUrl = `${baseUrl}/${finalRef}`;
            a.href = finalUrl;
            console.log(`[AFILIADO] Link de cadastro modificado para: ${finalUrl}`);
          }
        } catch(err) {
          console.error('[AFILIADO] Erro ao modificar link de cadastro:', err);
        }
      });
    }
  });

  // Expondo globalmente para outros scripts poderem usar
  window.RM_AFF = {
    get: getAffiliate,
  };

})();

  // ======================================================
  // Preloader
  // ======================================================
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => preloader.classList.add('hidden'), 200);
    });
  }

  // ======================================================
  // Menu Fullscreen
  // ======================================================
  const openMenuBtn = document.getElementById('open-menu');
  const closeMenuBtn = document.getElementById('close-menu');
  const menuOverlay = document.getElementById('menu-overlay');
  const body = document.body;

  if (openMenuBtn && closeMenuBtn && menuOverlay) {
    openMenuBtn.addEventListener('click', () => {
      menuOverlay.classList.add('active');
      body.classList.add('menu-active');
    });

    const closeMenu = () => {
      menuOverlay.classList.remove('active');
      body.classList.remove('menu-active');
    };

    closeMenuBtn.addEventListener('click', closeMenu);

    const menuLinks = menuOverlay.querySelectorAll('a');
    menuLinks.forEach((link) => {
      link.addEventListener('click', () => {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#') || href.includes('index.html#')) closeMenu();
      });
    });
  }

  // ======================================================
  // Calculadora (se existir)
  // ======================================================
  const referralsSlider = document.getElementById('referrals-slider');
  const referralsInput  = document.getElementById('referrals-input');

  if (referralsSlider && referralsInput) {
    const monthlyEarningsEl = document.getElementById('monthly-earnings');
    const annualEarningsEl  = document.getElementById('annual-earnings');
    const pricePerReferral  = 9.9;

    const formatCurrency = (value) =>
      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const updateCalculator = (value) => {
      const count = parseInt(value, 10);
      if (isNaN(count) || count < 0) return;
      const monthly = count * pricePerReferral;
      const annual  = monthly * 12;
      if (monthlyEarningsEl) monthlyEarningsEl.textContent = formatCurrency(monthly);
      if (annualEarningsEl)  annualEarningsEl.textContent  = formatCurrency(annual);
    };

    referralsInput.addEventListener('input', (e) => {
      const value = e.target.value;
      referralsSlider.value = Math.min(value, referralsSlider.max);
      updateCalculator(value);
    });

    referralsSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      referralsInput.value = value;
      updateCalculator(value);
    });

    updateCalculator(referralsInput.value);
  }

  // ======================================================
  // Counters + Fade-in (se existir)
  // ======================================================
  const animateCounter = (counter) => {
    const target = +counter.getAttribute('data-target');
    const duration = 2000;
    const isDecimal = target.toString().includes('.');
    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutProgress = progress * (2 - progress);
      const currentValue = easeOutProgress * target;

      counter.innerText = isDecimal
        ? currentValue.toFixed(2).replace('.', ',')
        : Math.floor(currentValue).toLocaleString('pt-BR');

      if (progress < 1) window.requestAnimationFrame(step);
      else counter.innerText = isDecimal
        ? target.toFixed(2).replace('.', ',')
        : Math.floor(target).toLocaleString('pt-BR');
    };
    window.requestAnimationFrame(step);
  };

  const allElementsToObserve = document.querySelectorAll('.fade-in-section, .counter');
  if (allElementsToObserve.length) {
    const intersectionObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target.classList.contains('fade-in-section')) entry.target.classList.add('visible');
        if (entry.target.classList.contains('counter') && entry.target.innerText === '0') animateCounter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    allElementsToObserve.forEach((el) => intersectionObserver.observe(el));
  }

  // ======================================================
  // FAQ (se existir)
  // ======================================================
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length) {
    faqItems.forEach((item) => {
      const question = item.querySelector('.faq-question');
      if (!question) return;
      question.addEventListener('click', () => {
        const active = document.querySelector('.faq-item.active');
        if (active && active !== item) active.classList.remove('active');
        item.classList.toggle('active');
      });
    });
  }

  // ======================================================
  // LISTA & FILTROS (somente em receitas.html)
  // ======================================================
  (() => {
    const searchInput            = document.getElementById('search-input');
    const categoryFilter         = document.getElementById('category-filter');
    const tagFilter              = document.getElementById('tag-filter');
    const paginationControls     = document.getElementById('pagination-controls');
    const resultsCountContainer  = document.getElementById('results-count');
    const limitSelect            = document.getElementById('limit-select');
    const clearFiltersBtn        = document.getElementById('clear-filters-btn');

    const isListPage = !!(searchInput || categoryFilter || tagFilter || limitSelect);
    if (!isListPage) return;

    const receitasContainer =
      document.getElementById('recipes-grid') || document.querySelector('.recipe-grid');
    if (!receitasContainer) return;

    let state = { page: 1, limit: 15, search: '', categorias: [], tags: [] };

    const fetchRecipes = async () => {
      receitasContainer.innerHTML = '<div class="grid-loader"></div>';
      if (resultsCountContainer) resultsCountContainer.innerText = '';
      if (paginationControls) paginationControls.innerHTML = '';

      const params = new URLSearchParams({ page: state.page, limit: state.limit });
      if (state.search) params.append('search', state.search);
      if (state.categorias.length > 0) params.append('categorias', state.categorias.join(','));
      if (state.tags.length > 0) params.append('tags', state.tags.join(','));

      try {
        const response = await fetch(`${API_BASE_URL}/recipes?${params.toString()}`);
        if (!response.ok) throw new Error(`Erro na rede: ${response.status} ${response.statusText}`);

        const result = await response.json();

        let recipes, pagination;
        if (Array.isArray(result)) {
          recipes = result;
          pagination = { currentPage: 1, totalPages: 1, totalItems: recipes.length };
        } else if (result.data && result.pagination) {
          recipes = result.data;
          pagination = result.pagination;
        } else {
          throw new Error('Formato de resposta da API inesperado.');
        }

        renderRecipes(recipes);
        renderPagination(pagination);
        updateResultsCount(pagination);
      } catch (error) {
        console.error('Falha ao buscar receitas:', error);
        receitasContainer.innerHTML =
          '<p class="error-message">Não foi possível carregar as receitas. Verifique o servidor e tente novamente.</p>';
      }
    };

    const renderRecipes = (recipes) => {
      receitasContainer.innerHTML = '';
      if (!recipes || recipes.length === 0) {
        let message = 'Nenhuma receita encontrada';
        if (state.search || state.categorias.length > 0 || state.tags.length > 0) {
          message += ' com os filtros selecionados.';
        } else {
          message += '. Tente uma busca diferente ou aguarde novas receitas!';
        }
        receitasContainer.innerHTML = `<p class="error-message">${message}</p>`;
        return;
      }

      recipes.forEach((recipe) => {
        const categoryName = recipe.categoria ? recipe.categoria.nome : 'Destaque';
        const imageUrl = buildImageUrl(recipe.imagem_url);
        const recipeItem = document.createElement('div');
        recipeItem.className = 'recipe-item';
        recipeItem.innerHTML = `
          <a href="receita.html?id=${recipe.id}" class="recipe-link">
            <article class="recipe-card">
              <div class="recipe-card-img-container">
                <img src="${imageUrl}" alt="${recipe.titulo}" loading="lazy">
                <span class="recipe-category-tag">${categoryName}</span>
              </div>
              <div class="recipe-card-content">
                <h3>${recipe.titulo}</h3>
                <p>${recipe.resumo || ''}</p>
              </div>
              <div class="recipe-card-footer">
                <div class="recipe-meta">
                  <span><i class="fas fa-clock"></i> ${recipe.tempo_preparo_min || '?'} min</span>
                  <span><i class="fas fa-utensils"></i> ${recipe.dificuldade || '?'}</span>
                </div>
                <span class="read-more-link">Ver Receita <i class="fas fa-arrow-right"></i></span>
              </div>
            </article>
          </a>`;
        receitasContainer.appendChild(recipeItem);
      });
    };

    const renderPagination = (pagination) => {
      if (!paginationControls) return;
      const { currentPage, totalPages } = pagination;
      paginationControls.innerHTML = '';
      if (totalPages <= 1) return;

      const prevButton = document.createElement('button');
      prevButton.innerHTML = '&laquo;';
      prevButton.disabled = currentPage === 1;
      prevButton.addEventListener('click', () => {
        state.page--;
        fetchRecipes();
      });
      paginationControls.appendChild(prevButton);

      for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
          const pageButton = document.createElement('button');
          pageButton.innerText = i;
          if (i === currentPage) pageButton.classList.add('active');
          pageButton.addEventListener('click', () => {
            state.page = i;
            fetchRecipes();
          });
          paginationControls.appendChild(pageButton);
        } else if (paginationControls.lastChild?.innerText !== '...') {
          const ellipsis = document.createElement('button');
          ellipsis.innerText = '...';
          ellipsis.disabled = true;
          paginationControls.appendChild(ellipsis);
        }
      }

      const nextButton = document.createElement('button');
      nextButton.innerHTML = '&raquo;';
      nextButton.disabled = currentPage === totalPages;
      nextButton.addEventListener('click', () => {
        state.page++;
        fetchRecipes();
      });
      paginationControls.appendChild(nextButton);
    };

    const updateResultsCount = (pagination) => {
      if (!resultsCountContainer) return;
      const { totalItems } = pagination;
      resultsCountContainer.innerText = totalItems > 0 ? `Exibindo ${totalItems} receita(s).` : '';
    };

    const populateFilterDropdown = async (filterElement, endpoint, stateKey) => {
      if (!filterElement) return;
      try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const items = await response.json();
        const content = filterElement.querySelector('.dropdown-content');
        const buttonSpan = filterElement.querySelector('.filter-btn span');
        if (!content || !buttonSpan) return;

        const originalButtonText = buttonSpan.innerText;
        buttonSpan.setAttribute('data-original-text', originalButtonText);

        content.innerHTML = '';
        if (items.length === 0) {
          content.innerHTML = '<span class="no-items">Nenhuma opção disponível</span>';
          return;
        }

        const selectAllLabel = document.createElement('label');
        selectAllLabel.className = 'select-all-label';
        selectAllLabel.innerHTML = `<input type="checkbox" class="select-all"> <strong>Selecionar Todos</strong>`;
        content.appendChild(selectAllLabel);
        content.appendChild(document.createElement('hr'));

        items.forEach((item) => {
          const label = document.createElement('label');
          label.innerHTML = `<input type="checkbox" value="${item.id}" class="filter-item"> ${item.nome}`;
          content.appendChild(label);
        });

        const allCheckboxes = content.querySelectorAll('.filter-item');
        const selectAllCheckbox = content.querySelector('.select-all');

        const applyFilters = () => {
          const selectedIds = Array.from(allCheckboxes)
            .filter((cb) => cb.checked)
            .map((input) => input.value);
          state[stateKey] = selectedIds;
          state.page = 1;
          fetchRecipes();

          if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedIds.length === allCheckboxes.length;
          }
          buttonSpan.innerText =
            selectedIds.length > 0 ? `${originalButtonText} (${selectedIds.length})` : originalButtonText;
        };

        content.addEventListener('change', (e) => {
          if (e.target.classList.contains('select-all')) {
            allCheckboxes.forEach((checkbox) => (checkbox.checked = e.target.checked));
          } else if (selectAllCheckbox) {
            selectAllCheckbox.checked = Array.from(allCheckboxes).every((cb) => cb.checked);
          }
          applyFilters();
        });
      } catch (error) {
        console.error(`Falha ao carregar ${endpoint}:`, error);
        const content = filterElement.querySelector('.dropdown-content');
        if (content) content.innerHTML = '<span class="no-items">Erro ao carregar.</span>';
      }
    };

    const setupEventListeners = () => {
      [categoryFilter, tagFilter].forEach((filter) => {
        if (!filter) return;
        const btn = filter.querySelector('.filter-btn');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          document
            .querySelectorAll('.dropdown-filter.active')
            .forEach((f) => f !== filter && f.classList.remove('active'));
          filter.classList.toggle('active');
        });
      });

      window.addEventListener('click', () =>
        document.querySelectorAll('.dropdown-filter.active').forEach((f) => f.classList.remove('active'))
      );

      document.querySelectorAll('.dropdown-content').forEach((c) =>
        c.addEventListener('click', (e) => e.stopPropagation())
      );

      if (searchInput) {
        let searchDebounce;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchDebounce);
          searchDebounce = setTimeout(() => {
            state.search = e.target.value;
            state.page = 1;
            fetchRecipes();
          }, 500);
        });
      }

      if (limitSelect) {
        limitSelect.addEventListener('change', (e) => {
          state.limit = parseInt(e.target.value, 10);
          state.page = 1;
          fetchRecipes();
        });
      }

      if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
          state = { page: 1, limit: state.limit, search: '', categorias: [], tags: [] };
          if (searchInput) searchInput.value = '';
          document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach((cb) => (cb.checked = false));
          document.querySelectorAll('.dropdown-filter').forEach((el) => {
            const buttonSpan = el.querySelector('.filter-btn span');
            if (buttonSpan) buttonSpan.innerText = buttonSpan.getAttribute('data-original-text') || buttonSpan.innerText;
          });
          fetchRecipes();
        });
      }
    };

    const initListPage = () => {
      setupEventListeners();
      if (categoryFilter) populateFilterDropdown(categoryFilter, 'categories', 'categorias');
      if (tagFilter)      populateFilterDropdown(tagFilter, 'tags',       'tags');
      fetchRecipes();
    };

    initListPage();
  })();

  // ======================================================
  // RECOMENDADOS — 3 da mesma categoria (com fallback)
  // ======================================================
  const renderRecommended = (recipes, container) => {
    if (!container) return;
    container.innerHTML = '';

    if (!recipes || recipes.length === 0) {
      const section = container.closest('.recommended-recipes');
      if (section) section.classList.add('is-empty');
      return;
    }

    recipes.forEach((r) => {
      const categoryName = r.categoria ? r.categoria.nome : 'Destaque';
      const imageUrl = buildImageUrl(r.imagem_url);
      const prep = r.tempo_preparo_min ?? '?';
      const dif  = r.dificuldade ?? '?';

      const card = document.createElement('a');
      card.href = `receita.html?id=${r.id}`;
      card.className = 'recipe-link';
      card.innerHTML = `
        <article class="recipe-card">
          <div class="recipe-card-img-container">
            <img src="${imageUrl}" alt="${r.titulo}" loading="lazy">
            <span class="recipe-category-tag">${categoryName}</span>
          </div>
          <div class="recipe-card-content">
            <h3>${r.titulo}</h3>
            <p>${r.resumo || ''}</p>
          </div>
          <div class="recipe-card-footer">
            <div class="recipe-meta">
              <span><i class="fas fa-clock"></i> ${prep} min</span>
              <span><i class="fas fa-utensils"></i> ${dif}</span>
            </div>
            <span class="read-more-link">Ver Receita <i class="fas fa-arrow-right"></i></span>
          </div>
        </article>`;
      container.appendChild(card);
    });
  };

  const loadRecommendedByCategory = async (recipe) => {
    const grid = document.querySelector('.recommended-recipes .recipe-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="grid-loader"></div>';

    try {
      const thisId = String(recipe.id);
      const catId  = getCategoryId(recipe);
      let list = [];

      // 1) pela mesma categoria (pede bastante, filtra e depois corta 3)
      if (catId) {
        const res = await fetch(`${API_BASE_URL}/recipes?categorias=${catId}&page=1&limit=20`);
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json();
        list = Array.isArray(data) ? data : (data.data || []);
      }

      // remove a própria receita e duplicados
      const seen = new Set([thisId]);
      list = list.filter((r) => {
        const id = String(r.id);
        if (seen.has(id) || id === thisId) return false;
        seen.add(id);
        return true;
      });

      // 2) fallback para preencher até 3 (tenta manter a mesma categoria)
      if (list.length < 3) {
        const res2 = await fetch(`${API_BASE_URL}/recipes?page=1&limit=20`);
        if (res2.ok) {
          const data2 = await res2.json();
          const pool  = Array.isArray(data2) ? data2 : (data2.data || []);
          for (const r of pool) {
            const id = String(r.id);
            if (id === thisId || seen.has(id)) continue;
            if (catId && getCategoryId(r) !== catId) continue; // mantém categoria
            seen.add(id);
            list.push(r);
            if (list.length >= 3) break;
          }
        }
      }

      const top3 = sortNewestFirst(list).slice(0, 3);
      renderRecommended(top3, grid);
    } catch (e) {
      console.error('Falha ao carregar recomendados:', e);
      grid.innerHTML = '<p class="error-message">Não foi possível carregar recomendações no momento.</p>';
    }
  };

  // ======================================================
  // Carrossel (galeria)
  // ======================================================
  function buildRecipeImageList(recipe, buildImageUrl) {
    const extra  = recipe.imagens || recipe.galeria_imagens || recipe.galeria || [];
    const extras = extra.map((x) => x?.url || x?.imagem_url || x).filter(Boolean);
    const all    = [recipe.imagem_url, ...extras].map(buildImageUrl);
    return [...new Set(all.filter(Boolean))];
  }

  function mountCarousel(images) {
    const carousel = document.getElementById('recipe-carousel');
    const track    = document.getElementById('carousel-track');
    const dots     = document.getElementById('carousel-dots');
    const prev     = document.getElementById('carousel-prev');
    const next     = document.getElementById('carousel-next');
    if (!carousel || !track || !prev || !next || !dots) return;

    if (!images || images.length === 0) { carousel.style.display = 'none'; return; }

    track.innerHTML = ''; dots.innerHTML = '';
    images.forEach((src, idx) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.innerHTML = `<img src="${src}" alt="Foto ${idx + 1} da receita" loading="lazy">`;
      track.appendChild(slide);

      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Ir para a imagem ${idx + 1}`);
      dots.appendChild(dot);
    });

    let index = 0;
    const total = images.length;

    const goTo = (i) => {
      index = (i + total) % total;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.querySelectorAll('.carousel-dot').forEach((d, di) => d.classList.toggle('active', di === index));
    };

    prev.onclick = () => goTo(index - 1);
    next.onclick = () => goTo(index + 1);
    dots.querySelectorAll('.carousel-dot').forEach((d, di) => (d.onclick = () => goTo(di)));

    // swipe
    let startX = 0, dx = 0;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive:true});
    track.addEventListener('touchmove',  (e) => { dx = e.touches[0].clientX - startX; }, {passive:true});
    track.addEventListener('touchend',   () => { if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1)); dx = 0; });

    // teclas
    carousel.tabIndex = 0;
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prev.click();
      if (e.key === 'ArrowRight') next.click();
    });

    // se tiver só 1 imagem, esconde controles
    if (images.length <= 1) {
      dots.style.display = 'none';
      prev.style.display = 'none';
      next.style.display = 'none';
    }
  }

  // ======================================================
  // Página de RECEITA
  // ======================================================
  async function fetchSingleRecipe() {
    const recipeTitleEl = document.getElementById('recipe-title');
    if (!recipeTitleEl) return; // não é a página de receita

    const params   = new URLSearchParams(window.location.search);
    const recipeId = params.get('id');
    if (!recipeId) {
      recipeTitleEl.textContent = 'Receita não encontrada';
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`);
      if (!response.ok) throw new Error('Receita não encontrada');
      const recipe = await response.json();

      document.title = `Receita: ${recipe.titulo} - Receitas Milionárias`;

      const heroEl   = document.getElementById('recipe-hero');
      const imageUrl = buildImageUrl(recipe.imagem_url);
      if (heroEl) heroEl.style.backgroundImage =
        `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${imageUrl}')`;

      recipeTitleEl.textContent = recipe.titulo;

      const summaryEl = document.getElementById('recipe-summary');
      if (summaryEl) summaryEl.textContent = recipe.resumo ?? '';

      const prepEl    = document.getElementById('recipe-prep-time');
      const difEl     = document.getElementById('recipe-difficulty');
      const calEl     = document.getElementById('recipe-calories');
      const creatorEl = document.getElementById('recipe-creator');

      if (prepEl)    prepEl.innerHTML    = `<i class="fas fa-clock"></i><span><strong>Preparo:</strong> ${recipe.tempo_preparo_min ?? '--'} min</span>`;
      if (difEl)     difEl.innerHTML     = `<i class="fas fa-utensils"></i><span><strong>Dificuldade:</strong> ${recipe.dificuldade ?? '--'}</span>`;
      if (calEl)     calEl.innerHTML     = `<i class="fas fa-fire-alt"></i><span><strong>Calorias:</strong> ${recipe.calorias_kcal ?? '--'} kcal</span>`;
      if (creatorEl) creatorEl.innerHTML = `<i class="fas fa-user"></i><span><strong>Criador:</strong> ${recipe.criador?.nome ?? '--'}</span>`;

      // Ingredientes
      const ingredientsContainer = document.getElementById('recipe-ingredients-list');
      if (ingredientsContainer) {
        let html = '<h2><i class="fas fa-carrot"></i> Ingredientes</h2>';
        if (recipe.grupos_ingredientes?.length) {
          recipe.grupos_ingredientes.forEach((group) => {
            html += `<h3>${group.titulo}</h3><ul>`;
            group.ingredientes.forEach((ing) => {
              html += `<li>${ing.descricao} ${ing.observacao ? `<em>(${ing.observacao})</em>` : ''}</li>`;
            });
            html += '</ul>';
          });
        } else {
          html += '<p>Ingredientes não especificados.</p>';
        }
        ingredientsContainer.innerHTML = html;
      }

      // Carrossel
      const imageList = buildRecipeImageList(recipe, buildImageUrl);
      mountCarousel(imageList);

      // Modo de preparo
      const instructionsContainer = document.getElementById('recipe-instructions-list');
      if (instructionsContainer) {
        let html = '<h2><i class="fas fa-book-open"></i> Modo de Preparo</h2>';
        if (recipe.passos_preparo?.length) {
          html += '<ol>';
          recipe.passos_preparo.forEach((step) => {
            html += `<li>${step.descricao} ${step.observacao ? `<em>(${step.observacao})</em>` : ''}</li>`;
          });
          html += '</ol>';
        } else {
          html += '<p>Modo de preparo não especificado.</p>';
        }
        instructionsContainer.innerHTML = html;
      }

      // Recomendadas (3 da mesma categoria)
      loadRecommendedByCategory(recipe);
    } catch (error) {
      console.error('Falha ao buscar a receita:', error);
      const title   = document.getElementById('recipe-title');
      const summary = document.getElementById('recipe-summary');
      if (title)   title.textContent   = 'Erro ao carregar a receita';
      if (summary) summary.textContent = 'Não foi possível encontrar a receita solicitada. Por favor, tente novamente.';
    }
  }
  fetchSingleRecipe();

  // ======================================================
  // DESTAQUES (somente no index)
  // ======================================================
  (function setupFeaturedRecipes() {
    const featuredGrid = document.getElementById('featured-grid');
    if (!featuredGrid) return;

    const renderFeatured = (recipes) => {
      if (!recipes || recipes.length === 0) {
        featuredGrid.innerHTML = '<p class="error-message">Sem receitas em destaque no momento.</p>';
        return;
      }
      featuredGrid.innerHTML = '';
      recipes.forEach((r) => {
        const categoryName = r.categoria ? r.categoria.nome : 'Destaque';
        const imageUrl     = buildImageUrl(r.imagem_url);
        const prep = r.tempo_preparo_min ?? '?';
        const dif  = r.dificuldade ?? '?';
        const card = document.createElement('a');
        card.href = `receita.html?id=${r.id}`;
        card.className = 'recipe-link';
        card.innerHTML = `
          <article class="recipe-card">
            <div class="recipe-card-img-container">
              <img src="${imageUrl}" alt="${r.titulo}" loading="lazy">
              <span class="recipe-category-tag">${categoryName}</span>
            </div>
            <div class="recipe-card-content">
              <h3>${r.titulo}</h3>
              <p>${r.resumo || ''}</p>
            </div>
            <div class="recipe-card-footer">
              <div class="recipe-meta">
                <span><i class="fas fa-clock"></i> ${prep} min</span>
                <span><i class="fas fa-utensils"></i> ${dif}</span>
              </div>
              <span class="read-more-link">Ver Receita <i class="fas fa-arrow-right"></i></span>
            </div>
          </article>`;
        featuredGrid.appendChild(card);
      });
    };

    const loadFeatured = async () => {
      featuredGrid.innerHTML = '<div class="grid-loader"></div>';
      try {
        const res = await fetch(`${API_BASE_URL}/recipes?page=1&limit=12`);
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        const newest = sortNewestFirst(list).slice(0, 3);
        renderFeatured(newest);
      } catch (e) {
        console.error('Falha ao carregar destaques:', e);
        featuredGrid.innerHTML = '<p class="error-message">Não foi possível carregar as receitas em destaque.</p>';
      }
    };

    loadFeatured();
  })();
});

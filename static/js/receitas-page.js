/* receitas-page.js — lógica exclusiva da página receitas.html */
(function () {
  const API = "https://api.receitasmilionarias.com.br";

  // ── Estado ────────────────────────────────────────────────────
  let state = { page: 1, limit: 15, search: "", categorias: [], tags: [], produtor: "" };

  // ── Elementos ─────────────────────────────────────────────────
  const grid         = document.getElementById("receitas-grid");
  const emptyEl      = document.getElementById("receitas-empty");
  const paginationEl = document.getElementById("pagination-controls");
  const countEl      = document.getElementById("results-count");
  const searchInput  = document.getElementById("search-input");
  const searchClear  = document.getElementById("search-clear-btn");
  const limitSelect  = document.getElementById("limit-select");
  const chipsEl      = document.getElementById("active-filters-chips");
  const filterBadge  = document.getElementById("filter-badge");
  const sidebarClear = document.getElementById("clear-filters-btn");
  const drawerEl     = document.getElementById("filter-drawer");
  const drawerOverlay= document.getElementById("drawer-overlay");
  const openBtn      = document.getElementById("open-filters");
  const closeBtn     = document.getElementById("close-filters");
  const drawerClear  = document.getElementById("drawer-clear-btn");
  const drawerApply  = document.getElementById("drawer-apply-btn");

  if (!grid) return;

  // ── Cache de dados da API ─────────────────────────────────────
  const cache = { categorias: null, tags: null, produtores: null };

  // ── Imagem ────────────────────────────────────────────────────
  function buildImg(url) {
    if (!url) return "static/images/receitas_capa.png";
    if (/^https?:\/\//i.test(url)) return url;
    // remove leading slash, garante path correto
    const clean = url.replace(/^\//, "");
    const idx = clean.indexOf("uploads");
    const path = idx !== -1 ? clean.substring(idx) : clean;
    return `${API}/${path}`;
  }

  // ── Skeletons ─────────────────────────────────────────────────
  function showSkeletons(n) {
    grid.innerHTML = Array.from({ length: n }, () => `
      <div class="recipe-card skeleton">
        <div class="skeleton-block skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-block skeleton-title"></div>
          <div class="skeleton-block skeleton-title2"></div>
          <div class="skeleton-block skeleton-line"></div>
          <div class="skeleton-block skeleton-line short"></div>
        </div>
      </div>`).join("");
  }

  // ── Render cards ──────────────────────────────────────────────
  function renderCards(recipes) {
    grid.innerHTML = "";
    if (!recipes.length) {
      if (emptyEl) emptyEl.style.display = "";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    recipes.forEach((r) => {
      const cat  = r.categoria?.nome || "Receita";
      const img  = buildImg(r.imagem_url);
      const prep = r.tempo_preparo_min ?? "?";
      const dif  = r.dificuldade ?? "Médio";
      const a = document.createElement("a");
      a.href = `receita.html?id=${r.id}`;
      a.className = "recipe-link";
      a.innerHTML = `
        <article class="recipe-card">
          <div class="recipe-card-img-container">
            <img src="${img}" alt="${r.titulo}" loading="lazy" onerror="this.src='static/images/receitas_capa.png'">
            <span class="recipe-category-tag">${cat}</span>
          </div>
          <div class="recipe-card-content">
            <h3>${r.titulo}</h3>
            <p>${r.descricao_curta || ""}</p>
            <div class="recipe-card-meta">
              <span><i class="fas fa-clock"></i> ${prep} min</span>
              <span><i class="fas fa-chart-bar"></i> ${dif}</span>
            </div>
          </div>
        </article>`;
      grid.appendChild(a);
    });
  }

  // ── Paginação ─────────────────────────────────────────────────
  function renderPagination(total, current) {
    if (!paginationEl) return;
    paginationEl.innerHTML = "";
    if (total <= 1) return;
    const mk = (label, page, disabled, active) => {
      const b = document.createElement("button");
      b.className = "page-btn" + (active ? " active" : "") + (disabled ? " disabled" : "");
      b.innerHTML = label;
      b.disabled = disabled;
      if (!disabled && !active) b.addEventListener("click", () => {
        state.page = page;
        fetchRecipes();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      return b;
    };
    paginationEl.appendChild(mk('<i class="fas fa-chevron-left"></i>', current - 1, current === 1, false));
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
        paginationEl.appendChild(mk(i, i, false, i === current));
      } else if (paginationEl.lastElementChild?.textContent !== "…") {
        const s = document.createElement("span");
        s.className = "page-ellipsis";
        s.textContent = "…";
        paginationEl.appendChild(s);
      }
    }
    paginationEl.appendChild(mk('<i class="fas fa-chevron-right"></i>', current + 1, current === total, false));
  }

  // ── Chips filtros ativos ──────────────────────────────────────
  function renderActiveChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    const add = (label, removeFn) => {
      const chip = document.createElement("span");
      chip.className = "rp-chip";
      chip.innerHTML = `${label}<button title="Remover"><i class="fas fa-times"></i></button>`;
      chip.querySelector("button").addEventListener("click", removeFn);
      chipsEl.appendChild(chip);
    };
    state.categorias.forEach(id => {
      const item = (cache.categorias || []).find(c => String(c.id) === String(id));
      if (item) add(item.nome, () => {
        state.categorias = state.categorias.filter(x => x !== id);
        state.page = 1; refresh();
      });
    });
    state.tags.forEach(id => {
      const item = (cache.tags || []).find(t => String(t.id) === String(id));
      if (item) add(item.nome, () => {
        state.tags = state.tags.filter(x => x !== id);
        state.page = 1; refresh();
      });
    });
    if (state.produtor) {
      const item = (cache.produtores || []).find(p => String(p.id) === String(state.produtor));
      const nome = item ? `${item.nome || ""} ${item.sobrenome || ""}`.trim() : "Produtor";
      add(nome, () => { state.produtor = ""; state.page = 1; refresh(); });
    }
  }

  function updateFilterBadge() {
    if (!filterBadge) return;
    const n = state.categorias.length + state.tags.length + (state.produtor ? 1 : 0);
    filterBadge.textContent = n;
    filterBadge.style.display = n > 0 ? "inline-flex" : "none";
  }

  function refresh() {
    updateFilterBadge();
    renderActiveChips();
    syncAllSelects();
    fetchRecipes();
  }

  // ── COMBOBOX / SELECT customizado ────────────────────────────
  // Cria um <select> nativo estilizado para multi-select (categorias/tags)
  // e single-select (produtor). Simples, funcional, sem bugs de dropdown.

  function buildMultiSelect(container, items, filterKey, placeholder) {
    if (!container) return;
    container.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "rp-combo-wrap";

    const select = document.createElement("select");
    select.className = "rp-combo-select";
    select.multiple = true;
    select.setAttribute("aria-label", placeholder);
    select.setAttribute("data-filter-key", filterKey);
    select.setAttribute("data-placeholder", placeholder);

    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = item.nome;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      state[filterKey] = Array.from(select.selectedOptions).map(o => o.value);
      state.page = 1;
      refresh();
    });

    const hint = document.createElement("span");
    hint.className = "rp-combo-hint";
    hint.textContent = "Ctrl+clique para selecionar múltiplos";
    wrap.appendChild(select);
    wrap.appendChild(hint);
    container.appendChild(wrap);

    // helper para sincronizar visual com state
    select._syncState = () => {
      Array.from(select.options).forEach(opt => {
        opt.selected = state[filterKey].includes(opt.value);
      });
    };
  }

  function buildSingleSelect(container, items, placeholder) {
    if (!container) return;
    container.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "rp-combo-wrap";

    const select = document.createElement("select");
    select.className = "rp-combo-select";
    select.setAttribute("aria-label", placeholder);
    select.setAttribute("data-filter-key", "produtor");

    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = `Todos os produtores`;
    select.appendChild(emptyOpt);

    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = `${item.nome || ""} ${item.sobrenome || ""}`.trim() || "Produtor";
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      state.produtor = select.value;
      state.page = 1;
      refresh();
    });

    wrap.appendChild(select);
    container.appendChild(wrap);

    select._syncState = () => { select.value = state.produtor; };
  }

  function syncAllSelects() {
    document.querySelectorAll(".rp-combo-select[data-filter-key]").forEach(sel => {
      if (sel._syncState) sel._syncState();
    });
  }

  // ── Accordion ─────────────────────────────────────────────────
  document.querySelectorAll(".rp-filter-group-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      toggle.closest(".rp-filter-group").classList.toggle("collapsed");
    });
  });

  // ── Carregar filtros da API ───────────────────────────────────
  async function loadFilters() {
    try {
      const [cats, tags, prods] = await Promise.all([
        fetch(`${API}/categories`).then(r => r.json()),
        fetch(`${API}/tags`).then(r => r.json()),
        fetch(`${API}/producers`).then(r => r.json()),
      ]);
      cache.categorias = cats || [];
      cache.tags       = tags || [];
      cache.produtores = prods || [];

      // Sidebar selects
      buildMultiSelect(document.getElementById("category-filter"), cache.categorias, "categorias", "Categorias");
      buildMultiSelect(document.getElementById("tag-filter"),      cache.tags,       "tags",       "Tags");
      buildSingleSelect(document.getElementById("producer-filter"), cache.produtores, "Produtor");

      // Drawer selects (duplicados para mobile)
      buildMultiSelect(document.getElementById("drawer-category-filter"), cache.categorias, "categorias", "Categorias");
      buildMultiSelect(document.getElementById("drawer-tag-filter"),      cache.tags,       "tags",       "Tags");
      buildSingleSelect(document.getElementById("drawer-producer-filter"), cache.produtores, "Produtor");

    } catch (e) {
      console.error("Erro ao carregar filtros:", e);
    }
  }

  // ── Buscar receitas ───────────────────────────────────────────
  async function fetchRecipes() {
    showSkeletons(state.limit > 15 ? 9 : 6);
    if (countEl)      countEl.innerHTML = "";
    if (paginationEl) paginationEl.innerHTML = "";
    if (emptyEl)      emptyEl.style.display = "none";

    const p = new URLSearchParams({ page: state.page, limit: state.limit, status: "ativo" });
    if (state.search)            p.append("search", state.search);
    if (state.categorias.length) p.append("categorias", state.categorias.join(","));
    if (state.tags.length)       p.append("tags", state.tags.join(","));
    if (state.produtor)          p.append("produtor", state.produtor);

    try {
      const res = await fetch(`${API}/recipes?${p}`);
      if (!res.ok) throw new Error(res.status);
      const result = await res.json();

      let recipes, pagination;
      if (Array.isArray(result)) {
        recipes = result;
        pagination = { currentPage: 1, totalPages: 1, totalItems: result.length };
      } else {
        recipes    = result.data || [];
        pagination = result.pagination || { currentPage: 1, totalPages: 1, totalItems: recipes.length };
      }

      renderCards(recipes);
      renderPagination(pagination.totalPages, pagination.currentPage);
      if (countEl && pagination.totalItems > 0) {
        const s = (pagination.currentPage - 1) * state.limit + 1;
        const e = Math.min(pagination.currentPage * state.limit, pagination.totalItems);
        countEl.innerHTML = `<strong>${s}–${e}</strong> de <strong>${pagination.totalItems}</strong> receitas`;
      }
    } catch (e) {
      console.error("Erro ao buscar receitas:", e);
      grid.innerHTML = '<p style="text-align:center;color:#aaa;padding:60px">Erro ao carregar. Tente novamente.</p>';
    }
  }

  // ── Limpar tudo ───────────────────────────────────────────────
  function clearAllFilters() {
    state.categorias = [];
    state.tags = [];
    state.produtor = "";
    state.page = 1;
    refresh();
  }

  // ── Drawer ────────────────────────────────────────────────────
  function openDrawer()  {
    drawerEl?.classList.add("open");
    drawerOverlay?.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawerEl?.classList.remove("open");
    drawerOverlay?.classList.remove("open");
    document.body.style.overflow = "";
  }

  openBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  drawerOverlay?.addEventListener("click", closeDrawer);
  drawerClear?.addEventListener("click", () => { clearAllFilters(); closeDrawer(); });
  drawerApply?.addEventListener("click", () => { state.page = 1; fetchRecipes(); closeDrawer(); });

  sidebarClear?.addEventListener("click", clearAllFilters);
  document.getElementById("clear-filters-empty")?.addEventListener("click", clearAllFilters);

  searchInput?.addEventListener("input", () => {
    if (searchClear) searchClear.style.display = searchInput.value ? "" : "none";
    clearTimeout(searchInput._t);
    searchInput._t = setTimeout(() => {
      state.search = searchInput.value.trim();
      state.page = 1;
      fetchRecipes();
    }, 400);
  });
  searchClear?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (searchClear) searchClear.style.display = "none";
    state.search = "";
    state.page = 1;
    fetchRecipes();
  });

  limitSelect?.addEventListener("change", () => {
    state.limit = parseInt(limitSelect.value, 10);
    state.page = 1;
    fetchRecipes();
  });

  // ── Init ──────────────────────────────────────────────────────
  loadFilters();
  fetchRecipes();

})();

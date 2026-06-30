/* receitas-page.js — lógica exclusiva da página receitas.html */
(function () {
  const API = "https://api.receitasmilionarias.com.br";

  // ── Estado ────────────────────────────────────────────────────
  let state = { page: 1, limit: 15, search: "", categorias: [], tags: [], produtor: "" };

  // ── Elementos ─────────────────────────────────────────────────
  const grid          = document.getElementById("receitas-grid");
  const emptyEl       = document.getElementById("receitas-empty");
  const paginationEl  = document.getElementById("pagination-controls");
  const countEl       = document.getElementById("results-count");
  const searchInput   = document.getElementById("search-input");
  const searchClear   = document.getElementById("search-clear-btn");
  const limitSelect   = document.getElementById("limit-select");
  const chipsEl       = document.getElementById("active-filters-chips");
  const filterBadge   = document.getElementById("filter-badge");

  // Sidebar (desktop)
  const catEl         = document.getElementById("category-filter");
  const tagEl         = document.getElementById("tag-filter");
  const prodEl        = document.getElementById("producer-filter");
  const sidebarClear  = document.getElementById("clear-filters-btn");

  // Drawer (mobile/overlay)
  const drawer        = document.getElementById("filter-drawer");
  const drawerOverlay = document.getElementById("drawer-overlay");
  const openBtn       = document.getElementById("open-filters");
  const closeBtn      = document.getElementById("close-filters");
  const drawerCatEl   = document.getElementById("drawer-category-filter");
  const drawerTagEl   = document.getElementById("drawer-tag-filter");
  const drawerProdEl  = document.getElementById("drawer-producer-filter");
  const drawerClear   = document.getElementById("drawer-clear-btn");
  const drawerApply   = document.getElementById("drawer-apply-btn");

  // Se não tem grid, não é a página de receitas — sai
  if (!grid) return;

  // ── Dados em cache (só busca 1x da API) ───────────────────────
  const cache = { categorias: null, tags: null, produtores: null };

  // ── Imagem ────────────────────────────────────────────────────
  function buildImg(url) {
    if (!url) return "static/images/receitas_capa.png";
    if (url.startsWith("http")) return url;
    return `${API}/uploads/${url}`;
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
      const cat = r.categoria ? r.categoria.nome : "Receita";
      const img = buildImg(r.imagem_url);
      const prep = r.tempo_preparo_min ?? "?";
      const dif = r.dificuldade ?? "Médio";
      const a = document.createElement("a");
      a.href = `receita.html?id=${r.id}`;
      a.className = "recipe-link";
      a.innerHTML = `
        <article class="recipe-card">
          <div class="recipe-card-img-container">
            <img src="${img}" alt="${r.titulo}" loading="lazy">
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
      if (!disabled && !active) b.addEventListener("click", () => { state.page = page; fetchRecipes(); window.scrollTo({ top: 0, behavior: "smooth" }); });
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
    const add = (label, removeFunc) => {
      const chip = document.createElement("span");
      chip.className = "rp-chip";
      chip.innerHTML = `${label}<button title="Remover"><i class="fas fa-times"></i></button>`;
      chip.querySelector("button").addEventListener("click", removeFunc);
      chipsEl.appendChild(chip);
    };
    // categorias
    state.categorias.forEach((id) => {
      const item = (cache.categorias || []).find(c => String(c.id) === String(id));
      if (item) add(item.nome, () => { state.categorias = state.categorias.filter(x => x !== id); state.page = 1; fetchRecipes(); updateFilterBadge(); syncChips(); });
    });
    // tags
    state.tags.forEach((id) => {
      const item = (cache.tags || []).find(t => String(t.id) === String(id));
      if (item) add(item.nome, () => { state.tags = state.tags.filter(x => x !== id); state.page = 1; fetchRecipes(); updateFilterBadge(); syncChips(); });
    });
    // produtor
    if (state.produtor) {
      const item = (cache.produtores || []).find(p => String(p.id) === String(state.produtor));
      const nome = item ? `${item.nome || ""} ${item.sobrenome || ""}`.trim() : "Produtor";
      add(nome, () => { state.produtor = ""; state.page = 1; fetchRecipes(); updateFilterBadge(); syncChips(); });
    }
  }

  // ── Badge de filtros ──────────────────────────────────────────
  function updateFilterBadge() {
    if (!filterBadge) return;
    const n = state.categorias.length + state.tags.length + (state.produtor ? 1 : 0);
    filterBadge.textContent = n;
    filterBadge.style.display = n > 0 ? "inline-flex" : "none";
  }

  // ── Sincroniza chips visuais com state ────────────────────────
  function syncChips() {
    // sidebar + drawer
    document.querySelectorAll(".rp-filter-chips button[data-value]").forEach((btn) => {
      const container = btn.closest(".rp-filter-chips");
      if (!container) return;
      const id = btn.closest("[data-filter-type]")?.dataset.filterType;
      const val = btn.dataset.value;
      if (!val) {
        // "Todos"
        btn.classList.toggle("active",
          id === "categorias" ? state.categorias.length === 0 :
          id === "tags" ? state.tags.length === 0 :
          id === "produtor" ? state.produtor === "" : false
        );
      } else {
        btn.classList.toggle("active",
          id === "categorias" ? state.categorias.includes(val) :
          id === "tags" ? state.tags.includes(val) :
          id === "produtor" ? state.produtor === val : false
        );
      }
    });
  }

  // ── Popula chips num container ────────────────────────────────
  function populateChips(container, items, filterType, singleSelect) {
    if (!container) return;
    container.setAttribute("data-filter-type", filterType);
    container.innerHTML = "";

    // Botão "Todos"
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.dataset.value = "";
    allBtn.textContent = "Todos";
    allBtn.classList.add("active");
    allBtn.addEventListener("click", () => {
      if (filterType === "categorias") state.categorias = [];
      else if (filterType === "tags") state.tags = [];
      else if (filterType === "produtor") state.produtor = "";
      syncChips();
    });
    container.appendChild(allBtn);

    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.value = String(item.id);
      btn.textContent = item.nome || `${item.nome || ""} ${item.sobrenome || ""}`.trim();
      btn.addEventListener("click", () => {
        const val = String(item.id);
        if (singleSelect) {
          state[filterType] = val;
        } else {
          const arr = state[filterType];
          const idx = arr.indexOf(val);
          if (idx >= 0) arr.splice(idx, 1);
          else arr.push(val);
        }
        syncChips();
      });
      container.appendChild(btn);
    });

    syncChips();
  }

  // ── Produtor: label especial ──────────────────────────────────
  function populateProdutorChips(container, items) {
    if (!container) return;
    container.setAttribute("data-filter-type", "produtor");
    container.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.dataset.value = "";
    allBtn.textContent = "Todos";
    allBtn.classList.add("active");
    allBtn.addEventListener("click", () => { state.produtor = ""; syncChips(); });
    container.appendChild(allBtn);
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.value = String(item.id);
      btn.textContent = `${item.nome || ""} ${item.sobrenome || ""}`.trim() || "Produtor";
      btn.addEventListener("click", () => { state.produtor = String(item.id); syncChips(); });
      container.appendChild(btn);
    });
    syncChips();
  }

  // ── Accordion dos grupos ──────────────────────────────────────
  function bindAccordion(groupEl) {
    const toggle = groupEl.querySelector(".rp-filter-group-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      groupEl.classList.toggle("collapsed");
    });
  }
  document.querySelectorAll(".rp-filter-group").forEach(bindAccordion);

  // ── Carregar dados da API ─────────────────────────────────────
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

      // Sidebar
      populateChips(catEl,  cache.categorias, "categorias", false);
      populateChips(tagEl,  cache.tags,       "tags",       false);
      populateProdutorChips(prodEl, cache.produtores);

      // Drawer
      populateChips(drawerCatEl,  cache.categorias, "categorias", false);
      populateChips(drawerTagEl,  cache.tags,       "tags",       false);
      populateProdutorChips(drawerProdEl, cache.produtores);

    } catch (e) {
      console.error("Erro ao carregar filtros:", e);
    }
  }

  // ── Buscar receitas ───────────────────────────────────────────
  async function fetchRecipes() {
    showSkeletons(state.limit > 15 ? 9 : 6);
    if (countEl) countEl.innerHTML = "";
    if (paginationEl) paginationEl.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "none";

    const p = new URLSearchParams({ page: state.page, limit: state.limit, status: "ativo" });
    if (state.search)             p.append("search", state.search);
    if (state.categorias.length)  p.append("categorias", state.categorias.join(","));
    if (state.tags.length)        p.append("tags", state.tags.join(","));
    if (state.produtor)           p.append("produtor", state.produtor);

    renderActiveChips();
    updateFilterBadge();

    try {
      const res = await fetch(`${API}/recipes?${p}`);
      if (!res.ok) throw new Error(res.status);
      const result = await res.json();

      let recipes, pagination;
      if (Array.isArray(result)) {
        recipes = result;
        pagination = { currentPage: 1, totalPages: 1, totalItems: result.length };
      } else {
        recipes = result.data || [];
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
      grid.innerHTML = '<p style="text-align:center;color:#aaa;padding:40px">Erro ao carregar receitas.</p>';
    }
  }

  // ── Limpar filtros ────────────────────────────────────────────
  function clearAllFilters() {
    state.categorias = [];
    state.tags = [];
    state.produtor = "";
    state.page = 1;
    syncChips();
    updateFilterBadge();
    renderActiveChips();
    fetchRecipes();
  }

  // ── Drawer open/close ─────────────────────────────────────────
  function openDrawer() {
    drawer?.classList.add("open");
    drawerOverlay?.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawer?.classList.remove("open");
    drawerOverlay?.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ── Event listeners ───────────────────────────────────────────
  openBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  drawerOverlay?.addEventListener("click", closeDrawer);

  drawerApply?.addEventListener("click", () => {
    state.page = 1;
    fetchRecipes();
    closeDrawer();
  });
  drawerClear?.addEventListener("click", () => {
    clearAllFilters();
    closeDrawer();
  });

  sidebarClear?.addEventListener("click", clearAllFilters);

  document.getElementById("clear-filters-btn")?.addEventListener("click", clearAllFilters);
  document.getElementById("clear-filters-empty")?.addEventListener("click", clearAllFilters);

  searchInput?.addEventListener("input", () => {
    searchClear && (searchClear.style.display = searchInput.value ? "" : "none");
    clearTimeout(searchInput._t);
    searchInput._t = setTimeout(() => {
      state.search = searchInput.value.trim();
      state.page = 1;
      fetchRecipes();
    }, 400);
  });
  searchClear?.addEventListener("click", () => {
    searchInput.value = "";
    searchClear.style.display = "none";
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

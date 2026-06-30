/* receitas-page.js */
(function () {
  const API = "https://api.receitasmilionarias.com.br";

  // ── Estado ────────────────────────────────────────────────────
  let state = { page: 1, limit: 15, search: "", categoria: "", tag: "", produtor: "" };

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

  // Selects toolbar (desktop)
  const catSel   = document.getElementById("category-filter");
  const tagSel   = document.getElementById("tag-filter");
  const prodSel  = document.getElementById("producer-filter");
  const clearBtn = document.getElementById("clear-filters-btn");

  // Drawer (mobile)
  const drawer        = document.getElementById("filter-drawer");
  const drawerOverlay = document.getElementById("drawer-overlay");
  const openBtn       = document.getElementById("open-filters");
  const closeBtn      = document.getElementById("close-filters");
  const dCatSel       = document.getElementById("drawer-category-filter");
  const dTagSel       = document.getElementById("drawer-tag-filter");
  const dProdSel      = document.getElementById("drawer-producer-filter");
  const drawerClear   = document.getElementById("drawer-clear-btn");
  const drawerApply   = document.getElementById("drawer-apply-btn");

  if (!grid) return;

  // ── Imagem ────────────────────────────────────────────────────
  function buildImg(url) {
    if (!url) return "static/images/receitas_capa.png";
    if (/^https?:\/\//i.test(url)) return url;
    const clean = url.replace(/^\//, "");
    const idx = clean.indexOf("uploads");
    return `${API}/${idx !== -1 ? clean.substring(idx) : clean}`;
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

  // ── Cards ─────────────────────────────────────────────────────
  function renderCards(recipes) {
    grid.innerHTML = "";
    if (!recipes.length) { if (emptyEl) emptyEl.style.display = ""; return; }
    if (emptyEl) emptyEl.style.display = "none";
    recipes.forEach(r => {
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
      b.innerHTML = label; b.disabled = disabled;
      if (!disabled && !active) b.addEventListener("click", () => {
        state.page = page; fetchRecipes(); window.scrollTo({ top: 0, behavior: "smooth" });
      });
      return b;
    };
    paginationEl.appendChild(mk('<i class="fas fa-chevron-left"></i>', current - 1, current === 1, false));
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 2 && i <= current + 2))
        paginationEl.appendChild(mk(i, i, false, i === current));
      else if (paginationEl.lastElementChild?.textContent !== "…") {
        const s = document.createElement("span"); s.className = "page-ellipsis"; s.textContent = "…";
        paginationEl.appendChild(s);
      }
    }
    paginationEl.appendChild(mk('<i class="fas fa-chevron-right"></i>', current + 1, current === total, false));
  }

  // ── Chips ativos ──────────────────────────────────────────────
  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    const add = (label, clearFn) => {
      const c = document.createElement("span");
      c.className = "rp-chip";
      c.innerHTML = `${label}<button title="Remover"><i class="fas fa-times"></i></button>`;
      c.querySelector("button").addEventListener("click", clearFn);
      chipsEl.appendChild(c);
    };
    if (state.categoria) {
      const opt = catSel?.querySelector(`option[value="${state.categoria}"]`);
      add(opt?.textContent || state.categoria, () => { state.categoria = ""; syncSelects(); refresh(); });
    }
    if (state.tag) {
      const opt = tagSel?.querySelector(`option[value="${state.tag}"]`);
      add(opt?.textContent || state.tag, () => { state.tag = ""; syncSelects(); refresh(); });
    }
    if (state.produtor) {
      const opt = prodSel?.querySelector(`option[value="${state.produtor}"]`);
      add(opt?.textContent || state.produtor, () => { state.produtor = ""; syncSelects(); refresh(); });
    }
  }

  function updateBadge() {
    if (!filterBadge) return;
    const n = (state.categoria ? 1 : 0) + (state.tag ? 1 : 0) + (state.produtor ? 1 : 0);
    filterBadge.textContent = n;
    filterBadge.style.display = n > 0 ? "inline-flex" : "none";
  }

  // Marca visualmente o select quando tem valor
  function syncSelects() {
    [catSel, dCatSel].forEach(s => { if (s) { s.value = state.categoria; s.classList.toggle("has-value", !!state.categoria); } });
    [tagSel, dTagSel].forEach(s => { if (s) { s.value = state.tag; s.classList.toggle("has-value", !!state.tag); } });
    [prodSel, dProdSel].forEach(s => { if (s) { s.value = state.produtor; s.classList.toggle("has-value", !!state.produtor); } });
  }

  function refresh() {
    updateBadge();
    renderChips();
    syncSelects();
    fetchRecipes();
  }

  // ── Popula selects ────────────────────────────────────────────
  function fillSelect(sel, items, emptyLabel, labelFn) {
    if (!sel) return;
    // preserva só o primeiro option (vazio)
    sel.innerHTML = `<option value="">${emptyLabel}</option>`;
    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = labelFn(item);
      sel.appendChild(opt);
    });
  }

  async function loadFilters() {
    try {
      const [cats, tags, prods] = await Promise.all([
        fetch(`${API}/categories`).then(r => r.json()),
        fetch(`${API}/tags`).then(r => r.json()),
        fetch(`${API}/producers`).then(r => r.json()),
      ]);

      fillSelect(catSel,  cats  || [], "Categorias", i => i.nome);
      fillSelect(tagSel,  tags  || [], "Tags",        i => i.nome);
      fillSelect(prodSel, prods || [], "Produtor",    i => `${i.nome||""} ${i.sobrenome||""}`.trim() || "Produtor");

      fillSelect(dCatSel,  cats  || [], "Todas as categorias", i => i.nome);
      fillSelect(dTagSel,  tags  || [], "Todas as tags",       i => i.nome);
      fillSelect(dProdSel, prods || [], "Todos os produtores", i => `${i.nome||""} ${i.sobrenome||""}`.trim() || "Produtor");

    } catch (e) { console.error("Erro ao carregar filtros:", e); }
  }

  // ── Fetch receitas ────────────────────────────────────────────
  async function fetchRecipes() {
    showSkeletons(state.limit > 15 ? 9 : 6);
    if (countEl)      countEl.innerHTML = "";
    if (paginationEl) paginationEl.innerHTML = "";
    if (emptyEl)      emptyEl.style.display = "none";

    const p = new URLSearchParams({ page: state.page, limit: state.limit, status: "ativo" });
    if (state.search)    p.append("search",    state.search);
    if (state.categoria) p.append("categorias", state.categoria);
    if (state.tag)       p.append("tags",       state.tag);
    if (state.produtor)  p.append("produtor",   state.produtor);

    try {
      const res = await fetch(`${API}/recipes?${p}`);
      if (!res.ok) throw new Error(res.status);
      const result = await res.json();
      const recipes    = Array.isArray(result) ? result : (result.data || []);
      const pagination = Array.isArray(result)
        ? { currentPage: 1, totalPages: 1, totalItems: result.length }
        : (result.pagination || { currentPage: 1, totalPages: 1, totalItems: recipes.length });

      renderCards(recipes);
      renderPagination(pagination.totalPages, pagination.currentPage);
      if (countEl && pagination.totalItems > 0) {
        const s = (pagination.currentPage - 1) * state.limit + 1;
        const e = Math.min(pagination.currentPage * state.limit, pagination.totalItems);
        countEl.innerHTML = `<strong>${s}–${e}</strong> de <strong>${pagination.totalItems}</strong> receitas`;
      }
    } catch (e) {
      console.error(e);
      grid.innerHTML = '<p style="text-align:center;color:#aaa;padding:60px">Erro ao carregar. Tente novamente.</p>';
    }
  }

  // ── Limpar ────────────────────────────────────────────────────
  function clearAll() {
    state.categoria = "";
    state.tag       = "";
    state.produtor  = "";
    state.page      = 1;
    refresh();
  }

  // ── Drawer ────────────────────────────────────────────────────
  const openDrawer  = () => { drawer?.classList.add("open"); drawerOverlay?.classList.add("open"); document.body.style.overflow = "hidden"; syncSelects(); };
  const closeDrawer = () => { drawer?.classList.remove("open"); drawerOverlay?.classList.remove("open"); document.body.style.overflow = ""; };

  openBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  drawerOverlay?.addEventListener("click", closeDrawer);
  drawerClear?.addEventListener("click", () => { clearAll(); closeDrawer(); });
  drawerApply?.addEventListener("click", () => {
    state.categoria = dCatSel?.value  || "";
    state.tag       = dTagSel?.value  || "";
    state.produtor  = dProdSel?.value || "";
    state.page = 1;
    refresh();
    closeDrawer();
  });

  // ── Event listeners ───────────────────────────────────────────
  catSel?.addEventListener("change",  () => { state.categoria = catSel.value;  state.page = 1; refresh(); });
  tagSel?.addEventListener("change",  () => { state.tag       = tagSel.value;  state.page = 1; refresh(); });
  prodSel?.addEventListener("change", () => { state.produtor  = prodSel.value; state.page = 1; refresh(); });

  clearBtn?.addEventListener("click", clearAll);
  document.getElementById("clear-filters-empty")?.addEventListener("click", clearAll);

  searchInput?.addEventListener("input", () => {
    if (searchClear) searchClear.style.display = searchInput.value ? "" : "none";
    clearTimeout(searchInput._t);
    searchInput._t = setTimeout(() => { state.search = searchInput.value.trim(); state.page = 1; fetchRecipes(); }, 400);
  });
  searchClear?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (searchClear) searchClear.style.display = "none";
    state.search = ""; state.page = 1; fetchRecipes();
  });
  limitSelect?.addEventListener("change", () => { state.limit = parseInt(limitSelect.value, 10); state.page = 1; fetchRecipes(); });

  // ── Init ──────────────────────────────────────────────────────
  loadFilters();
  fetchRecipes();
})();

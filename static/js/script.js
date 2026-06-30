document.addEventListener("DOMContentLoaded", () => {
  // ======================================================
  // Helpers / Config
  // ======================================================
  const isLocalHost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  );
  const runningLiveServer =
    isLocalHost &&
    (window.location.port === "5500" || window.location.port === "5173");

  // Em dev, aponte para seu backend local; em produção, SEMPRE use o subdomínio da API:
  const API_BASE_URL =
    isLocalHost && runningLiveServer
      ? "http://localhost:8484"
      : "https://api.receitasmilionarias.com.br";

  // Stripe publishable key (troque a chave de teste quando necessário)
  const STRIPE_PUBLISHABLE_KEY = isLocalHost
    ? "pk_test_51SvPraPK4fqE2OifCOIoXB4S4VVlvYJSkrD4O3hKmRexjN0TG4eKSz6eOHdolAj1I2BL8QmZ7fhvWKgCiN7QOo2B00wvMY8j9Z"
    : "pk_live_51SvPrGADbQovebzdAIulkMrdyUzIbQYBhDiNP3IyDjj79BFtm8pd5snVrN8tRFiyrJhX0D8Y6zfz40Kk7RlwVAhs00Y8BVzsKX";

  window.RM_CONFIG = {
    API_BASE_URL,
    STRIPE_PUBLISHABLE_KEY,
  };

  const buildImageUrl = (imagem_url) => {
    if (!imagem_url) return "static/images/receitas_capa.png";
    if (/^https?:\/\//i.test(imagem_url)) return imagem_url; // absoluta
    const uploadIndex = imagem_url.indexOf("uploads");
    const path =
      uploadIndex !== -1
        ? imagem_url.substring(uploadIndex)
        : imagem_url.replace(/^\//, "");
    return `${API_BASE_URL}/${path}`;
  };

  const getCreatedAtMs = (r) => {
    const cand = r.created_at ?? r.createdAt ?? r.data_criacao ?? r.dataCriacao;
    if (!cand) return null;
    if (typeof cand === "number") return cand;
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

  const getCategoryId = (r) =>
    r?.categoria?.id ?? r?.categoria_id ?? r?.categoriaId ?? null;

  (function () {
    const STORAGE_KEY = "rm_afiliado";

    function getRefFromUrl() {
      const params = new URLSearchParams(window.location.search);
      return params.get("ref");
    }

    function saveAffiliate(code) {
      if (!code) return;
      try {
        let processedCode = code;
        if (code.startsWith("afiliado_")) {
          processedCode = code.replace("afiliado_", "");
        }
        localStorage.setItem(STORAGE_KEY, processedCode);
        console.log(`[AFILIADO] Código salvo: ${processedCode}`);
      } catch (e) {
        console.error("[AFILIADO] Erro ao salvar no localStorage:", e);
      }
    }

    function getAffiliate() {
      return localStorage.getItem(STORAGE_KEY);
    }

    document.addEventListener("DOMContentLoaded", () => {
      // Captura o 'ref' da URL e salva no localStorage
      const refFromUrl = getRefFromUrl();
      const currentRef = getAffiliate();
      if (refFromUrl && refFromUrl !== currentRef) {
        saveAffiliate(refFromUrl);
      }
      const finalRef = getAffiliate(); // Pega o código mais atual
      console.log("[AFILIADO] Código atual:", finalRef);

      // Se houver um código de afiliado, modifica os links de cadastro
      if (finalRef) {
        const signupLinks = document.querySelectorAll(
          'a[href*="/authentication/sign-up"]'
        );
        signupLinks.forEach((a) => {
          try {
            // Garante que a URL base não tenha o código duplicado
            const baseUrl =
              a.href.split("/authentication/sign-up")[0] +
              "/authentication/sign-up";
            if (!a.href.endsWith(finalRef)) {
              // Evita adicionar várias vezes
              const finalUrl = `${baseUrl}/${finalRef}`;
              a.href = finalUrl;
              console.log(
                `[AFILIADO] Link de cadastro modificado para: ${finalUrl}`
              );
            }
          } catch (err) {
            console.error(
              "[AFILIADO] Erro ao modificar link de cadastro:",
              err
            );
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
  const preloader = document.getElementById("preloader");
  if (preloader) {
    window.addEventListener("load", () => {
      setTimeout(() => preloader.classList.add("hidden"), 200);
    });
  }

  // ======================================================
  // Navbar scroll effect
  // ======================================================
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const handleNavScroll = () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();
  }

  // ======================================================
  // Menu Fullscreen - Melhorado (suporta múltiplas estruturas)
  // ======================================================
  const openMenuBtn = document.getElementById("open-menu") || document.querySelector(".hamburger");
  const closeMenuBtn = document.getElementById("close-menu") || document.querySelector(".close-menu");
  const menuOverlay = document.getElementById("menu-overlay") || document.querySelector(".menu-overlay");
  const mobileMenu = document.querySelector(".mobile-menu");
  const body = document.body;

  // Função para ajustar altura do viewport dinamicamente (mobile)
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Definir altura inicial e atualizar quando redimensionar
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', setViewportHeight);

  if (openMenuBtn && closeMenuBtn && (menuOverlay || mobileMenu)) {
    // Abrir menu
    openMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (menuOverlay) menuOverlay.classList.add("active");
      if (mobileMenu) mobileMenu.classList.add("active");
      body.classList.add("menu-active");
      
      // Atualizar altura do viewport ao abrir menu
      setViewportHeight();
      
      // Foco no botão de fechar para acessibilidade
      setTimeout(() => {
        closeMenuBtn.focus();
      }, 400);
    });

    // Fechar menu
    const closeMenu = () => {
      if (menuOverlay) menuOverlay.classList.remove("active");
      if (mobileMenu) mobileMenu.classList.remove("active");
      body.classList.remove("menu-active");
      
      // Retornar foco ao botão de abrir
      setTimeout(() => {
        openMenuBtn.focus();
      }, 400);
    };

    closeMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeMenu();
    });

    // Fechar ao clicar no overlay (fora do painel)
    if (menuOverlay) {
      menuOverlay.addEventListener("click", (e) => {
        if (e.target === menuOverlay) {
          closeMenu();
        }
      });
    }

    // Fechar com tecla ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && (menuOverlay?.classList.contains("active") || mobileMenu?.classList.contains("active"))) {
        closeMenu();
      }
    });

    // Fechar menu ao clicar em links internos
    const menuContainer = menuOverlay || mobileMenu;
    if (menuContainer) {
      const menuLinks = menuContainer.querySelectorAll("a");
      menuLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
          const href = link.getAttribute("href") || "";
          // Só fecha se for link interno (#) ou link para index.html com âncora
          if (href.startsWith("#") || href.includes("index.html#")) {
            closeMenu();
          }
        });
      });
    }

    // Prevenir scroll na página quando menu está aberto
    let scrollPosition = 0;
    const menuElement = menuOverlay || mobileMenu;
    if (menuElement) {
      menuElement.addEventListener('transitionstart', (e) => {
        if (menuElement.classList.contains('active')) {
          scrollPosition = window.pageYOffset;
          body.style.top = `-${scrollPosition}px`;
        }
      });

      menuElement.addEventListener('transitionend', (e) => {
        if (!menuElement.classList.contains('active')) {
          body.style.top = '';
          window.scrollTo(0, scrollPosition);
        }
      });
    }
  }

  // ======================================================
  // Calculadora (se existir)
  // ======================================================
  const referralsSlider = document.getElementById("referrals-slider");
  const referralsInput = document.getElementById("referrals-input");

  if (referralsSlider && referralsInput) {
    const monthlyEarningsEl = document.getElementById("monthly-earnings");
    const annualEarningsEl = document.getElementById("annual-earnings");
    const pricePerReferral = 9.9;

    const formatCurrency = (value) =>
      `R$ ${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const updateCalculator = (value) => {
      const count = parseInt(value, 10);
      if (isNaN(count) || count < 0) return;
      const monthly = count * pricePerReferral;
      const annual = monthly * 12;
      if (monthlyEarningsEl)
        monthlyEarningsEl.textContent = formatCurrency(monthly);
      if (annualEarningsEl)
        annualEarningsEl.textContent = formatCurrency(annual);
    };

    referralsInput.addEventListener("input", (e) => {
      const value = e.target.value;
      referralsSlider.value = Math.min(value, referralsSlider.max);
      updateCalculator(value);
    });

    referralsSlider.addEventListener("input", (e) => {
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
    const target = +counter.getAttribute("data-target");
    const duration = 2000;
    const isDecimal = target.toString().includes(".");
    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutProgress = progress * (2 - progress);
      const currentValue = easeOutProgress * target;

      counter.innerText = isDecimal
        ? currentValue.toFixed(2).replace(".", ",")
        : Math.floor(currentValue).toLocaleString("pt-BR");

      if (progress < 1) window.requestAnimationFrame(step);
      else
        counter.innerText = isDecimal
          ? target.toFixed(2).replace(".", ",")
          : Math.floor(target).toLocaleString("pt-BR");
    };
    window.requestAnimationFrame(step);
  };

  const allElementsToObserve = document.querySelectorAll(
    ".fade-in-section, .counter"
  );
  if (allElementsToObserve.length) {
    const intersectionObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target.classList.contains("fade-in-section"))
            entry.target.classList.add("visible");
          if (
            entry.target.classList.contains("counter") &&
            entry.target.innerText === "0"
          )
            animateCounter(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.1 }
    );
    allElementsToObserve.forEach((el) => intersectionObserver.observe(el));
  }

  // ======================================================
  // FAQ (se existir)
  // ======================================================
  const faqItems = document.querySelectorAll(".faq-item");
  if (faqItems.length) {
    faqItems.forEach((item) => {
      const question = item.querySelector(".faq-question");
      if (!question) return;
      question.addEventListener("click", () => {
        const active = document.querySelector(".faq-item.active");
        if (active && active !== item) active.classList.remove("active");
        item.classList.toggle("active");
      });
    });
  }

  // ======================================================
  // LISTA & FILTROS (somente em receitas.html)
  // ======================================================
  (() => {
    const searchInput = document.getElementById("search-input");
    const categoryFilter = document.getElementById("category-filter");
    const tagFilter = document.getElementById("tag-filter");
    const producerFilter = document.getElementById("producer-filter");
    const paginationControls = document.getElementById("pagination-controls");
    const resultsCountContainer = document.getElementById("results-count");
    const limitSelect = document.getElementById("limit-select");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");

    const isListPage = !!(searchInput || categoryFilter || tagFilter || limitSelect);
    if (!isListPage) return;

    const receitasContainer =
      document.getElementById("receitas-grid") ||
      document.getElementById("recipes-grid") ||
      document.querySelector(".recipe-grid");
    if (!receitasContainer) return;

    let state = { page: 1, limit: 15, search: "", categorias: [], tags: [], produtor: "" };

    const emptyState = document.getElementById("receitas-empty");
    const clearFiltersEmpty = document.getElementById("clear-filters-empty");
    const activeChipsContainer = document.getElementById("active-filters-chips");
    const searchClearBtn = document.getElementById("search-clear-btn");

    const renderSkeletons = (count = 6) => {
      receitasContainer.innerHTML = Array.from({ length: count }).map(() => `
        <div class="recipe-card skeleton">
          <div class="skeleton-block skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton-block skeleton-title"></div>
            <div class="skeleton-block skeleton-title2"></div>
            <div class="skeleton-block skeleton-line"></div>
            <div class="skeleton-block skeleton-line short"></div>
          </div>
        </div>`).join("");
    };

    const fetchRecipes = async () => {
      renderSkeletons(state.limit > 15 ? 9 : 6);
      if (resultsCountContainer) resultsCountContainer.innerHTML = "";
      if (paginationControls) paginationControls.innerHTML = "";
      if (emptyState) emptyState.style.display = "none";

      const params = new URLSearchParams({
        page: state.page,
        limit: state.limit,
      });
      // listar apenas receitas ativas no site público
      params.append("status", "ativo");
      if (state.search) params.append("search", state.search);
      if (state.categorias.length > 0)
        params.append("categorias", state.categorias.join(","));
      if (state.tags.length > 0) params.append("tags", state.tags.join(","));
      if (state.produtor) params.append("produtor", state.produtor);

      try {
        const response = await fetch(
          `${API_BASE_URL}/recipes?${params.toString()}`
        );
        if (!response.ok)
          throw new Error(
            `Erro na rede: ${response.status} ${response.statusText}`
          );

        const result = await response.json();

        let recipes, pagination;
        if (Array.isArray(result)) {
          recipes = result;
          pagination = {
            currentPage: 1,
            totalPages: 1,
            totalItems: recipes.length,
          };
        } else if (result.data && result.pagination) {
          recipes = result.data;
          pagination = result.pagination;
        } else {
          throw new Error("Formato de resposta da API inesperado.");
        }

        renderRecipes(recipes);
        renderPagination(pagination);
        updateResultsCount(pagination);
      } catch (error) {
        console.error("Falha ao buscar receitas:", error);
        receitasContainer.innerHTML =
          '<p class="error-message">Não foi possível carregar as receitas.</p>';
      }
    };

    // Atualiza visibilidade do botão X no search
    const updateSearchClear = () => {
      if (searchClearBtn) {
        searchClearBtn.classList.toggle("visible", !!(searchInput && searchInput.value.trim()));
      }
    };
    if (searchClearBtn && searchInput) {
      searchClearBtn.addEventListener("click", () => {
        searchInput.value = "";
        state.search = "";
        state.page = 1;
        updateSearchClear();
        fetchRecipes();
      });
      searchInput.addEventListener("input", updateSearchClear);
    }

    // Botão limpar filtros no estado vazio
    if (clearFiltersEmpty) {
      clearFiltersEmpty.addEventListener("click", () => {
        if (clearFiltersBtn) clearFiltersBtn.click();
      });
    }

    const renderActiveChips = () => {
      if (!activeChipsContainer) return;
      activeChipsContainer.innerHTML = "";
      if (state.search) {
        const chip = document.createElement("span");
        chip.className = "filter-chip";
        chip.innerHTML = `<i class="fas fa-search"></i> "${state.search}" <i class="fas fa-times chip-remove"></i>`;
        chip.addEventListener("click", () => {
          if (searchInput) searchInput.value = "";
          state.search = "";
          state.page = 1;
          updateSearchClear();
          renderActiveChips();
          fetchRecipes();
        });
        activeChipsContainer.appendChild(chip);
      }
    };

    const renderRecipes = (recipes) => {
      receitasContainer.innerHTML = "";
      const visibleRecipes = (recipes || []).filter(
        (r) => r.status === "ativo"
      );
      renderActiveChips();

      if (!visibleRecipes || visibleRecipes.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }
      if (emptyState) emptyState.style.display = "none";

      visibleRecipes.forEach((recipe) => {
        const categoryName = recipe.categoria ? recipe.categoria.nome : "Destaque";
        const imageUrl = buildImageUrl(recipe.imagem_url);
        const prep = recipe.tempo_preparo_min || "?";
        const dif = recipe.dificuldade || "?";
        const rating = recipe.resultados_avaliacao;
        const avgRating = rating && rating.media_avaliacoes > 0
          ? parseFloat(rating.media_avaliacoes).toFixed(1)
          : null;

        const ratingCount = rating ? (rating.quantidade_comentarios ?? rating.quantidade_avaliacoes ?? 0) : 0;
        const stars = avgRating
          ? `<div class="card-rating">
              <i class="fas fa-star star-filled"></i>
              <strong>${avgRating}</strong>
              <span>(${ratingCount})</span>
            </div>`
          : `<div class="card-rating">
              <i class="fas fa-star star-filled"></i>
              <strong>Novo</strong>
            </div>`;

        const card = document.createElement("a");
        card.href = `receita.html?id=${recipe.id}`;
        card.className = "recipe-card";
        card.setAttribute("aria-label", `Ver receita: ${recipe.titulo}`);
        card.innerHTML = `
          <div class="card-img-wrap">
            <img src="${imageUrl}" alt="${recipe.titulo}" loading="lazy">
            <span class="card-category-badge">${categoryName}</span>
            <div class="card-img-infos">
              <span class="card-info-pill"><i class="fas fa-clock"></i> ${prep} min</span>
              <span class="card-info-pill"><i class="fas fa-signal"></i> ${dif}</span>
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title">${recipe.titulo}</h3>
            <p class="card-desc">${recipe.resumo || ""}</p>
            <div class="card-footer">
              ${stars}
              <span class="card-cta-link">Ver Receita <i class="fas fa-arrow-right"></i></span>
            </div>
          </div>`;
        receitasContainer.appendChild(card);
      });
    };

    const renderPagination = (pagination) => {
      if (!paginationControls) return;
      const { currentPage, totalPages } = pagination;
      paginationControls.innerHTML = "";
      if (totalPages <= 1) return;

      const makeBtn = (label, page, disabled, active) => {
        const btn = document.createElement("button");
        btn.innerHTML = label;
        btn.className = "page-btn" + (active ? " active" : "");
        btn.disabled = disabled;
        if (!disabled && !active) {
          btn.addEventListener("click", () => {
            state.page = page;
            fetchRecipes();
            window.scrollTo({ top: receitasContainer.offsetTop - 120, behavior: "smooth" });
          });
        }
        return btn;
      };

      paginationControls.appendChild(
        makeBtn('<i class="fas fa-chevron-left"></i>', currentPage - 1, currentPage === 1, false)
      );

      for (let i = 1; i <= totalPages; i++) {
        if (
          i === currentPage ||
          i === 1 ||
          i === totalPages ||
          (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
          paginationControls.appendChild(makeBtn(i, i, false, i === currentPage));
        } else if (paginationControls.lastElementChild?.textContent !== "…") {
          const sep = document.createElement("span");
          sep.className = "page-ellipsis";
          sep.textContent = "…";
          paginationControls.appendChild(sep);
        }
      }

      paginationControls.appendChild(
        makeBtn('<i class="fas fa-chevron-right"></i>', currentPage + 1, currentPage === totalPages, false)
      );
    };

    const updateResultsCount = (pagination) => {
      if (!resultsCountContainer) return;
      const { totalItems, currentPage, totalPages } = pagination;
      if (totalItems > 0) {
        const start = (currentPage - 1) * state.limit + 1;
        const end = Math.min(currentPage * state.limit, totalItems);
        resultsCountContainer.innerHTML = `<strong>${start}–${end}</strong> de <strong>${totalItems}</strong> receitas`;
      } else {
        resultsCountContainer.innerHTML = "";
      }
    };

    // ── Dropdown helpers ──────────────────────────────────────
    // Fecha todos os dropdowns abertos
    const closeAllDropdowns = () => {
      document.querySelectorAll(".dropdown-filter.open").forEach((f) => {
        f.classList.remove("open");
      });
    };

    // Abre/fecha um dropdown ao clicar no botão
    const bindDropdownToggle = (filterEl) => {
      if (!filterEl) return;
      const btn = filterEl.querySelector(".filter-btn");
      if (!btn) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasOpen = filterEl.classList.contains("open");
        closeAllDropdowns();
        if (!wasOpen) filterEl.classList.add("open");
      });
    };

    // Fecha ao clicar fora
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown-filter")) closeAllDropdowns();
    });

    // Popula dropdown multi-select (categorias / tags)
    const populateMultiDropdown = async (filterEl, endpoint, stateKey, label) => {
      if (!filterEl) return;
      const content = filterEl.querySelector(".dropdown-content");
      const btnSpan = filterEl.querySelector(".filter-btn span");
      if (!content || !btnSpan) return;

      content.innerHTML = '<span style="padding:14px 16px;display:block;color:#aaa;font-size:.85rem;">Carregando...</span>';

      try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!res.ok) throw new Error(res.status);
        const items = await res.json();

        content.innerHTML = "";

        if (!items || items.length === 0) {
          content.innerHTML = '<span style="padding:14px 16px;display:block;color:#aaa;font-size:.85rem;">Nenhuma opção</span>';
          return;
        }

        // botão "Todos"
        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = "selected";
        allBtn.dataset.value = "";
        allBtn.textContent = `Todos`;
        content.appendChild(allBtn);

        items.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.value = String(item.id);
          btn.textContent = item.nome;
          content.appendChild(btn);
        });

        // clique nos itens
        content.addEventListener("click", (e) => {
          e.stopPropagation();
          const clicked = e.target.closest("button");
          if (!clicked) return;

          const val = clicked.dataset.value;
          const allBtns = content.querySelectorAll("button");

          if (val === "") {
            allBtns.forEach(b => b.classList.remove("selected"));
            clicked.classList.add("selected");
            state[stateKey] = [];
          } else {
            content.querySelector('button[data-value=""]').classList.remove("selected");
            clicked.classList.toggle("selected");
            const sel = Array.from(allBtns)
              .filter(b => b.classList.contains("selected") && b.dataset.value !== "")
              .map(b => b.dataset.value);
            state[stateKey] = sel;
            if (sel.length === 0) content.querySelector('button[data-value=""]').classList.add("selected");
          }

          const count = state[stateKey].length;
          btnSpan.textContent = count > 0 ? `${label} (${count})` : label;
          state.page = 1;
          fetchRecipes();
        });

      } catch (err) {
        console.error(`Erro ao carregar ${endpoint}:`, err);
        content.innerHTML = '<span style="padding:14px 16px;display:block;color:#e44;font-size:.85rem;">Erro ao carregar</span>';
      }
    };

    // Popula dropdown single-select (produtor)
    const populateProducerDropdown = async (filterEl) => {
      if (!filterEl) return;
      const content = filterEl.querySelector(".dropdown-content");
      const btnSpan = filterEl.querySelector(".filter-btn span");
      if (!content || !btnSpan) return;

      content.innerHTML = '<span style="padding:14px 16px;display:block;color:#aaa;font-size:.85rem;">Carregando...</span>';

      try {
        const res = await fetch(`${API_BASE_URL}/producers`);
        if (!res.ok) throw new Error(res.status);
        const items = await res.json();

        content.innerHTML = "";

        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = "selected";
        allBtn.dataset.value = "";
        allBtn.textContent = "Todos os produtores";
        content.appendChild(allBtn);

        (items || []).forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.value = String(item.id);
          btn.textContent = `${item.nome || ""} ${item.sobrenome || ""}`.trim() || "Produtor";
          content.appendChild(btn);
        });

        content.addEventListener("click", (e) => {
          e.stopPropagation();
          const clicked = e.target.closest("button");
          if (!clicked) return;
          content.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
          clicked.classList.add("selected");
          state.produtor = clicked.dataset.value;
          btnSpan.textContent = clicked.dataset.value ? clicked.textContent : "Produtor";
          state.page = 1;
          closeAllDropdowns();
          fetchRecipes();
        });

      } catch (err) {
        console.error("Erro ao carregar produtores:", err);
        content.innerHTML = '<span style="padding:14px 16px;display:block;color:#e44;font-size:.85rem;">Erro ao carregar</span>';
      }
    };

    // ── Event listeners gerais ─────────────────────────────────
    [categoryFilter, tagFilter, producerFilter].forEach(bindDropdownToggle);

    if (searchInput) {
      let debounce;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          state.search = e.target.value.trim();
          state.page = 1;
          updateSearchClear();
          fetchRecipes();
        }, 400);
      });
    }

    if (limitSelect) {
      limitSelect.addEventListener("change", (e) => {
        state.limit = parseInt(e.target.value, 10);
        state.page = 1;
        fetchRecipes();
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        state = { page: 1, limit: state.limit, search: "", categorias: [], tags: [], produtor: "" };
        if (searchInput) searchInput.value = "";
        updateSearchClear();
        // reset visual dos dropdowns
        document.querySelectorAll(".dropdown-filter").forEach((el) => {
          el.classList.remove("open");
          const sp = el.querySelector(".filter-btn span");
          if (sp) sp.textContent = sp.getAttribute("data-original") || sp.textContent;
          el.querySelectorAll(".dropdown-content button").forEach(b => b.classList.remove("selected"));
          const allB = el.querySelector('.dropdown-content button[data-value=""]');
          if (allB) allB.classList.add("selected");
        });
        if (activeChipsContainer) activeChipsContainer.innerHTML = "";
        fetchRecipes();
      });
    }

    // salva label original dos botões para reset
    [categoryFilter, tagFilter, producerFilter].forEach((el) => {
      if (!el) return;
      const sp = el.querySelector(".filter-btn span");
      if (sp) sp.setAttribute("data-original", sp.textContent);
    });

    // ── Modal de filtros (mobile) ──────────────────────────────
    const filterModalOverlay = document.getElementById("filter-modal-overlay");
    const openFilterModalBtn  = document.getElementById("open-filter-modal");
    const closeFilterModalBtn = document.getElementById("close-filter-modal");
    const filterCountBadge    = document.getElementById("filter-count-badge");
    const modalClearBtn       = document.getElementById("modal-clear-btn");
    const modalApplyBtn       = document.getElementById("modal-apply-btn");

    // estado temporário do modal (confirmado só em "Aplicar")
    let modalState = { categorias: [], tags: [], produtor: "" };

    const openFilterModal = () => {
      if (!filterModalOverlay) return;
      // sincroniza estado atual → modal
      modalState = { categorias: [...state.categorias], tags: [...state.tags], produtor: state.produtor };
      syncModalChips();
      filterModalOverlay.classList.add("open");
      document.body.style.overflow = "hidden";
    };

    const closeFilterModal = () => {
      if (!filterModalOverlay) return;
      filterModalOverlay.classList.remove("open");
      document.body.style.overflow = "";
    };

    const updateFilterBadge = () => {
      if (!filterCountBadge) return;
      const total = state.categorias.length + state.tags.length + (state.produtor ? 1 : 0);
      filterCountBadge.textContent = total;
      filterCountBadge.style.display = total > 0 ? "inline-flex" : "none";
    };

    // sincroniza chips do modal com modalState
    const syncModalChips = () => {
      document.querySelectorAll("#filter-modal-overlay .filter-modal-chips button[data-value]").forEach((btn) => {
        const list = btn.closest("[id^='modal-']");
        if (!list) return;
        const isCategory = list.id === "modal-category-list";
        const isTag      = list.id === "modal-tag-list";
        const isProd     = list.id === "modal-producer-list";
        const val = btn.dataset.value;
        if (val === "") {
          // "Todos"
          if (isCategory) btn.classList.toggle("selected", modalState.categorias.length === 0);
          if (isTag)      btn.classList.toggle("selected", modalState.tags.length === 0);
          if (isProd)     btn.classList.toggle("selected", modalState.produtor === "");
        } else {
          if (isCategory) btn.classList.toggle("selected", modalState.categorias.includes(val));
          if (isTag)      btn.classList.toggle("selected", modalState.tags.includes(val));
          if (isProd)     btn.classList.toggle("selected", modalState.produtor === val);
        }
      });
    };

    // popula lista de chips no modal (multi)
    const populateModalMulti = async (listElId, endpoint, modalKey) => {
      const listEl = document.getElementById(listElId);
      if (!listEl) return;
      listEl.innerHTML = '<span class="fmc-loading">Carregando...</span>';
      try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!res.ok) throw new Error(res.status);
        const items = await res.json();
        listEl.innerHTML = "";
        // "Todos"
        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.dataset.value = "";
        allBtn.textContent = "Todos";
        allBtn.classList.add("selected");
        listEl.appendChild(allBtn);
        (items || []).forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.value = String(item.id);
          btn.textContent = item.nome;
          listEl.appendChild(btn);
        });
        listEl.addEventListener("click", (e) => {
          const clicked = e.target.closest("button[data-value]");
          if (!clicked) return;
          const val = clicked.dataset.value;
          const btns = listEl.querySelectorAll("button[data-value]");
          if (val === "") {
            btns.forEach(b => b.classList.remove("selected"));
            clicked.classList.add("selected");
            modalState[modalKey] = [];
          } else {
            listEl.querySelector('button[data-value=""]').classList.remove("selected");
            clicked.classList.toggle("selected");
            const sel = Array.from(btns)
              .filter(b => b.classList.contains("selected") && b.dataset.value !== "")
              .map(b => b.dataset.value);
            modalState[modalKey] = sel;
            if (sel.length === 0) listEl.querySelector('button[data-value=""]').classList.add("selected");
          }
        });
      } catch (e) {
        listEl.innerHTML = '<span class="fmc-loading" style="color:#e44">Erro ao carregar</span>';
      }
    };

    const populateModalProducers = async () => {
      const listEl = document.getElementById("modal-producer-list");
      if (!listEl) return;
      listEl.innerHTML = '<span class="fmc-loading">Carregando...</span>';
      try {
        const res = await fetch(`${API_BASE_URL}/producers`);
        if (!res.ok) throw new Error(res.status);
        const items = await res.json();
        listEl.innerHTML = "";
        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.dataset.value = "";
        allBtn.textContent = "Todos";
        allBtn.classList.add("selected");
        listEl.appendChild(allBtn);
        (items || []).forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.value = String(item.id);
          btn.textContent = `${item.nome || ""} ${item.sobrenome || ""}`.trim() || "Produtor";
          listEl.appendChild(btn);
        });
        listEl.addEventListener("click", (e) => {
          const clicked = e.target.closest("button[data-value]");
          if (!clicked) return;
          listEl.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
          clicked.classList.add("selected");
          modalState.produtor = clicked.dataset.value;
        });
      } catch (e) {
        listEl.innerHTML = '<span class="fmc-loading" style="color:#e44">Erro ao carregar</span>';
      }
    };

    // accordion das seções do modal
    document.querySelectorAll(".filter-modal-section-header").forEach((header) => {
      const targetId = header.getAttribute("data-target");
      const body = document.getElementById(targetId);
      if (!body) return;
      header.addEventListener("click", () => {
        const isCollapsed = header.classList.contains("collapsed");
        header.classList.toggle("collapsed", !isCollapsed);
        body.classList.toggle("collapsed", !isCollapsed);
      });
    });

    if (openFilterModalBtn) openFilterModalBtn.addEventListener("click", openFilterModal);
    if (closeFilterModalBtn) closeFilterModalBtn.addEventListener("click", closeFilterModal);
    if (filterModalOverlay) {
      filterModalOverlay.addEventListener("click", (e) => {
        if (e.target === filterModalOverlay) closeFilterModal();
      });
    }
    if (modalClearBtn) {
      modalClearBtn.addEventListener("click", () => {
        modalState = { categorias: [], tags: [], produtor: "" };
        syncModalChips();
      });
    }
    if (modalApplyBtn) {
      modalApplyBtn.addEventListener("click", () => {
        state.categorias = [...modalState.categorias];
        state.tags       = [...modalState.tags];
        state.produtor   = modalState.produtor;
        state.page = 1;
        updateFilterBadge();
        closeFilterModal();
        fetchRecipes();
      });
    }

    const initListPage = () => {
      // Desktop dropdowns
      populateMultiDropdown(categoryFilter, "categories", "categorias", "Categorias");
      populateMultiDropdown(tagFilter, "tags", "tags", "Tags");
      populateProducerDropdown(producerFilter);
      // Modal (mobile)
      populateModalMulti("modal-category-list", "categories", "categorias");
      populateModalMulti("modal-tag-list", "tags", "tags");
      populateModalProducers();
      fetchRecipes();
    };

    initListPage();
  })();

  // ======================================================
  // RECOMENDADOS — 3 da mesma categoria (com fallback)
  // ======================================================
  const renderRecommended = (recipes, container) => {
    if (!container) return;
    container.innerHTML = "";

    if (!recipes || recipes.length === 0) {
      const section = container.closest(".recommended-recipes");
      if (section) section.classList.add("is-empty");
      return;
    }

    recipes.forEach((r) => {
      const categoryName = r.categoria ? r.categoria.nome : "Destaque";
      const imageUrl = buildImageUrl(r.imagem_url);
      const prep = r.tempo_preparo_min ?? "?";
      const dif = r.dificuldade ?? "?";

      const card = document.createElement("a");
      card.href = `receita.html?id=${r.id}`;
      card.className = "recipe-link";
      card.innerHTML = `
        <article class="recipe-card">
          <div class="recipe-card-img-container">
            <img src="${imageUrl}" alt="${r.titulo}" loading="lazy">
            <span class="recipe-category-tag">${categoryName}</span>
          </div>
          <div class="recipe-card-content">
            <h3>${r.titulo}</h3>
            <p>${r.resumo || ""}</p>
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
    const grid = document.querySelector(".recommended-recipes .recipe-grid");
    if (!grid) return;

    grid.innerHTML = '<div class="grid-loader"></div>';

    try {
      const thisId = String(recipe.id);
      const catId = getCategoryId(recipe);
      let list = [];

      // 1) pela mesma categoria (pede bastante, filtra e depois corta 3)
      if (catId) {
        const res = await fetch(
          `${API_BASE_URL}/recipes?categorias=${catId}&page=1&limit=20&status=ativo`
        );
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json();
        list = Array.isArray(data) ? data : data.data || [];
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
        const res2 = await fetch(
          `${API_BASE_URL}/recipes?page=1&limit=20&status=ativo`
        );
        if (res2.ok) {
          const data2 = await res2.json();
          const pool = Array.isArray(data2) ? data2 : data2.data || [];
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
      console.error("Falha ao carregar recomendados:", e);
      grid.innerHTML =
        '<p class="error-message">Não foi possível carregar recomendações no momento.</p>';
    }
  };

  // ======================================================
  // Carrossel (galeria)
  // ======================================================
  function buildRecipeImageList(recipe, buildImageUrl) {
    const extra =
      recipe.imagens || recipe.galeria_imagens || recipe.galeria || [];
    const extras = extra
      .map((x) => x?.url || x?.imagem_url || x)
      .filter(Boolean);
    const all = [recipe.imagem_url, ...extras].map(buildImageUrl);
    return [...new Set(all.filter(Boolean))];
  }

  function mountCarousel(images) {
    const carousel = document.getElementById("recipe-carousel");
    const track = document.getElementById("carousel-track");
    const dots = document.getElementById("carousel-dots");
    const prev = document.getElementById("carousel-prev");
    const next = document.getElementById("carousel-next");
    if (!carousel || !track || !prev || !next || !dots) return;

    if (!images || images.length === 0) {
      carousel.style.display = "none";
      return;
    }

    track.innerHTML = "";
    dots.innerHTML = "";
    images.forEach((src, idx) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide";
      slide.innerHTML = `<img src="${src}" alt="Foto ${
        idx + 1
      } da receita" loading="lazy">`;
      track.appendChild(slide);

      const dot = document.createElement("button");
      dot.className = "carousel-dot" + (idx === 0 ? " active" : "");
      dot.setAttribute("aria-label", `Ir para a imagem ${idx + 1}`);
      dots.appendChild(dot);
    });

    let index = 0;
    const total = images.length;

    const goTo = (i) => {
      index = (i + total) % total;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots
        .querySelectorAll(".carousel-dot")
        .forEach((d, di) => d.classList.toggle("active", di === index));
    };

    prev.onclick = () => goTo(index - 1);
    next.onclick = () => goTo(index + 1);
    dots
      .querySelectorAll(".carousel-dot")
      .forEach((d, di) => (d.onclick = () => goTo(di)));

    // swipe
    let startX = 0,
      dx = 0;
    track.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
      },
      { passive: true }
    );
    track.addEventListener(
      "touchmove",
      (e) => {
        dx = e.touches[0].clientX - startX;
      },
      { passive: true }
    );
    track.addEventListener("touchend", () => {
      if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
      dx = 0;
    });

    // teclas
    carousel.tabIndex = 0;
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") prev.click();
      if (e.key === "ArrowRight") next.click();
    });

    // se tiver só 1 imagem, esconde controles
    if (images.length <= 1) {
      dots.style.display = "none";
      prev.style.display = "none";
      next.style.display = "none";
    }
  }

  // ======================================================
  // Página de RECEITA
  // ======================================================
  async function fetchSingleRecipe() {
    const recipeTitleEl = document.getElementById("recipe-title");
    if (!recipeTitleEl) return; // não é a página de receita

    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");
    if (!recipeId) {
      recipeTitleEl.textContent = "Receita não encontrada";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`);
      if (!response.ok) throw new Error("Receita não encontrada");
      const recipe = await response.json();

      // Não renderiza receitas que não estão ativas (public site)
      if (recipe.status && recipe.status !== "ativo") {
        const titleEl = document.getElementById("recipe-title");
        const summaryEl = document.getElementById("recipe-summary");
        if (titleEl)
          titleEl.textContent = "Receita não encontrada / indisponível";
        if (summaryEl)
          summaryEl.textContent = "A receita solicitada não está disponível.";
        return;
      }

      document.title = `Receita: ${recipe.titulo} - Receitas Milionárias`;

      const heroEl = document.getElementById("recipe-hero");
      const imageUrl = buildImageUrl(recipe.imagem_url);
      if (heroEl)
        heroEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${imageUrl}')`;

      recipeTitleEl.textContent = recipe.titulo;

      const summaryEl = document.getElementById("recipe-summary");
      if (summaryEl) summaryEl.textContent = recipe.resumo ?? "";

      const prepEl = document.getElementById("recipe-prep-time");
      const difEl = document.getElementById("recipe-difficulty");
      const calEl = document.getElementById("recipe-calories");
      const creatorEl = document.getElementById("recipe-creator");

      if (prepEl)
        prepEl.innerHTML = `<i class="fas fa-clock"></i><span><strong>Preparo:</strong> ${
          recipe.tempo_preparo_min ?? "--"
        } min</span>`;
      if (difEl)
        difEl.innerHTML = `<i class="fas fa-utensils"></i><span><strong>Dificuldade:</strong> ${
          recipe.dificuldade ?? "--"
        }</span>`;
      if (calEl)
        calEl.innerHTML = `<i class="fas fa-fire-alt"></i><span><strong>Calorias:</strong> ${
          recipe.calorias_kcal ?? "--"
        } kcal</span>`;
      if (creatorEl)
        creatorEl.innerHTML = `<i class="fas fa-user"></i><span><strong>Criador:</strong> ${
          recipe.criador?.nome ?? "--"
        }</span>`;

      // Ingredientes
      const ingredientsContainer = document.getElementById(
        "recipe-ingredients-list"
      );
      if (ingredientsContainer) {
        let html = '<h2><i class="fas fa-carrot"></i> Ingredientes</h2>';
        if (recipe.grupos_ingredientes?.length) {
          recipe.grupos_ingredientes.forEach((group) => {
            html += `<h3>${group.titulo}</h3><ul>`;
            group.ingredientes.forEach((ing) => {
              html += `<li>${ing.descricao} ${
                ing.observacao ? `<em>(${ing.observacao})</em>` : ""
              }</li>`;
            });
            html += "</ul>";
          });
        } else {
          html += "<p>Ingredientes não especificados.</p>";
        }
        ingredientsContainer.innerHTML = html;
      }

      // Carrossel
      const imageList = buildRecipeImageList(recipe, buildImageUrl);
      mountCarousel(imageList);

      // Modo de preparo
      const instructionsContainer = document.getElementById(
        "recipe-instructions-list"
      );
      if (instructionsContainer) {
        let html = '<h2><i class="fas fa-book-open"></i> Modo de Preparo</h2>';
        if (recipe.passos_preparo?.length) {
          html += "<ol>";
          recipe.passos_preparo.forEach((step) => {
            html += `<li>${step.descricao} ${
              step.observacao ? `<em>(${step.observacao})</em>` : ""
            }</li>`;
          });
          html += "</ol>";
        } else {
          html += "<p>Modo de preparo não especificado.</p>";
        }
        instructionsContainer.innerHTML = html;
      }

      // Recomendadas (3 da mesma categoria)
      loadRecommendedByCategory(recipe);
    } catch (error) {
      console.error("Falha ao buscar a receita:", error);
      const title = document.getElementById("recipe-title");
      const summary = document.getElementById("recipe-summary");
      if (title) title.textContent = "Erro ao carregar a receita";
      if (summary)
        summary.textContent =
          "Não foi possível encontrar a receita solicitada. Por favor, tente novamente.";
    }
  }
  fetchSingleRecipe();

  // ======================================================
  // DESTAQUES (somente no index)
  // ======================================================
  (function setupFeaturedRecipes() {
    const featuredGrid = document.getElementById("featured-grid");
    if (!featuredGrid) return;

    const renderFeatured = (recipes) => {
      if (!recipes || recipes.length === 0) {
        featuredGrid.innerHTML =
          '<p class="error-message">Sem receitas em destaque no momento.</p>';
        return;
      }
      // Filtra receitas inativas por segurança
      const visible = (recipes || []).filter((r) => r.status === "ativo");
      if (visible.length === 0) {
        featuredGrid.innerHTML =
          '<p class="error-message">Sem receitas em destaque no momento.</p>';
        return;
      }
      featuredGrid.innerHTML = "";
      visible.forEach((r) => {
        const categoryName = r.categoria ? r.categoria.nome : "Destaque";
        const imageUrl = buildImageUrl(r.imagem_url);
        const prep = r.tempo_preparo_min ?? "?";
        const dif = r.dificuldade ?? "?";
        const card = document.createElement("a");
        card.href = `receita.html?id=${r.id}`;
        card.className = "recipe-link";
        card.innerHTML = `
          <article class="recipe-card">
            <div class="recipe-card-img-container">
              <img src="${imageUrl}" alt="${r.titulo}" loading="lazy">
              <span class="recipe-category-tag">${categoryName}</span>
            </div>
            <div class="recipe-card-content">
              <h3>${r.titulo}</h3>
              <p>${r.resumo || ""}</p>
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
        const res = await fetch(
          `${API_BASE_URL}/recipes?page=1&limit=12&status=ativo`
        );
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        const newest = sortNewestFirst(list).slice(0, 3);
        renderFeatured(newest);
      } catch (e) {
        console.error("Falha ao carregar destaques:", e);
        featuredGrid.innerHTML =
          '<p class="error-message">Não foi possível carregar as receitas em destaque.</p>';
      }
    };

    loadFeatured();
  })();
});


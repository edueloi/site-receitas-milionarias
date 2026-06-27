// static/js/receita.js

document.addEventListener("DOMContentLoaded", () => {
  // ======================================================
  // Helpers / Config (essenciais para esta página)
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
      ? "http://localhost:8080"
      : "https://api.receitasmilionarias.com.br";

  const buildImageUrl = (imagem_url) => {
    if (!imagem_url) return "static/images/receitas_capa.png";
    if (/^https?:\/\//i.test(imagem_url)) return imagem_url; // URL absoluta
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

  // ======================================================
  // Toast Notifications
  // ======================================================
  function showToast(message, type = "success") {
    const toastId = "toast-notification";
    let toast = document.getElementById(toastId);
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.id = toastId;
    toast.className = `toast-notification ${type}`;
    toast.setAttribute("role", "alert");
    toast.innerHTML = `<i class="fas ${
      type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
    }"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("visible"), 10);
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // ======================================================
  // Carrossel (galeria) com animação
  // ======================================================
  function buildRecipeImageList(recipe, buildImageUrlFn) {
    const extra =
      recipe.imagens || recipe.galeria_imagens || recipe.galeria || [];
    const extras = extra
      .map((x) => x?.url || x?.imagem_url || x)
      .filter(Boolean);
    const all = [recipe.imagem_url, ...extras].map(buildImageUrlFn);
    return [...new Set(all.filter(Boolean))];
  }

  function mountCarousel(images) {
    const gallery = document.getElementById("gallery-component");
    const track = document.getElementById("carousel-track");
    const thumbnailsContainer = document.getElementById("carousel-thumbnails");
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");

    if (!gallery || !track || !thumbnailsContainer || !prevBtn || !nextBtn)
      return;

    if (!images || images.length === 0) {
      gallery.style.display = "none";
      return;
    }

    track.innerHTML = "";
    thumbnailsContainer.innerHTML = "";

    images.forEach((src, idx) => {
      // Cria o slide principal
      const slide = document.createElement("div");
      slide.className = "carousel-slide" + (idx === 0 ? " active-slide" : "");
      slide.innerHTML = `<img src="${src}" alt="Foto ${
        idx + 1
      } da receita" loading="lazy">`;
      track.appendChild(slide);

      // Cria a miniatura (thumbnail)
      const thumb = document.createElement("button");
      thumb.className = "thumbnail-item" + (idx === 0 ? " active" : "");
      thumb.setAttribute("aria-label", `Ir para a imagem ${idx + 1}`);
      thumb.innerHTML = `<img src="${src}" alt="Miniatura ${idx + 1}">`;
      thumbnailsContainer.appendChild(thumb);
    });

    let currentIndex = 0;
    const totalSlides = images.length;
    const allSlides = track.querySelectorAll(".carousel-slide");
    const allThumbs = thumbnailsContainer.querySelectorAll(".thumbnail-item");

    const goTo = (index) => {
      currentIndex = (index + totalSlides) % totalSlides;

      // Move o track da imagem principal
      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      // Atualiza a classe ativa do slide principal
      allSlides.forEach((s, i) =>
        s.classList.toggle("active-slide", i === currentIndex)
      );

      // Atualiza a classe ativa da miniatura
      allThumbs.forEach((t, i) => {
        t.classList.toggle("active", i === currentIndex);
        // Garante que a miniatura ativa esteja visível (scroll)
        if (i === currentIndex) {
          t.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      });
    };

    // Event Listeners
    prevBtn.onclick = () => goTo(currentIndex - 1);
    nextBtn.onclick = () => goTo(currentIndex + 1);
    allThumbs.forEach((thumb, idx) => {
      thumb.onclick = () => goTo(idx);
    });

    // Esconde botões se tiver só 1 imagem
    if (images.length <= 1) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      thumbnailsContainer.style.display = "none"; // Esconde as miniaturas também
    }
  }

  // ======================================================
  // Carregamento de Receitas Recomendadas
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

      const rating = Number(r.resultados_avaliacao?.media_avaliacoes ?? 0);
      const votes = Number(r.resultados_avaliacao?.quantidade_comentarios ?? 0);
      let ratingHtml = "";
      // Só exibe receitas com status 'ativo'
      if (r.status && r.status.toLowerCase() !== "ativo") {
        return;
      }
      if (rating > 0 || votes > 0) {
        ratingHtml = `<span class="recipe-rating"><i class="fas fa-star"></i> ${rating.toFixed(
          1
        )} <small>(${votes})</small></span>`;
      }

      const card = document.createElement("a");
      card.href = `receita.html?id=${r.id}`;
      card.className = "recipe-link";
      // Define se a receita está pendente ou ativa
      const isPending = r.status && r.status.toLowerCase() === "pendente";
      const isActive = r.status && r.status.toLowerCase() === "ativo";
      const cardStatus = isPending ? "Pendente" : isActive ? "Ativo" : "";
      const cardStatusClass = isPending
        ? "status-pendente"
        : isActive
        ? "status-ativo"
        : "";

      card.innerHTML = `
        <article class="recipe-card${isPending ? " recipe-card-pending" : ""}">
          <div class="recipe-card-img-container">
        <img src="${imageUrl}" alt="${r.titulo}" loading="lazy"${
        isPending ? ' style="filter: grayscale(1); opacity: 0.7;"' : ""
      }>
        <span class="recipe-category-tag">${categoryName}</span>
        ${
          cardStatus
            ? `<span class="recipe-status-tag ${cardStatusClass}">${cardStatus}</span>`
            : ""
        }
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
        ${ratingHtml}
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
      const seen = new Set([thisId]);

      if (catId) {
        const res = await fetch(
          `${API_BASE_URL}/recipes?categorias=${catId}&page=1&limit=20&status=ativo`
        );
        if (res.ok) {
          const data = await res.json();
          const fetchedList = Array.isArray(data) ? data : data.data || [];
          list = fetchedList.filter((r) => String(r.id) !== thisId);
          list.forEach((r) => seen.add(String(r.id)));
        }
      }

      if (list.length < 3) {
        const needed = 3 - list.length;
        const res2 = await fetch(
          `${API_BASE_URL}/recipes?page=1&limit=20&status=ativo`
        );
        if (res2.ok) {
          const data2 = await res2.json();
          const pool = Array.isArray(data2) ? data2 : data2.data || [];
          for (const r of pool) {
            if (list.length >= 3) break;
            const id = String(r.id);
            if (!seen.has(id) && (!r.status || r.status === "ativo")) {
              seen.add(id);
              list.push(r);
            }
          }
        }
      }

  // Garante que só receitas com status 'ativo' aparecem
  const filtered = list.filter((r) => r.status && r.status.toLowerCase() === "ativo");
  const top3 = sortNewestFirst(filtered).slice(0, 3);
  renderRecommended(top3, grid);
    } catch (e) {
      console.error("Falha ao carregar recomendados:", e);
      grid.innerHTML =
        '<p class="error-message">Não foi possível carregar recomendações.</p>';
    }
  };

  // ======================================================
  // Lógica Principal da Página de RECEITA
  // ======================================================
  async function fetchSingleRecipe() {
    const recipeTitleEl = document.getElementById("recipe-title");
    const recipeSummaryEl = document.getElementById("recipe-summary");
    const introMainImageEl = document.getElementById("intro-main-image");

    if (!recipeTitleEl || !recipeSummaryEl || !introMainImageEl) return;

    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");
    if (!recipeId) {
      recipeTitleEl.textContent = "Receita não encontrada";
      recipeSummaryEl.textContent =
        "ID da receita não fornecido. Volte para a lista e selecione uma receita.";
      document.querySelector(".recipe-detail-page").innerHTML =
        '<p class="error-message container">ID da receita não fornecido. Volte para a lista e selecione uma receita.</p>';
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`);
      if (!response.ok) throw new Error("Receita não encontrada");
      const recipe = await response.json();

      // Se a receita não estiver ativa, não mostrar no site público
      if (recipe.status && recipe.status !== "ativo") {
        recipeTitleEl.textContent = "Receita não encontrada";
        recipeSummaryEl.textContent =
          "A receita solicitada não está disponível.";
        document.querySelector(".recipe-detail-page").innerHTML =
          '<p class="error-message container">Receita não encontrada ou indisponível.</p>';
        return;
      }

      document.title = `Receita: ${recipe.titulo} - Receitas Milionárias`;

      // Preenche Breadcrumbs
      const breadcrumbsEl = document.getElementById("recipe-breadcrumbs");
      if (breadcrumbsEl) {
        const truncatedTitle =
          recipe.titulo.length > 30
            ? recipe.titulo.substring(0, 30) + "..."
            : recipe.titulo;
        breadcrumbsEl.innerHTML = `
          <a href="index.html">Início</a>
          <span>&gt;</span>
          <a href="receitas.html">Receitas</a>
          <span>&gt;</span>
          ${truncatedTitle}
        `;
      }

      // Define a imagem de fundo do HERO (se houver)
      const heroEl = document.getElementById("recipe-hero");
      if (heroEl) {
        // Usa a imagem principal da receita como fundo do hero
        heroEl.style.backgroundImage = `url('${buildImageUrl(
          recipe.imagem_url
        )}')`;
      }

      // Preenche a NOVA SEÇÃO de INTRODUÇÃO
      introMainImageEl.src = buildImageUrl(recipe.imagem_url); // Primeira imagem da galeria
      introMainImageEl.alt = recipe.titulo;
      recipeTitleEl.textContent = recipe.titulo;
      recipeSummaryEl.textContent = recipe.resumo ?? "";

      // Adiciona o botão de compartilhar
      const shareContainer = document.getElementById("share-button-container");
      if (shareContainer) {
        const shareButton = document.createElement("button");
        shareButton.className = "share-button";
        shareButton.innerHTML = '<i class="fas fa-share-alt"></i> Compartilhar';
        shareButton.setAttribute("aria-label", "Compartilhar esta receita");
        shareButton.onclick = () => {
          let affiliateCode = localStorage.getItem("rm_afiliado");
          let shareUrl = `${window.location.origin}${window.location.pathname}?id=${recipe.id}`;
          if (affiliateCode) {
            if (affiliateCode.startsWith("afiliado_")) {
              affiliateCode = affiliateCode.replace("afiliado_", "");
            }
            shareUrl += `&ref=${affiliateCode}`;
          }
          navigator.clipboard
            .writeText(shareUrl)
            .then(() => {
              showToast("Link de compartilhamento copiado!");
            })
            .catch((err) => {
              console.error("Erro ao copiar o link:", err);
              showToast("Não foi possível copiar o link.", "error");
            });
        };
        shareContainer.appendChild(shareButton);
      }

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
      if (creatorEl) {
        const criadorNome = recipe.criador?.nome ?? "Equipe";
        const criadorId = recipe.criador?.id;
        const criadorHtml = criadorId
          ? `<a href="produtor.html?id=${criadorId}" class="recipe-creator-link">${criadorNome}</a>`
          : criadorNome;
        creatorEl.innerHTML = `<i class="fas fa-user"></i><span><strong>Criador:</strong> ${criadorHtml}</span>`;
      }

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

      const imageList = buildRecipeImageList(recipe, buildImageUrl);
      // Remove a primeira imagem da lista para o carrossel, pois ela já está na seção intro
      const carouselImages = imageList.slice(1);
      mountCarousel(carouselImages);

      loadRecommendedByCategory(recipe);

      // Dispara evento para carregar comentários
      document.dispatchEvent(new CustomEvent("recipeLoaded", { detail: { id: recipe.id } }));
    } catch (error) {
      console.error("Falha ao buscar a receita:", error);
      recipeTitleEl.textContent = "Erro ao carregar a receita";
      recipeSummaryEl.textContent =
        "Não foi possível encontrar a receita solicitada. Por favor, tente novamente.";
    }
  }

  // ======================================================
  // COMENTÁRIOS E AVALIAÇÕES
  // ======================================================

  const STAR_LABELS = ["", "Péssima", "Ruim", "Regular", "Boa", "Excelente"];

  // Lê o token JWT guardado pelo dashboard
  function getAuthToken() {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("rm_token") ||
      localStorage.getItem("authToken") ||
      null
    );
  }

  function getUserFromToken(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload;
    } catch {
      return null;
    }
  }

  // Renderiza estrelas fixas (leitura)
  function renderStars(rating, container) {
    container.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("i");
      star.className = "fas fa-star" + (i <= Math.round(rating) ? " lit" : "");
      container.appendChild(star);
    }
  }

  // Formata data
  function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // Renderiza resumo de avaliações
  function renderRatingSummary(comments) {
    const avgEl = document.getElementById("rating-avg");
    const starsEl = document.getElementById("rating-stars-display");
    const countEl = document.getElementById("rating-count");
    const barsEl = document.getElementById("rating-bars");
    if (!avgEl || !starsEl || !countEl || !barsEl) return;

    const rated = comments.filter((c) => c.avaliacao > 0);
    const total = rated.length;

    if (total === 0) {
      avgEl.textContent = "--";
      starsEl.innerHTML = "";
      countEl.textContent = "Nenhuma avaliação ainda";
      barsEl.innerHTML = "";
      return;
    }

    const avg =
      rated.reduce((sum, c) => sum + Number(c.avaliacao), 0) / total;
    avgEl.textContent = avg.toFixed(1);
    countEl.textContent = `${total} avaliação${total !== 1 ? "s" : ""}`;
    renderStars(avg, starsEl);

    // Barras por estrela
    barsEl.innerHTML = "";
    for (let star = 5; star >= 1; star--) {
      const qty = rated.filter((c) => Number(c.avaliacao) === star).length;
      const pct = total > 0 ? Math.round((qty / total) * 100) : 0;
      const row = document.createElement("div");
      row.className = "rating-bar-row";
      row.innerHTML = `
        <div class="bar-label"><span>${star}</span><i class="fas fa-star"></i></div>
        <div class="rating-bar-track">
          <div class="rating-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="bar-count">${qty}</span>
      `;
      barsEl.appendChild(row);
    }
  }

  // Renderiza lista de comentários
  function renderComments(comments) {
    const list = document.getElementById("comments-list");
    if (!list) return;
    list.innerHTML = "";

    const roots = comments.filter((c) => !c.id_comentario_pai);

    if (roots.length === 0) {
      list.innerHTML = `
        <div class="comments-empty">
          <i class="fas fa-comment-slash"></i>
          <p>Seja o primeiro a comentar nesta receita!</p>
        </div>`;
      return;
    }

    roots.forEach((c) => {
      const card = buildCommentCard(c);
      list.appendChild(card);
    });
  }

  function buildCommentCard(c, isReply = false) {
    const wrapper = document.createElement("div");
    wrapper.className = isReply ? "comment-reply" : "comment-card";

    const name = `${c.nome || ""} ${c.sobrenome || ""}`.trim() || "Usuário";
    const initial = name.charAt(0).toUpperCase();
    const avatarHtml = c.foto_perfil_url
      ? `<img class="comment-avatar" src="${buildImageUrl(c.foto_perfil_url)}" alt="${name}">`
      : `<div class="comment-avatar-placeholder">${initial}</div>`;

    let starsHtml = "";
    if (c.avaliacao && Number(c.avaliacao) > 0) {
      starsHtml = `<div class="comment-stars">`;
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<i class="fas fa-star${i <= c.avaliacao ? " lit" : ""}"></i>`;
      }
      starsHtml += `</div>`;
    }

    wrapper.innerHTML = `
      <div class="comment-header">
        ${avatarHtml}
        <div class="comment-meta">
          <p class="comment-author">${name}</p>
          <span class="comment-date">${formatDate(c.data_criacao)}</span>
        </div>
        ${starsHtml}
      </div>
      ${c.comentario ? `<p class="comment-body">${c.comentario}</p>` : ""}
    `;

    if (c.respostas && c.respostas.length > 0) {
      const repliesDiv = document.createElement("div");
      repliesDiv.className = "comment-replies";
      c.respostas.forEach((r) => {
        repliesDiv.appendChild(buildCommentCard(r, true));
      });
      wrapper.appendChild(repliesDiv);
    }

    return wrapper;
  }

  // Carrega comentários da API
  async function loadComments(recipeId) {
    const loader = document.getElementById("comments-loader");
    const list = document.getElementById("comments-list");
    if (loader) loader.style.display = "flex";

    try {
      const res = await fetch(
        `${API_BASE_URL}/recipes/${recipeId}/comments`
      );
      if (!res.ok) throw new Error("Erro ao buscar comentários");
      const comments = await res.json();

      renderRatingSummary(comments);
      renderComments(comments);
    } catch (e) {
      console.error("Erro ao carregar comentários:", e);
      if (list)
        list.innerHTML =
          '<p class="error-message">Não foi possível carregar os comentários.</p>';
    } finally {
      if (loader) loader.style.display = "none";
    }
  }

  // Inicializa o formulário de comentário
  function initCommentForm(recipeId) {
    const token = getAuthToken();
    const loginMsg = document.getElementById("comment-form-login-msg");
    const form = document.getElementById("comment-form");
    if (!loginMsg || !form) return;

    if (!token) {
      loginMsg.style.display = "flex";
      form.style.display = "none";
      return;
    }

    loginMsg.style.display = "none";
    form.style.display = "block";

    // Seletor de estrelas
    let selectedStars = 0;
    const starBtns = document.querySelectorAll(".star-btn");
    const starLabel = document.getElementById("star-label");

    const highlightStars = (upTo) => {
      starBtns.forEach((btn, idx) => {
        btn.classList.toggle("hovered", idx < upTo);
        btn.classList.toggle("active", idx < selectedStars);
      });
    };

    const setStars = (upTo) => {
      selectedStars = upTo;
      starBtns.forEach((btn, idx) => {
        btn.classList.toggle("active", idx < selectedStars);
        btn.classList.remove("hovered");
      });
      if (starLabel) {
        starLabel.textContent = STAR_LABELS[selectedStars] || "Selecione";
      }
    };

    starBtns.forEach((btn) => {
      const val = Number(btn.dataset.value);
      btn.addEventListener("mouseenter", () => highlightStars(val));
      btn.addEventListener("mouseleave", () => highlightStars(selectedStars));
      btn.addEventListener("click", () => setStars(val));
    });

    // Envio do formulário
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("btn-comment-submit");
      const commentText = document.getElementById("comment-text").value.trim();

      if (!selectedStars && !commentText) {
        showToast("Selecione uma nota ou escreva um comentário.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

      try {
        const body = new FormData();
        if (selectedStars) body.append("avaliacao", selectedStars);
        if (commentText) body.append("comentario", commentText);

        const res = await fetch(`${API_BASE_URL}/recipes/${recipeId}/comments`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Erro ao enviar comentário");
        }

        showToast("Comentário enviado com sucesso!");
        document.getElementById("comment-text").value = "";
        setStars(0);
        await loadComments(recipeId);
      } catch (err) {
        showToast(err.message || "Erro ao enviar. Tente novamente.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Avaliação';
      }
    });
  }

  // Hook: chama loadComments e initCommentForm após fetchSingleRecipe carregar a receita
  const _origFetch = fetchSingleRecipe;
  // Integração via evento personalizado disparado em fetchSingleRecipe
  document.addEventListener("recipeLoaded", (e) => {
    const recipeId = e.detail?.id;
    if (!recipeId) return;
    loadComments(recipeId);
    initCommentForm(recipeId);
  });

  fetchSingleRecipe();
});

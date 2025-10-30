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
      if (creatorEl)
        creatorEl.innerHTML = `<i class="fas fa-user"></i><span><strong>Criador:</strong> ${
          recipe.criador?.nome ?? "Equipe"
        }</span>`;

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
    } catch (error) {
      console.error("Falha ao buscar a receita:", error);
      recipeTitleEl.textContent = "Erro ao carregar a receita";
      recipeSummaryEl.textContent =
        "Não foi possível encontrar a receita solicitada. Por favor, tente novamente.";
    }
  }

  fetchSingleRecipe();
});

document.addEventListener('DOMContentLoaded', () => {

    // --- Preloader Logic ---
    const preloader = document.getElementById('preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                preloader.classList.add('hidden');
            }, 200);
        });
    }

    // --- Fullscreen Mobile Menu Logic ---
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
        }

        closeMenuBtn.addEventListener('click', closeMenu);

        const menuLinks = menuOverlay.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#') || link.getAttribute('href').includes('index.html#')) {
                    closeMenu();
                }
            });
        });
    }

    // --- Enhanced Earnings Calculator Logic ---
    const referralsSlider = document.getElementById('referrals-slider');
    const referralsInput = document.getElementById('referrals-input');

    if (referralsSlider && referralsInput) {
        const monthlyEarningsEl = document.getElementById('monthly-earnings');
        const annualEarningsEl = document.getElementById('annual-earnings');
        const pricePerReferral = 9.90;

        const formatCurrency = (value) => {
            let formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `R$ ${formatted}`;
        };

        const updateCalculator = (value) => {
            const count = parseInt(value, 10);
            
            if (isNaN(count) || count < 0) {
                return; // Não faz nada se o valor não for um número válido
            }

            const monthlyEarnings = count * pricePerReferral;
            const annualEarnings = monthlyEarnings * 12;

            if (monthlyEarningsEl) monthlyEarningsEl.textContent = formatCurrency(monthlyEarnings);
            if (annualEarningsEl) annualEarningsEl.textContent = formatCurrency(annualEarnings);
        };

        referralsInput.addEventListener('input', (e) => {
            const value = e.target.value;
            // Atualiza o slider, mas limita o valor visual ao máximo do slider
            referralsSlider.value = Math.min(value, referralsSlider.max);
            updateCalculator(value);
        });

        referralsSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            referralsInput.value = value;
            updateCalculator(value);
        });

        // Cálculo inicial ao carregar a página
        updateCalculator(referralsInput.value);
    }

    // --- Animated Counter (Intersection Observer) ---
    const animateCounter = (counter) => {
        const target = +counter.getAttribute('data-target');
        const duration = 2000; // 2 segundos
        const isDecimal = target.toString().includes('.');
        let startTimestamp = null;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            const easeOutProgress = progress * (2 - progress);
            const currentValue = easeOutProgress * target;

            if (isDecimal) {
                counter.innerText = currentValue.toFixed(2).replace('.', ',');
            } else {
                counter.innerText = Math.floor(currentValue).toLocaleString('pt-BR');
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                 if (isDecimal) {
                    counter.innerText = target.toFixed(2).replace('.', ',');
                 } else {
                    counter.innerText = Math.floor(target).toLocaleString('pt-BR');
                 }
            }
        };
        window.requestAnimationFrame(step);
    };


    // --- Fade-in Sections Logic (Intersection Observer) ---
    const allElementsToObserve = document.querySelectorAll('.fade-in-section, .counter');

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('fade-in-section')) {
                    entry.target.classList.add('visible');
                }
                
                if (entry.target.classList.contains('counter') && entry.target.innerText === '0') {
                    animateCounter(entry.target);
                }

                observer.unobserve(entry.target);
            }
        });
    };

    const intersectionObserver = new IntersectionObserver(observerCallback, {
        threshold: 0.1
    });

    allElementsToObserve.forEach(el => intersectionObserver.observe(el));


    // --- FAQ Accordion Logic ---
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const currentlyActive = document.querySelector('.faq-item.active');
                
                if (currentlyActive && currentlyActive !== item) {
                    currentlyActive.classList.remove('active');
                }
                
                item.classList.toggle('active');
            });
        });
    }

    // --- ADVANCED RECIPE LIST & FILTERS LOGIC ---
    const recipeSection = document.getElementById('receitas');
    if (recipeSection) {
        const API_BASE_URL = 'http://localhost:3001';
        const receitasContainer = document.querySelector('.recipe-grid');
        const searchInput = document.getElementById('search-input');
        const categoryFilter = document.getElementById('category-filter');
        const tagFilter = document.getElementById('tag-filter');
        const paginationControls = document.getElementById('pagination-controls');
        const resultsCountContainer = document.getElementById('results-count');
        const limitSelect = document.getElementById('limit-select');

        let state = {
            page: 1,
            limit: 15,
            search: '',
            categorias: [],
            tags: []
        };

        let searchDebounce;

        const fetchRecipes = async () => {
            receitasContainer.innerHTML = '<div class="grid-loader"></div>';
            resultsCountContainer.innerText = '';
            paginationControls.innerHTML = '';

            const params = new URLSearchParams({
                page: state.page,
                limit: state.limit,
            });

            if (state.search) params.append('search', state.search);
            if (state.categorias.length > 0) params.append('categorias', state.categorias.join(','));
            if (state.tags.length > 0) params.append('tags', state.tags.join(','));

            try {
                const response = await fetch(`${API_BASE_URL}/recipes?${params.toString()}`);
                if (!response.ok) throw new Error(`Erro na rede: ${response.status} ${response.statusText}`);
                
                const result = await response.json();
                
                let recipes, pagination;

                if (Array.isArray(result)) {
                    console.warn('API retornou um array simples. Tratando sem paginação.');
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
                receitasContainer.innerHTML = '<p class="error-message">Não foi possível carregar as receitas. Verifique se o servidor está online e tente novamente.</p>';
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

            recipes.forEach(recipe => {
                const recipeItem = document.createElement('div');
                const categoryName = recipe.categoria ? recipe.categoria.nome : 'Destaque';
                recipeItem.className = 'recipe-item';
                let imageUrl;
                if (recipe.imagem_url) {
                    const uploadIndex = recipe.imagem_url.indexOf('uploads');
                    const path = uploadIndex !== -1 ? recipe.imagem_url.substring(uploadIndex) : recipe.imagem_url;
                    imageUrl = `${API_BASE_URL}/${path}`;
                } else {
                    imageUrl = 'static/images/receitas_capa.png';
                }
                recipeItem.innerHTML = `
                    <a href="receita.html?id=${recipe.id}" class="recipe-link">
                        <article class="recipe-card">
                            <div class="recipe-card-img-container">
                                <img src="${imageUrl}" alt="${recipe.titulo}">
                                <span class="recipe-category-tag">${categoryName}</span>
                            </div>
                            <div class="recipe-card-content">
                                <h3>${recipe.titulo}</h3>
                                <p>${recipe.resumo}</p>
                            </div>
                            <div class="recipe-card-footer">
                                <div class="recipe-meta">
                                    <span><i class="fas fa-clock"></i> ${recipe.tempo_preparo_min || '?'} min</span>
                                    <span><i class="fas fa-utensils"></i> ${recipe.dificuldade || '?'}</span>
                                </div>
                                <span class="read-more-link">Ver Receita <i class="fas fa-arrow-right"></i></span>
                            </div>
                        </article>
                    </a>
                `;
                receitasContainer.appendChild(recipeItem);
            });
        };

        const renderPagination = (pagination) => {
            const { currentPage, totalPages } = pagination;
            paginationControls.innerHTML = '';
            if (totalPages <= 1) return;

            const prevButton = document.createElement('button');
            prevButton.innerHTML = '&laquo;';
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener('click', () => { state.page--; fetchRecipes(); });
            paginationControls.appendChild(prevButton);

            for (let i = 1; i <= totalPages; i++) {
                if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                    const pageButton = document.createElement('button');
                    pageButton.innerText = i;
                    if (i === currentPage) pageButton.classList.add('active');
                    pageButton.addEventListener('click', () => { state.page = i; fetchRecipes(); });
                    paginationControls.appendChild(pageButton);
                } else if (paginationControls.lastChild.innerText !== '...') {
                    const ellipsis = document.createElement('button');
                    ellipsis.innerText = '...';
                    ellipsis.disabled = true;
                    paginationControls.appendChild(ellipsis);
                }
            }

            const nextButton = document.createElement('button');
            nextButton.innerHTML = '&raquo;';
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener('click', () => { state.page++; fetchRecipes(); });
            paginationControls.appendChild(nextButton);
        };
        
        const updateResultsCount = (pagination) => {
            const { totalItems } = pagination;
            resultsCountContainer.innerText = totalItems > 0 ? `Exibindo ${totalItems} receita(s).` : '';
        };

        const populateFilterDropdown = async (filterElement, endpoint, stateKey) => {
            try {
                const response = await fetch(`${API_BASE_URL}/${endpoint}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const items = await response.json();
                const content = filterElement.querySelector('.dropdown-content');
                const buttonSpan = filterElement.querySelector('.filter-btn span');
                const originalButtonText = buttonSpan.innerText;

                content.innerHTML = '';
                if (items.length === 0) {
                    content.innerHTML = '<span class="no-items">Nenhuma opção disponível</span>';
                    return;
                }
                items.forEach(item => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" value="${item.id}"> ${item.nome}`;
                    content.appendChild(label);
                });

                content.addEventListener('change', (e) => {
                    if (e.target.type === 'checkbox') {
                        const selectedIds = Array.from(content.querySelectorAll('input:checked')).map(input => input.value);
                        state[stateKey] = selectedIds;
                        state.page = 1;
                        fetchRecipes();

                        if (selectedIds.length > 0) {
                            buttonSpan.innerText = `${originalButtonText} (${selectedIds.length})`;
                        } else {
                            buttonSpan.innerText = originalButtonText;
                        }
                    }
                });
            } catch (error) {
                console.error(`Falha ao carregar ${endpoint}:`, error);
                filterElement.querySelector('.dropdown-content').innerHTML = '<span class="no-items">Erro ao carregar.</span>';
            }
        };

        const setupEventListeners = () => {
            [categoryFilter, tagFilter].forEach(filter => {
                filter.querySelector('.filter-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.dropdown-filter.active').forEach(f => f !== filter && f.classList.remove('active'));
                    filter.classList.toggle('active');
                });
            });
            window.addEventListener('click', () => document.querySelectorAll('.dropdown-filter.active').forEach(f => f.classList.remove('active')));
            document.querySelectorAll('.dropdown-content').forEach(c => c.addEventListener('click', e => e.stopPropagation()));
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(() => {
                    state.search = e.target.value;
                    state.page = 1;
                    fetchRecipes();
                }, 500);
            });
            limitSelect.addEventListener('change', (e) => {
                state.limit = parseInt(e.target.value, 10);
                state.page = 1;
                fetchRecipes();
            });
        };

        const init = () => {
            setupEventListeners();
            populateFilterDropdown(categoryFilter, 'categories', 'categorias');
            populateFilterDropdown(tagFilter, 'tags', 'tags');
            fetchRecipes();
        };

        init();
    }

    // --- DYNAMIC SINGLE RECIPE LOGIC (RECIPE PAGE) ---
    async function fetchSingleRecipe() {
        const recipeTitleEl = document.getElementById('recipe-title');
        if (!recipeTitleEl) {
            return; // Not on the recipe detail page
        }

        const params = new URLSearchParams(window.location.search);
        const recipeId = params.get('id');

        if (!recipeId) {
            recipeTitleEl.textContent = 'Receita não encontrada';
            return;
        }

        try {
            const response = await fetch(`http://localhost:3001/recipes/${recipeId}`);
            if (!response.ok) throw new Error('Receita não encontrada');
            const recipe = await response.json();

            // Populate the page
            document.title = `Receita: ${recipe.titulo} - Receitas Milionárias`;

            const heroEl = document.getElementById('recipe-hero');
            let imageUrl;
            if (recipe.imagem_url) {
                const uploadIndex = recipe.imagem_url.indexOf('uploads');
                const path = uploadIndex !== -1 ? recipe.imagem_url.substring(uploadIndex) : recipe.imagem_url;
                imageUrl = `http://localhost:3001/${path}`;
            } else {
                imageUrl = 'static/images/receitas_capa.png';
            }
            heroEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${imageUrl}')`;
            recipeTitleEl.textContent = recipe.titulo;
            document.getElementById('recipe-summary').textContent = recipe.resumo;

            document.getElementById('recipe-prep-time').innerHTML = `<i class="fas fa-clock"></i><span><strong>Preparo:</strong> ${recipe.tempo_preparo_min || '--'} min</span>`;
            document.getElementById('recipe-difficulty').innerHTML = `<i class="fas fa-utensils"></i><span><strong>Dificuldade:</strong> ${recipe.dificuldade || '--'}</span>`;
            document.getElementById('recipe-calories').innerHTML = `<i class="fas fa-fire-alt"></i><span><strong>Calorias:</strong> ${recipe.calorias_kcal || '--'} kcal</span>`;
            document.getElementById('recipe-creator').innerHTML = `<i class="fas fa-user"></i><span><strong>Criador:</strong> ${recipe.criador.nome || '--'}</span>`;

            const ingredientsContainer = document.getElementById('recipe-ingredients-list');
            let ingredientsHtml = '<h2><i class="fas fa-carrot"></i> Ingredientes</h2>';
            if (recipe.grupos_ingredientes && recipe.grupos_ingredientes.length > 0) {
                recipe.grupos_ingredientes.forEach(group => {
                    ingredientsHtml += `<h3>${group.titulo}</h3>`;
                    ingredientsHtml += '<ul>';
                    group.ingredientes.forEach(ingredient => {
                        ingredientsHtml += `<li>${ingredient.descricao} ${ingredient.observacao ? `<em>(${ingredient.observacao})</em>` : ''}</li>`;
                    });
                    ingredientsHtml += '</ul>';
                });
            } else {
                ingredientsHtml += '<p>Ingredientes não especificados.</p>';
            }
            ingredientsContainer.innerHTML = ingredientsHtml;

            const instructionsContainer = document.getElementById('recipe-instructions-list');
            let instructionsHtml = '<h2><i class="fas fa-book-open"></i> Modo de Preparo</h2>';
            if (recipe.passos_preparo && recipe.passos_preparo.length > 0) {
                instructionsHtml += '<ol>';
                recipe.passos_preparo.forEach(step => {
                    instructionsHtml += `<li>${step.descricao} ${step.observacao ? `<em>(${step.observacao})</em>` : ''}</li>`;
                });
                instructionsHtml += '</ol>';
            } else {
                instructionsHtml += '<p>Modo de preparo não especificado.</p>';
            }
            instructionsContainer.innerHTML = instructionsHtml;

        } catch (error) {
            console.error('Falha ao buscar a receita:', error);
            recipeTitleEl.textContent = 'Erro ao carregar a receita';
            document.getElementById('recipe-summary').textContent = 'Não foi possível encontrar a receita solicitada. Por favor, tente novamente.';
        }
    }

    fetchSingleRecipe();
});
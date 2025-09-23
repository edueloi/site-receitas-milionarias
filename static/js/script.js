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
                // Fecha o menu apenas se for um link de âncora na mesma página
                if (link.getAttribute('href').startsWith('#') || link.getAttribute('href').includes('index.html#')) {
                    closeMenu();
                }
            });
        });
    }

    // --- Enhanced Earnings Calculator Logic ---
    const referralsSlider = document.getElementById('referrals');
    if (referralsSlider) {
        const referralsCount = document.getElementById('referrals-count');
        const monthlyEarningsEl = document.getElementById('monthly-earnings');
        const annualEarningsEl = document.getElementById('annual-earnings');
        const pricePerReferral = 9.90;

        const formatCurrency = (value) => {
            // Garante que o número seja formatado com duas casas decimais e vírgula
            let formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `R$ ${formatted}`;
        };
        
        const formatInteger = (value) => {
             return value.toLocaleString('pt-BR');
        };

        const updateCalculator = () => {
            const count = parseInt(referralsSlider.value, 10);
            const monthlyEarnings = count * pricePerReferral;
            const annualEarnings = monthlyEarnings * 12;

            if (referralsCount) referralsCount.textContent = count;
            if (monthlyEarningsEl) monthlyEarningsEl.textContent = formatCurrency(monthlyEarnings);
            if (annualEarningsEl) annualEarningsEl.textContent = formatCurrency(annualEarnings);
        };

        referralsSlider.addEventListener('input', updateCalculator);
        // Garante que a primeira atualização aconteça
        updateCalculator();
    }

    // --- Animated Counter (Intersection Observer) ---
    // ATUALIZADO: Lógica de animação do contador foi melhorada para ser mais suave.
    const animateCounter = (counter) => {
        const target = +counter.getAttribute('data-target');
        const duration = 2000; // 2 segundos
        const isDecimal = target.toString().includes('.');
        let startTimestamp = null;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Easing function (ease-out quadratic) para uma animação mais suave
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
                 // Garante que o valor final seja exato
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

                // Para de observar o elemento uma vez que ele já foi animado
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
                
                // Fecha o item ativo se não for o que foi clicado
                if (currentlyActive && currentlyActive !== item) {
                    currentlyActive.classList.remove('active');
                }
                
                // Alterna o estado do item clicado
                item.classList.toggle('active');
            });
        });
    }

    // --- Recipe Filter Logic ---
    // ATUALIZADO: Adicionada animação de fade para uma filtragem mais suave.
    const filterContainer = document.querySelector('.filter-buttons');
    if (filterContainer) {
        const filterButtons = filterContainer.querySelectorAll('.filter-btn');
        const recipeItems = document.querySelectorAll('.recipe-item');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');

                // Atualiza o botão ativo
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                recipeItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    const shouldShow = (filter === 'all' || filter === category);

                    // Adiciona um efeito de fade out antes de esconder o elemento
                    if (shouldShow) {
                        item.style.display = 'block';
                        setTimeout(() => {
                           item.style.opacity = '1';
                           item.style.transform = 'scale(1)';
                        }, 50);
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            item.style.display = 'none';
                        }, 400); // Tempo deve ser igual à transição no CSS
                    }
                });
            });
        });
    }
});
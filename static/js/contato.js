// =========================================================
// PÁGINA DE CONTATO - JAVASCRIPT
// =========================================================

document.addEventListener('DOMContentLoaded', function() {
    
    // Elementos do formulário
    const form = document.getElementById('contatoForm');
    const mensagemTextarea = document.getElementById('mensagem');
    const charCounter = document.querySelector('.char-counter');
    const telefoneInput = document.getElementById('telefone');

    // Contador de caracteres para textarea
    if (mensagemTextarea && charCounter) {
        mensagemTextarea.addEventListener('input', function() {
            const length = this.value.length;
            const maxLength = 500;
            
            charCounter.textContent = `${length} / ${maxLength}`;
            
            if (length > maxLength) {
                this.value = this.value.substring(0, maxLength);
                charCounter.textContent = `${maxLength} / ${maxLength}`;
                charCounter.style.color = '#ff4444';
            } else if (length > maxLength * 0.9) {
                charCounter.style.color = '#ff9800';
            } else {
                charCounter.style.color = '#999';
            }
        });
    }

    // Máscara de telefone
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length <= 11) {
                if (value.length <= 10) {
                    // (00) 0000-0000
                    value = value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
                } else {
                    // (00) 00000-0000
                    value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                }
            }
            
            e.target.value = value;
        });
    }

    // Validação e envio do formulário
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validação básica
            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim();
            const assunto = document.getElementById('assunto').value;
            const mensagem = document.getElementById('mensagem').value.trim();
            
            if (!nome || !email || !assunto || !mensagem) {
                showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
                return;
            }
            
            // Validação de e-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Por favor, insira um e-mail válido.', 'error');
                return;
            }
            
            // Simular envio (aqui você integraria com seu backend)
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            // Simular delay de envio
            setTimeout(function() {
                // Aqui você faria a requisição AJAX para o backend
                console.log('Dados do formulário:', {
                    nome: nome,
                    email: email,
                    telefone: document.getElementById('telefone').value,
                    assunto: assunto,
                    mensagem: mensagem
                });
                
                // Resetar formulário
                form.reset();
                if (charCounter) {
                    charCounter.textContent = '0 / 500';
                    charCounter.style.color = '#999';
                }
                
                // Restaurar botão
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                
                // Mostrar mensagem de sucesso
                showNotification('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
            }, 1500);
        });
    }

    // Função para mostrar notificações
    function showNotification(message, type = 'success') {
        // Remover notificação anterior se existir
        const existingNotification = document.querySelector('.form-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Criar nova notificação
        const notification = document.createElement('div');
        notification.className = `form-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Adicionar estilos inline
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 12px;
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Adicionar animações CSS
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Analytics de cliques nos links de contato
    const contactLinks = document.querySelectorAll('.info-content a, .social-link');
    contactLinks.forEach(link => {
        link.addEventListener('click', function() {
            const linkType = this.closest('.info-item') ? 'contact-direct' : 'social-media';
            const linkText = this.textContent.trim();
            console.log(`Link clicado: ${linkType} - ${linkText}`);
            // Aqui você pode enviar para seu analytics (Google Analytics, etc)
        });
    });
});

/**
 * Funções de Máscara (CPF e Telefone)
 */
const maskCpf = (value) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (value) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
const validateEmailFormat = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const stepper = document.getElementById('stepper');
    const steps = stepper.querySelectorAll('.step');
    const formSteps = document.querySelectorAll('.form-step');
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const signupForm = document.getElementById('signup-form');
    const passwordToggles = document.querySelectorAll('.toggle-password');
    const stripe = Stripe('pk_test_51SEbIb3Qt7AZrHCLzx9wY8UwhYNBY5UFor6YsdE4tNNozr8Fvbs1xcJk7gmIP7J0L8lVsweijPo75y1WrL2DkSCz00SWCxtInW');
    let currentStep = 0;
    
    const inputs = {
        firstName: document.getElementById('firstName'), lastName: document.getElementById('lastName'),
        email: document.getElementById('email'), phone: document.getElementById('phone'),
        cpf: document.getElementById('cpf'), birthDate: document.getElementById('birthDate'),
        password: document.getElementById('password'), confirmPassword: document.getElementById('confirmPassword'),
        affiliateCode: document.getElementById('affiliateCode'),
    };
    const affiliateFieldContainer = document.getElementById('affiliate-field-container');

    const showToast = (message, type = 'error') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        toast.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('animationend', () => toast.remove());
        }, 4000);
    };

    // --- Lógica de Navegação e Stepper ---
    const updateStepper = () => {
        steps.forEach((step, index) => {
            const icon = step.querySelector('.step-icon');
            step.classList.remove('active', 'completed');
            if (index < currentStep) {
                step.classList.add('completed');
                icon.innerHTML = `<i class="fas fa-check"></i>`;
            } else if (index === currentStep) {
                step.classList.add('active');
                icon.textContent = index + 1;
            } else {
                icon.textContent = index + 1;
            }
        });
    };
    const showStep = (stepIndex) => {
        formSteps.forEach(step => step.classList.remove('active'));
        formSteps[stepIndex].classList.add('active');
        currentStep = stepIndex;
        updateStepper();
        updateNavigation();
    };
    const updateNavigation = () => {
        backBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';
        nextBtn.style.display = currentStep < steps.length - 1 ? 'inline-block' : 'none';
        finishBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';
    };

    const validateField = (input) => {
        const label = input.closest('label');
        if (!label) return true;
        let isValid = true;

        if (input.required && !input.value.trim()) isValid = false;
        if (isValid && input.id === 'email' && !validateEmailFormat(input.value)) isValid = false;
        if (isValid && input.id === 'cpf' && input.value.length !== 14) isValid = false;
        if (isValid && input.id === 'phone' && input.value.length !== 15) isValid = false;
        if (isValid && input.id === 'password' && input.value.length < 6) isValid = false;
        if (isValid && input.id === 'confirmPassword' && input.value !== inputs.password.value) isValid = false;
        
        if (!input.required && !input.value) {
            isValid = true;
            label.classList.remove('valid', 'invalid');
        } else {
            label.classList.toggle('valid', isValid);
            label.classList.toggle('invalid', !isValid);
        }
        return isValid;
    };

    const validateStep = () => {
        const currentFormStep = formSteps[currentStep];
        const fieldsToValidate = currentFormStep.querySelectorAll('input[required]');
        let allFieldsValid = true;

        fieldsToValidate.forEach(input => {
            if (!validateField(input)) {
                allFieldsValid = false;
            }
        });

        if (!allFieldsValid) {
            showToast('Por favor, corrija os campos em vermelho.', 'error');
        }
        return allFieldsValid;
    };
    
    // --- Event Listeners ---
    nextBtn.addEventListener('click', () => {
        if (validateStep()) {
            showToast('Tudo certo! Próximo passo.', 'success');
            showStep(currentStep + 1);
        }
    });
    backBtn.addEventListener('click', () => showStep(currentStep - 1));

    Object.values(inputs).forEach(input => {
        if(input) input.addEventListener('blur', () => validateField(input));
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (currentStep !== steps.length - 1) return;

        finishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        finishBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:8080/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inputs.email.value,
                    firstName: inputs.firstName.value,
                    lastName: inputs.lastName.value,
                    affiliateId: inputs.affiliateCode.value || ''
                }),
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Erro no pagamento.');
            const session = await response.json();
            const { error } = await stripe.redirectToCheckout({ sessionId: session.id });
            if (error) throw new Error(error.message);
        } catch (error) {
            showToast(error.message || 'Não foi possível conectar ao servidor.', 'error');
            finishBtn.innerHTML = 'Finalizar e Pagar';
            finishBtn.disabled = false;
        }
    });

    // --- Inicialização ---
    inputs.cpf?.addEventListener('input', (e) => { e.target.value = maskCpf(e.target.value); });
    inputs.phone?.addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });

    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const targetInput = document.getElementById(toggle.dataset.target);
            if (targetInput) {
                targetInput.type = targetInput.type === 'password' ? 'text' : 'password';
                toggle.classList.toggle('fa-eye');
                toggle.classList.toggle('fa-eye-slash');
            }
        });
    });

    // CORREÇÃO: Lógica do código de afiliado com bloqueio e ocultação
    if (window.RM_AFF && typeof window.RM_AFF.get === 'function' && inputs.affiliateCode) {
        const affiliateCode = window.RM_AFF.get();
        if (affiliateCode) {
            inputs.affiliateCode.value = affiliateCode;
            inputs.affiliateCode.readOnly = true; // Bloqueia o campo
            
            if(affiliateFieldContainer) {
                affiliateFieldContainer.classList.add('hidden'); // Oculta o campo
            }
        }
    }

    showStep(0);
});
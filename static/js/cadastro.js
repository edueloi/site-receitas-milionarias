/**
 * Funções de Máscara (CPF e Telefone)
 */
const maskCpf = (value) =>
  value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (value) =>
  value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
const validateEmailFormat = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

document.addEventListener("DOMContentLoaded", () => {
  // --- Seletores de Elementos ---
  const stepper = document.getElementById("stepper");
  const steps = stepper.querySelectorAll(".step");
  const formSteps = document.querySelectorAll(".form-step");
  const backBtn = document.getElementById("back-btn");
  const nextBtn = document.getElementById("next-btn");
  const finishBtn = document.getElementById("finish-btn");
  const signupForm = document.getElementById("signup-form");
  const passwordToggles = document.querySelectorAll(".toggle-password");
  const isLocalHost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  );
  const config = window.RM_CONFIG || {
    API_BASE_URL: isLocalHost
      ? "http://localhost:8484"
      : "https://api.receitasmilionarias.com.br",
    STRIPE_PUBLISHABLE_KEY: isLocalHost
      ? "pk_test_51SvPraPK4fqE2OifCOIoXB4S4VVlvYJSkrD4O3hKmRexjN0TG4eKSz6eOHdolAj1I2BL8QmZ7fhvWKgCiN7QOo2B00wvMY8j9Z"
      : "pk_live_51SvPrGADbQovebzdAIulkMrdyUzIbQYBhDiNP3IyDjj79BFtm8pd5snVrN8tRFiyrJhX0D8Y6zfz40Kk7RlwVAhs00Y8BVzsKX",
  };
  const stripe = Stripe(config.STRIPE_PUBLISHABLE_KEY);
  const PAYMENT_LINK_URL = isLocalHost
    ? "https://buy.stripe.com/test_8x214p5IE4VaaBafKu2kw00"
    : "https://buy.stripe.com/aFa5kC1D246a9uEfvWbV600";

  let currentStep = 0;

  const inputs = {
    firstName: document.getElementById("firstName"),
    lastName: document.getElementById("lastName"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    cpf: document.getElementById("cpf"),
    birthDate: document.getElementById("birthDate"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
    affiliateCode: document.getElementById("affiliateCode"),
  };
  const affiliateFieldContainer = document.getElementById(
    "affiliate-field-container"
  );
  const passwordFeedback = document.getElementById("password-feedback"); // Seleciona o container de feedback

  const showToast = (message, type = "error") => {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    const iconClass =
      type === "success" ? "fa-check-circle" : "fa-exclamation-triangle";
    toast.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      toast.addEventListener("animationend", () => toast.remove());
    }, 4000);
  };

  // --- Lógica de Navegação e Stepper ---
  const updateStepper = () => {
    steps.forEach((step, index) => {
      const icon = step.querySelector(".step-icon");
      step.classList.remove("active", "completed");
      if (index < currentStep) {
        step.classList.add("completed");
        icon.innerHTML = `<i class="fas fa-check"></i>`;
      } else if (index === currentStep) {
        step.classList.add("active");
        icon.textContent = index + 1;
      } else {
        icon.textContent = index + 1;
      }
    });
  };
  const showStep = (stepIndex) => {
    formSteps.forEach((step) => step.classList.remove("active"));
    formSteps[stepIndex].classList.add("active");
    currentStep = stepIndex;
    updateStepper();
    updateNavigation();
  };
  const updateNavigation = () => {
    backBtn.style.display = currentStep > 0 ? "inline-block" : "none";
    nextBtn.style.display =
      currentStep < steps.length - 1 ? "inline-block" : "none";
    finishBtn.style.display =
      currentStep === steps.length - 1 ? "inline-block" : "none";
  };

  const validatePasswordStrength = (password) => {
    const feedback = {
      length: document.getElementById("length"),
      case: document.getElementById("case"),
      number: document.getElementById("number"),
      special: document.getElementById("special"),
    };
    let isValid = true;

    // Critérios
    const hasLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    // Atualiza feedback visual
    const updateFeedback = (element, condition) => {
      element.classList.toggle("valid", condition);
      element.classList.toggle("invalid", !condition);
      // Corrige o ícone trocando a classe no elemento <i>
      const icon = element.querySelector("i");
      if (icon) {
        icon.className = condition
          ? "fas fa-check-circle"
          : "fas fa-times-circle";
      }
    };

    updateFeedback(feedback.length, hasLength);
    updateFeedback(feedback.case, hasUpperCase && hasLowerCase);
    updateFeedback(feedback.number, hasNumber);
    updateFeedback(feedback.special, hasSpecial);

    if (
      !hasLength ||
      !hasUpperCase ||
      !hasLowerCase ||
      !hasNumber ||
      !hasSpecial
    ) {
      isValid = false;
    }

    return isValid;
  };

  const validateField = (input) => {
    const label = input.closest("label");
    if (!label) return true;
    let isValid = true;

    if (input.required && !input.value.trim()) isValid = false;
    if (isValid && input.id === "email" && !validateEmailFormat(input.value))
      isValid = false;
    if (isValid && input.id === "cpf" && input.value.length !== 14)
      isValid = false;
    if (isValid && input.id === "phone" && input.value.length !== 15)
      isValid = false;
    if (isValid && input.id === "password")
      isValid = validatePasswordStrength(input.value);
    if (
      isValid &&
      input.id === "confirmPassword" &&
      input.value !== inputs.password.value
    )
      isValid = false;

    if (!input.required && !input.value) {
      isValid = true;
      label.classList.remove("valid", "invalid");
    } else {
      label.classList.toggle("valid", isValid);
      label.classList.toggle("invalid", !isValid);
    }
    return isValid;
  };

  const validateStep = () => {
    const currentFormStep = formSteps[currentStep];
    const fieldsToValidate =
      currentFormStep.querySelectorAll("input[required]");
    let allFieldsValid = true;

    fieldsToValidate.forEach((input) => {
      if (!validateField(input)) {
        allFieldsValid = false;
      }
    });

    if (!allFieldsValid) {
      showToast("Por favor, corrija os campos em vermelho.", "error");
    }
    return allFieldsValid;
  };

  // --- Event Listeners ---
  nextBtn.addEventListener("click", () => {
    if (validateStep()) {
      // Removido o toast de sucesso para não ser repetitivo
      showStep(currentStep + 1);
    }
  });
  backBtn.addEventListener("click", () => showStep(currentStep - 1));

  Object.values(inputs).forEach((input) => {
    if (input) input.addEventListener("blur", () => validateField(input));
  });

  // ===== INÍCIO DA CORREÇÃO =====
  if (inputs.password && passwordFeedback) {
    // Mostra o feedback quando o usuário clica no campo
    inputs.password.addEventListener("focus", () => {
      passwordFeedback.style.display = "block";
    });

    // Esconde o feedback quando o usuário clica fora E o campo está vazio
    inputs.password.addEventListener("blur", () => {
      if (inputs.password.value === "") {
        passwordFeedback.style.display = "none";
      }
    });

    // Valida a força da senha em tempo real enquanto digita
    inputs.password.addEventListener("input", () => {
      validatePasswordStrength(inputs.password.value);
    });
  }
  // ===== FIM DA CORREÇÃO =====

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (currentStep !== steps.length - 1) return;

    finishBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Processando...';
    finishBtn.disabled = true;

    try {
      // 1️⃣ Cria o usuário no banco
      const userResponse = await fetch(
        `${config.API_BASE_URL}/users/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: inputs.firstName.value,
            sobrenome: inputs.lastName.value,
            email: inputs.email.value,
            senha: inputs.password.value,
            cpf: inputs.cpf.value,
            phone: inputs.phone.value,
            birthDate: inputs.birthDate.value,
            affiliateCode: inputs.affiliateCode.value || "",
          }),
        }
      );

      const userData = await userResponse.json();
      if (!userResponse.ok) {
        throw new Error(userData.message || "Erro ao criar usuário.");
      }

      console.log("🟢 Usuário criado com ID:", userData.userId);

      // 2️⃣ Redireciona para Payment Link do Stripe
      const linkUrl = new URL(PAYMENT_LINK_URL);
      if (inputs.email.value) {
        linkUrl.searchParams.set("prefilled_email", inputs.email.value);
      }
      window.location.href = linkUrl.toString();
      return;
    } catch (error) {
      showToast(
        error.message || "Não foi possível completar o cadastro.",
        "error"
      );
      finishBtn.innerHTML = "Finalizar e Pagar";
      finishBtn.disabled = false;
    }
  });

  // --- Inicialização ---
  inputs.cpf?.addEventListener("input", (e) => {
    e.target.value = maskCpf(e.target.value);
  });
  inputs.phone?.addEventListener("input", (e) => {
    e.target.value = maskPhone(e.target.value);
  });

  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      const targetInput = document.getElementById(toggle.dataset.target);
      if (targetInput) {
        targetInput.type =
          targetInput.type === "password" ? "text" : "password";
        toggle.classList.toggle("fa-eye");
        toggle.classList.toggle("fa-eye-slash");
      }
    });
  });

  if (
    window.RM_AFF &&
    typeof window.RM_AFF.get === "function" &&
    inputs.affiliateCode
  ) {
    const affiliateCode = window.RM_AFF.get();
    if (affiliateCode) {
      inputs.affiliateCode.value = affiliateCode;
      inputs.affiliateCode.readOnly = true;
      if (affiliateFieldContainer) {
        affiliateFieldContainer.classList.add("hidden");
      }
    }
  }

  showStep(0);
});


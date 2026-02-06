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
  const isLocalHost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  );
  const config = window.RM_CONFIG || {
    API_BASE_URL: isLocalHost
      ? "http://localhost:8484"
      : "https://api.receitasmilionarias.com.br",
  };
  const apiBase = config.API_BASE_URL;

  const stepper = document.getElementById("stepper");
  const steps = stepper.querySelectorAll(".step");
  const formSteps = document.querySelectorAll(".form-step");
  const backBtn = document.getElementById("back-btn");
  const nextBtn = document.getElementById("next-btn");
  const finishBtn = document.getElementById("finish-btn");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const passwordToggles = document.querySelectorAll(".toggle-password");
  const inviteStatus = document.getElementById("invite-status");
  const contractSection = document.getElementById("contract-section");
  const successMessage = document.getElementById("success-message");
  const acceptBtn = document.getElementById("accept-contract");
  const declineBtn = document.getElementById("decline-contract");
  const declineModal = document.getElementById("decline-modal");
  const declineCancel = document.getElementById("decline-cancel");
  const declineConfirm = document.getElementById("decline-confirm");
  const contractDownload = document.getElementById("contract-download");

  const inputs = {
    firstName: document.getElementById("firstName"),
    lastName: document.getElementById("lastName"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    cpf: document.getElementById("cpf"),
    birthDate: document.getElementById("birthDate"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
  };
  const passwordFeedback = document.getElementById("password-feedback");

  const showToast = (message, type = "error") => {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    const iconClass = type === "success" ? "fa-check-circle" : "fa-exclamation-triangle";
    toast.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("hide");
      toast.addEventListener("animationend", () => toast.remove());
    }, 4000);
  };

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
    nextBtn.style.display = currentStep < steps.length - 1 ? "inline-block" : "none";
    finishBtn.style.display = currentStep === steps.length - 1 ? "inline-block" : "none";
  };

  const validatePasswordStrength = (password) => {
    const feedback = {
      length: document.getElementById("length"),
      case: document.getElementById("case"),
      number: document.getElementById("number"),
      special: document.getElementById("special"),
    };
    let isValid = true;

    const hasLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const updateFeedback = (element, condition) => {
      element.classList.toggle("valid", condition);
      element.classList.toggle("invalid", !condition);
      const icon = element.querySelector("i");
      if (icon) {
        icon.className = condition ? "fas fa-check-circle" : "fas fa-times-circle";
      }
    };

    updateFeedback(feedback.length, hasLength);
    updateFeedback(feedback.case, hasUpperCase && hasLowerCase);
    updateFeedback(feedback.number, hasNumber);
    updateFeedback(feedback.special, hasSpecial);

    if (!hasLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      isValid = false;
    }

    return isValid;
  };

  const validateField = (input) => {
    const label = input.closest("label");
    if (!label) return true;
    let isValid = true;

    if (input.required && !input.value.trim()) isValid = false;
    if (isValid && input.id === "email" && !validateEmailFormat(input.value)) isValid = false;
    if (isValid && input.id === "cpf" && input.value.length !== 14) isValid = false;
    if (isValid && input.id === "phone" && input.value.length !== 15) isValid = false;
    if (isValid && input.id === "password") isValid = validatePasswordStrength(input.value);
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
    const fieldsToValidate = currentFormStep.querySelectorAll("input[required]");
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

  const disableForm = () => {
    signupForm.querySelectorAll("input, button").forEach((el) => {
      el.disabled = true;
    });
  };

  const updateInviteStatus = (type, message) => {
    inviteStatus.className = `invite-status invite-status--${type}`;
    inviteStatus.textContent = message;
  };

  let currentStep = 0;
  showStep(0);
  if (signupContainer) signupContainer.classList.add("signup-hidden");

  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) {
    updateInviteStatus("error", "Link invalido. Solicite um novo convite.");
    disableForm();
    if (contractSection) contractSection.style.display = "none";
    if (contractDownload) contractDownload.href = "#";
    return;
  }

  const validateInvite = async () => {
    try {
      const response = await fetch(
        `${apiBase}/affiliate-pro/invite?token=${encodeURIComponent(token)}`
      );
      const data = await response.json();
      if (!response.ok || !data.valid) {
        const reason = data?.reason || "invalid";
        const message =
          reason === "expired"
            ? "Este link expirou. Solicite um novo convite."
            : "Link invalido ou ja utilizado.";
        updateInviteStatus("error", message);
        disableForm();
        if (contractSection) contractSection.style.display = "none";
        if (contractDownload) contractDownload.href = "#";
        return;
      }
      const expiresAt = data?.expiresAt
        ? new Date(data.expiresAt).toLocaleString("pt-BR")
        : "em breve";
      updateInviteStatus("info", `Link valido. Expira em ${expiresAt}.`);
      if (contractDownload) {
        contractDownload.href = `${apiBase}/pdf/affiliate-pro-contract`;
      }
    } catch (err) {
      updateInviteStatus("error", "Nao foi possivel validar o link.");
      disableForm();
      if (contractSection) contractSection.style.display = "none";
      if (contractDownload) contractDownload.href = "#";
    }
  };

  validateInvite();

  let contractAccepted = false;
  if (acceptBtn) {
    acceptBtn.addEventListener("click", () => {
      contractAccepted = true;
      if (contractSection) contractSection.style.display = "none";
      if (signupContainer) {
        signupContainer.classList.remove("signup-hidden");
        signupContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  Object.values(inputs).forEach((input) => {
    if (input) input.addEventListener("blur", () => validateField(input));
  });

  if (inputs.password && passwordFeedback) {
    inputs.password.addEventListener("focus", () => {
      passwordFeedback.style.display = "block";
    });
    inputs.password.addEventListener("blur", () => {
      if (inputs.password.value === "") {
        passwordFeedback.style.display = "none";
      }
    });
    inputs.password.addEventListener("input", () => {
      validatePasswordStrength(inputs.password.value);
    });
  }

  if (inputs.cpf) {
    inputs.cpf.addEventListener("input", (e) => {
      e.target.value = maskCpf(e.target.value);
    });
  }
  if (inputs.phone) {
    inputs.phone.addEventListener("input", (e) => {
      e.target.value = maskPhone(e.target.value);
    });
  }

  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-target");
      const target = document.getElementById(targetId);
      if (!target) return;
      const isPassword = target.type === "password";
      target.type = isPassword ? "text" : "password";
      toggle.classList.toggle("fa-eye");
      toggle.classList.toggle("fa-eye-slash");
    });
  });

  nextBtn.addEventListener("click", () => {
    if (validateStep()) showStep(currentStep + 1);
  });
  backBtn.addEventListener("click", () => showStep(currentStep - 1));

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (currentStep !== steps.length - 1) return;
    if (!contractAccepted) {
      showToast("Voce precisa aceitar o contrato para continuar.", "error");
      return;
    }

    finishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    finishBtn.disabled = true;

    try {
      const payload = {
        token,
        firstName: inputs.firstName.value.trim(),
        lastName: inputs.lastName.value.trim(),
        email: inputs.email.value.trim(),
        password: inputs.password.value,
        cpf: inputs.cpf.value.trim(),
        phone: inputs.phone.value.trim(),
        birthDate: inputs.birthDate.value,
        acceptedContract: true,
      };

      const response = await fetch(`${apiBase}/affiliate-pro/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data?.message || "Erro ao cadastrar. Tente novamente.", "error");
        return;
      }

      if (successMessage) {
        successMessage.classList.add("is-visible");
      }
      if (contractSection) contractSection.style.display = "none";
      if (signupContainer) signupContainer.classList.add("signup-hidden");
      showToast("Cadastro concluido com sucesso!", "success");
      setTimeout(() => {
        window.location.href =
          "https://dashboard.receitasmilionarias.com.br/authentication/sign-in";
      }, 3000);
    } catch (err) {
      showToast("Erro ao cadastrar. Tente novamente.", "error");
    } finally {
      finishBtn.innerHTML = "Finalizar Cadastro";
      finishBtn.disabled = false;
    }
  });

  const openDeclineModal = () => {
    if (!declineModal) return;
    declineModal.classList.add("is-open");
    declineModal.setAttribute("aria-hidden", "false");
  };

  const closeDeclineModal = () => {
    if (!declineModal) return;
    declineModal.classList.remove("is-open");
    declineModal.setAttribute("aria-hidden", "true");
  };

  if (declineBtn) {
    declineBtn.addEventListener("click", () => {
      if (!token) return;
      openDeclineModal();
    });
  }

  if (declineCancel) {
    declineCancel.addEventListener("click", closeDeclineModal);
  }

  if (declineModal) {
    declineModal.addEventListener("click", (event) => {
      if (event.target === declineModal) closeDeclineModal();
    });
  }

  if (declineConfirm) {
    declineConfirm.addEventListener("click", async () => {
      if (!token) return;
      try {
        await fetch(`${apiBase}/affiliate-pro/decline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            email: inputs.email.value.trim() || null,
            reason: "user_declined",
          }),
        });
        showToast("Recusa registrada. Solicite um novo convite se mudar de ideia.", "success");
        closeDeclineModal();
        disableForm();
      } catch (err) {
        showToast("Nao foi possivel registrar a recusa.", "error");
        closeDeclineModal();
      }
    });
  }
});

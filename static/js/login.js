// Inicializa o Stripe
const localConfig = (() => {
  if (window.RM_CONFIG) return window.RM_CONFIG;
  const isLocalHost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  );
  return {
    API_BASE_URL: isLocalHost ? "http://localhost:8484" : "https://api.receitasmilionarias.com.br",
    STRIPE_PUBLISHABLE_KEY: isLocalHost
      ? "pk_test_51SvPraPK4fqE2OifCOIoXB4S4VVlvYJSkrD4O3hKmRexjN0TG4eKSz6eOHdolAj1I2BL8QmZ7fhvWKgCiN7QOo2B00wvMY8j9Z"
      : "pk_live_51SvPrGADbQovebzdAIulkMrdyUzIbQYBhDiNP3IyDjj79BFtm8pd5snVrN8tRFiyrJhX0D8Y6zfz40Kk7RlwVAhs00Y8BVzsKX",
  };
})();

const stripe = Stripe(localConfig.STRIPE_PUBLISHABLE_KEY);
const PAYMENT_LINK_URL = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
)
  ? "https://buy.stripe.com/test_8x214p5IE4VaaBafKu2kw00"
  : "https://buy.stripe.com/aFa5kC1D246a9uEfvWbV600";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const loginBtn = document.getElementById("login-btn");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.querySelector(".toggle-password");
  const signupLink = document.querySelector(".form-footer a[href*=\"cadastro.html\"]");

  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get("ref");
  if (signupLink && refCode) {
    try {
      const signupUrl = new URL(signupLink.getAttribute("href"), window.location.href);
      signupUrl.searchParams.set("ref", refCode);
      signupLink.setAttribute("href", signupUrl.toString());
    } catch (err) {
      console.error("Erro ao atualizar link de cadastro:", err);
    }
  }

  // Toggle password visibility
  passwordToggle.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    passwordToggle.textContent = type === "password" ? "👁️" : "🙈";
  });

  // Toast notification function
  const showToast = (message, type = "success") => {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.className = toast.className.replace("show", "");
    }, 5000);
  };

  // Handle login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const senha = passwordInput.value;

    if (!email || !senha) {
      showToast("Por favor, preencha todos os campos.", "error");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = "Entrando...";

    try {
      const response = await fetch(
        `${localConfig.API_BASE_URL}/users/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Login bem-sucedido
        showToast("Login realizado com sucesso!", "success");
        localStorage.setItem("token", data.token);
        
        // Redireciona para o dashboard
        setTimeout(() => {
          window.location.href = "https://dashboard.receitasmilionarias.com.br";
        }, 1000);
      } else if (response.status === 403 && data.isPending) {
        // Usuário pendente - precisa fazer o pagamento
        showToast(
          "Seu cadastro está pendente. Redirecionando para o pagamento...",
          "info"
        );

        // Aguarda 2 segundos e inicia o checkout
        setTimeout(async () => {
          await initiateCheckout(data.userData);
        }, 2000);
      } else {
        // Outro erro
        showToast(data.message || "Erro ao fazer login.", "error");
        loginBtn.disabled = false;
        loginBtn.innerHTML = "Entrar";
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      showToast("Erro ao conectar com o servidor.", "error");
      loginBtn.disabled = false;
      loginBtn.innerHTML = "Entrar";
    }
  });

  // Função para iniciar o checkout do Stripe
  async function initiateCheckout(userData) {
    try {
      loginBtn.innerHTML = "Redirecionando...";

      const linkUrl = new URL(PAYMENT_LINK_URL);
      if (userData.email) {
        linkUrl.searchParams.set("prefilled_email", userData.email);
      }
      window.location.href = linkUrl.toString();
      return;
    } catch (error) {
      console.error("Erro ao iniciar checkout:", error);
      showToast(
        "Erro ao redirecionar para o pagamento. Tente novamente.",
        "error"
      );
      loginBtn.disabled = false;
      loginBtn.innerHTML = "Entrar";
    }
  }
});


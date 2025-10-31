// Inicializa o Stripe
const stripe = Stripe(
  "pk_live_51SMf3SIDMhvKPy02zS4MR3PQR3l2uIESt1X0qTvabJjlYPn7tuoperw30O8qq8UGaSynVfrtSpQVYNKuFLaYRlZ400m2bDaWBv"
);

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const loginBtn = document.getElementById("login-btn");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.querySelector(".toggle-password");

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
        "https://api.receitasmilionarias.com.br/users/login",
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

      const paymentResponse = await fetch(
        "https://api.receitasmilionarias.com.br/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            affiliateId: userData.affiliateId || "",
            success_url: `${window.location.origin}/site-html/pagamento-sucesso.html`,
            cancel_url: `${window.location.origin}/site-html/pagamento-cancelado.html`,
          }),
        }
      );

      if (!paymentResponse.ok) {
        throw new Error("Erro ao iniciar pagamento.");
      }

      const session = await paymentResponse.json();
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        throw new Error(error.message);
      }
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

const type = document.getElementById("ticketType");
const message = document.getElementById("message");
document.querySelectorAll("[data-type]").forEach(btn => btn.addEventListener("click", () => {
  type.value = btn.dataset.type;
  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}));
document.getElementById("pay").addEventListener("click", async () => {
  message.textContent = "Preparing secure checkout…";
  const quantity = Number(document.getElementById("quantity").value);
  const buyerEmail = document.getElementById("email").value.trim();
  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketType: type.value, quantity, buyerEmail })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Checkout could not start.");
    window.location.assign(data.url);
  } catch (e) { message.textContent = e.message; }
});
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

function getSessionId() {
  let sessionId = localStorage.getItem("chatbot_session");
  if (!sessionId) {
    sessionId =
      "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("chatbot_session", sessionId);
  }
  return sessionId;
}

const sessionId = getSessionId();

// Add message to chat
function addMessage(message, isBot = false) {
  if (typeof message !== "string") {
    console.error("addMessage: Expected string, got:", message);
    return;
  }
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isBot ? "bot-message" : "user-message"}`;
  messageDiv.innerHTML = message.replace(/\n/g, "<br>");
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTyping() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot-message";
  typingDiv.id = "typing";
  typingDiv.innerHTML =
    '<span class="loading"></span><span class="loading"></span><span class="loading"></span>';
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function hideTyping() {
  const typing = document.getElementById("typing");
  if (typing) typing.remove();
}

//handle paystack popup
function handlePaystackPopop(data) {
  const paystack = new PaystackPop();
  paystack.newTransaction({
    key: data.paymentData.publicKey,
    email: data.paymentData.email,
    amount: data.paymentData.amount,
    ref: data.paymentData.reference,
    onSuccess: async (transaction) => {
      addMessage("✅ Payment initiated! Checking status...", true);
      let attempts = 0;
      const maxAttempts = 12;
      const checkStatus = setInterval(async () => {
        attempts++;
        try {
          const verifyResponse = await fetch("/chat/check-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: transaction.reference,
              sessionId: sessionId,
            }),
          });
          const verifyData = await verifyResponse.json();
          console.log("verifyData", verifyData);
          if (verifyData.success && verifyData.status === "paid") {
            clearInterval(checkStatus);
            addMessage(verifyData.response, true);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkStatus);
            addMessage(verifyData.response, true);
          }
        } catch (error) {
          console.error("Polling error:", error);
          if (attempts >= maxAttempts) {
            clearInterval(checkStatus);
            addMessage(
              `❌ Error checking payment status. Please check your order history (type 98).\n\n` +
                `Type 'menu' to see the main menu`,
              true
            );
          }
        }
      }, 5000);
    },
    onCancel: () => {
      addMessage(
        `❌ Payment cancelled. Type 99 to try again.\n\n` +
          `Type 'menu' to see the main menu`,
        true
      );
    },
  });
}

// Send message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  // Add user message
  addMessage(message);
  messageInput.value = "";
  sendBtn.disabled = true;
  showTyping();

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        sessionId: sessionId,
      }),
    });

    const data = await response.json();
    hideTyping();

    if (data.success) {
      addMessage(data.response, true);
      if (data.paymentData) {
        handlePaystackPopop(data);
      }
    } else {
      addMessage(
        "Sorry, something went wrong. Please try again. Type 'back' to see the main menu",
        true
      );
    }
  } catch (error) {
    hideTyping();
    addMessage(
      "Connection error. Please check your internet and try again.",
      true
    );
    console.error("Error:", error);
  }

  sendBtn.disabled = false;
  messageInput.focus();
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") sendMessage();
});

// Initialize chat with welcome message
window.addEventListener("load", async function () {
  showTyping();

  try {
    const response = await fetch("/chat/init", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId: sessionId }),
    });

    const data = await response.json();
    hideTyping();

    if (data.success) {
      addMessage(data.response, true);
    }
  } catch (error) {
    hideTyping();
    addMessage(
      "Welcome! Please select an option:\n\n1 - Place an order\n99 - Checkout order\n98 - Order history\n97 - Current order\n0 - Cancel order",
      true
    );
  }

  messageInput.focus();
});

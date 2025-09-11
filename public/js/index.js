function getSessionId() {
  let sessionId = localStorage.getItem("chatbot_session");
  if (!sessionId) {
    sessionId =
      "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("chatbot_session", sessionId);
  }
  return sessionId;
}

const sessionId = getSessionId();
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// Add message to chat
function addMessage(message, isBot = false) {
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
    } else {
      addMessage("Sorry, something went wrong. Please try again.", true);
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

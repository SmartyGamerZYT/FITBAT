// FITBAT AI Fitness Coach Chatbot Assistant

class ChatbotWidget {
    constructor() {
        this.isOpen = false;
        this.messages = [];
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const drawer = document.getElementById("chatbot-drawer");
        if (this.isOpen) {
            drawer.classList.add("open");
            if (this.messages.length === 0) {
                this.addMessage("coach", "👋 **Greetings Warrior!** I am your **FITBAT AI Coach**. Ask me anything about workout routines, customized meal plans, form checks, recovery, or Battle Arena tactics!");
            }
        } else {
            drawer.classList.remove("open");
        }
    }

    async sendMessage(customText = null) {
        const input = document.getElementById("chat-input-field");
        const text = customText || input.value.trim();
        if (!text) return;

        if (!customText) input.value = "";

        this.addMessage("user", text);
        this.showTypingIndicator();

        const token = localStorage.getItem("fitbat_token");
        try {
            const res = await fetch("/api/chatbot/message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            this.removeTypingIndicator();

            if (data.reply) {
                this.addMessage("coach", data.reply);
            } else {
                this.addMessage("coach", "Keep pushing your limits! What other fitness goals can I assist with today?");
            }
        } catch (e) {
            this.removeTypingIndicator();
            this.addMessage("coach", "⚠️ Connection blip! Remember: Consistency beats intensity every single day. Keep up your daily tasks!");
        }
    }

    addMessage(sender, text) {
        const container = document.getElementById("chat-messages-container");
        if (!container) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-msg ${sender === "user" ? "user-msg" : "coach-msg"}`;

        // Basic markdown formatting: **bold** and *italic*
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/\n/g, "<br>");

        msgDiv.innerHTML = `
            <div class="msg-avatar">${sender === "user" ? "👤" : "🤖"}</div>
            <div class="msg-bubble">${formatted}</div>
        `;

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    showTypingIndicator() {
        const container = document.getElementById("chat-messages-container");
        const typingDiv = document.createElement("div");
        typingDiv.id = "chat-typing-indicator";
        typingDiv.className = "chat-msg coach-msg";
        typingDiv.innerHTML = `
            <div class="msg-avatar">🤖</div>
            <div class="msg-bubble typing-dots"><span>.</span><span>.</span><span>.</span></div>
        `;
        container.appendChild(typingDiv);
        container.scrollTop = container.scrollHeight;
    }

    removeTypingIndicator() {
        const el = document.getElementById("chat-typing-indicator");
        if (el) el.remove();
    }
}

window.chatbotWidget = new ChatbotWidget();

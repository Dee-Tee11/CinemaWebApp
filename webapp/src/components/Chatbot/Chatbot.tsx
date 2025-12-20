import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { X, Bot, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import "./Chatbot.css";

type Message = {
  role: "user" | "ai";
  content: string;
};

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const { user, isLoaded } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! I am your Cinema Assistant. How can I help you today? 🎬" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Use environment variable for backend URL
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      if (!backendUrl) {
        throw new Error("Backend URL not configured");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          message: userMessage,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error:", response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.response }]);
    } catch (error) {
      console.error("Chat error:", error);

      let errorMessage = "Sorry, I had a technical problem. Please try again! 🤖💥";

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "The request took too long. Please try again with a simpler question. ⏱️";
        } else if (error.message.includes("Backend URL")) {
          errorMessage = "Configuration error. Please contact support. ⚙️";
        } else if (error.message.includes("Server error")) {
          errorMessage = "Server is having issues. Please try again in a moment. 🔧";
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isLoaded || !isOpen) return null;

  return (
    <>
      <div className="chatbot-backdrop" onClick={onClose} />
      <div className="chatbot-modal">
        <div className="chatbot-header">
          <div className="header-title">
            <Bot size={24} className="bot-icon" />

          </div>
          <button onClick={onClose} className="shared-close-button" aria-label="Close" type="button">
            <X size={24} />
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ))}
          {isLoading && (
            <div className="message ai loading">
              <div className="chat-loading-dots">
                <span className="chat-dot"></span>
                <span className="chat-dot"></span>
                <span className="chat-dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about movies..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </>
  );
}

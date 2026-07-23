import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import './Chat.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      content: 'Hi! I\'m your AI Database Assistant. Ask me anything about the admission forms stored in the database — names, dates, contact info, and more.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'agent', content: data.response || 'Sorry, I could not process that.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'agent', content: 'Error communicating with the backend. Please check that the server is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    'List all students',
    'Who was admitted last?',
    'Show phone numbers',
  ];

  return (
    <div className="chat-wrapper">
      {/* Header */}
      <div className="chat-topbar">
        <div className="chat-agent-info">
          <div className="chat-agent-avatar">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="chat-agent-name">DB Assistant</div>
            <div className="chat-agent-status">
              <span className="status-dot status-dot-green" />
              Ready
            </div>
          </div>
        </div>
        <span className="chat-read-only-badge">Read Only</span>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-row ${msg.role}`}>
            {msg.role === 'agent' && (
              <div className="chat-avatar agent-avatar">
                <Bot size={15} />
              </div>
            )}
            <div className={`chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="chat-avatar user-avatar">
                <User size={15} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-row agent">
            <div className="chat-avatar agent-avatar">
              <Bot size={15} />
            </div>
            <div className="chat-bubble agent typing-bubble">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions — shown only before any user message */}
      {messages.length === 1 && (
        <div className="chat-suggestions">
          {suggestions.map(s => (
            <button key={s} className="suggestion-chip" onClick={() => { setInput(s); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-inputbar">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about the database…"
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          title="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

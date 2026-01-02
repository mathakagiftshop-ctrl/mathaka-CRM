import { useState, useEffect, useRef } from 'react';
import api from '../api';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Package, Sparkles, Copy, Check, Loader2 } from 'lucide-react';

export default function PackageAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your Package Assistant 🎁\n\nI can help you create gift packages based on your customer's budget. Just tell me:\n- The budget (e.g., "Rs. 10,000")\n- Who it's for (e.g., "wife", "mother", "friend")\n- Any preferences (e.g., "likes perfumes", "no chocolates")\n\nI'll suggest 3 package options with different price points, all with a healthy profit margin!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post('/ai/package-suggestions', { message: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the Gemini API is configured and try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="h-[calc(100vh-120px)] lg:h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-crm-primary rounded-xl flex items-center justify-center">
          <Sparkles className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-crm-primary">Package Assistant</h1>
          <p className="text-sm text-crm-secondary">AI-powered gift package creator</p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
              ? 'bg-crm-accent'
              : 'bg-crm-primary'
              }`}>
              {msg.role === 'user'
                ? <User className="text-crm-primary" size={16} />
                : <Bot className="text-white" size={16} />
              }
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                ? 'bg-crm-primary text-white rounded-tr-sm'
                : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-crm-border'
                }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h2: ({ children }) => <h2 className="text-lg font-bold text-crm-primary mt-2 mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold text-crm-primary mt-4 mb-2">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                        li: ({ children }) => <li className="text-gray-700">{children}</li>,
                        hr: () => <hr className="my-4 border-gray-200" />,
                        p: ({ children }) => <p className="my-2 text-gray-700">{children}</p>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
              {msg.role === 'assistant' && index > 0 && (
                <button
                  onClick={() => copyToClipboard(msg.content, index)}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  {copiedIndex === index ? (
                    <><Check size={12} /> Copied</>
                  ) : (
                    <><Copy size={12} /> Copy</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-crm-primary flex items-center justify-center">
              <Bot className="text-white" size={16} />
            </div>
            <div className="bg-gray-50 border border-crm-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="animate-spin text-crm-primary" size={20} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Create a package for my wife, budget Rs. 10,000"
          className="flex-1 px-4 py-3 border border-crm-border rounded-xl focus:outline-none focus:ring-2 focus:ring-crm-accent bg-white"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-crm-primary text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={20} />
        </button>
      </form>

      {/* Quick suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          'Budget Rs. 10,000 for wife',
          'Rs. 5,000 gift for mother',
          'Anniversary package Rs. 15,000',
          'Birthday gift Rs. 8,000'
        ].map((suggestion, i) => (
          <button
            key={i}
            onClick={() => setInput(suggestion)}
            className="text-xs px-3 py-1.5 bg-crm-accent/30 text-crm-primary rounded-full hover:bg-crm-accent font-medium transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, X, Send, Paperclip, Loader2, Info } from 'lucide-react';
import './ChatWidget.css'; // We'll create this CSS next

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Bonjour ! Je suis AssurGo AI, votre assistant virtuel. Je peux analyser vos contrats, répondre à vos questions sur les franchises, ou évaluer les dommages de votre véhicule si vous m\'envoyez une photo. Comment puis-je vous aider ?' }
  ]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        alert("Veuillez sélectionner une image.");
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const userText = input;
    const currentFile = selectedFile;

    // Add user message to UI
    let filePreviewUrl = null;
    if (currentFile) {
      filePreviewUrl = URL.createObjectURL(currentFile);
    }

    const newUserMsg = {
      role: 'user',
      text: userText,
      imageUrl: filePreviewUrl
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      let response;
      if (currentFile) {
        const formData = new FormData();
        formData.append('message', userText || "Voici l'image de mon sinistre.");
        formData.append('image', currentFile);

        // Endpoint calling the Orchestrator (RAG + Vision) for complex claims
        response = await axios.post('http://localhost:8080/api/assistant/claim', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Endpoint calling the simpler, faster Validator Assistant directly
        response = await axios.post('http://localhost:8080/api/assistant/chat', userText, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }

      setMessages(prev => [...prev, { role: 'ai', text: response.data }]);
    } catch (error) {
      console.error("Erreur lors de la communication avec l'assistant:", error);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: "❌ *Désolé, une erreur est survenue.* Le service IA est soit introuvable, soit en cours de de démarrage."
      }]);
    } finally {
      setIsLoading(false);
      // Clean up object URL if we created one
      if (filePreviewUrl) {
        // Delay revocation so image can render in chat history... 
        // Ideally we wouldn't revoke immediately or we'd load the image to DataURL instead to persist it
      }
    }
  };

  return (
    <div className={`chat-widget-container ${isOpen ? 'open' : ''}`}>
      {/* Floating Button */}
      {!isOpen && (
        <button className="chat-widget-button" onClick={() => setIsOpen(true)}>
          <MessageCircle size={28} />
          <span className="chat-widget-tooltip">Besoin d'aide ? Demandez à l'IA</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-window">
          {/* Header */}
          <div className="chat-widget-header">
            <div className="header-info">
              <div className="ai-avatar">AI</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>AssurGo Assistant</h3>
                <span style={{ fontSize: '12px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="online-indicator"></span> En ligne
                </span>
              </div>
            </div>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="chat-widget-messages">
            <div className="chat-info-banner">
              <Info size={14} />
              Géré par LangChain4j (Validator & Estimator Agents)
            </div>
            {messages.map((msg, index) => (
              <div key={index} className={`message-bubble ${msg.role}`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded attachment" className="uploaded-image-preview" />
                )}
                {msg.text && (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble ai loading">
                <Loader2 className="spinner" size={16} /> L'IA réfléchit...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Selected File Preview Box */}
          {selectedFile && (
            <div className="file-preview-area">
              <span className="file-name">{selectedFile.name} (Image jointe)</span>
              <button type="button" onClick={() => setSelectedFile(null)} className="remove-file-btn">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Area */}
          <form className="chat-widget-input" onSubmit={handleSend}>
            <label className="attachment-button" title="Joindre une photo de sinistre">
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Paperclip size={20} />
            </label>
            <input
              type="text"
              placeholder="Posez votre question ou décrivez le dommage..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="send-button" disabled={isLoading || (!input.trim() && !selectedFile)}>
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './CopilotChat.css';

/**
 * Copilot Chat Component (Enhanced with Agentic Features)
 */

interface Message {
  id: string;
  type: 'user' | 'copilot';
  text: string;
  timestamp: Date;
  metadata?: {
    contextUsed?: string[];
    suggestedNextStep?: string;
  };
}

interface CopilotChatProps {
  courseId: string;
  userName?: string;
}

const CopilotChat: React.FC<CopilotChatProps> = ({ courseId, userName = 'Learner' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'copilot',
      text: `👋 Hello ${userName}! I'm your Learning Copilot. I can help you understand concepts, suggest what to study next, recommend quizzes, and provide personalized learning tips. What would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowOptions(false);

    try {
      const response = await axios.post(
        'http://localhost:5001/api/copilot/chat',
        {
          courseId,
          message: input
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        }
      );

      const data = response.data;

      // Ensure we extract the string content if it's wrapped
      const replyText = typeof data.reply === 'string' ? data.reply :
        (data.reply?.response || JSON.stringify(data.reply));

      const copilotMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'copilot',
        text: replyText,
        timestamp: new Date(),
        metadata: {
          contextUsed: data.contextUsed,
          suggestedNextStep: data.suggestedNextStep
        }
      };

      setMessages(prev => [...prev, copilotMessage]);
    } catch (error: any) {
      console.error('Copilot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'copilot',
        text: '⚠️ Sorry, I encountered an issue. Please try again later or ask a different question.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'explain':
        setInput('Can you explain the current core concept for me?');
        break;
      case 'next-topic':
        await fetchNextTopicSuggestion();
        break;
      case 'tips':
        await fetchStudyTips();
        break;
      case 'quiz':
        await fetchQuizRecommendation();
        break;
      default:
        break;
    }
  };

  const fetchNextTopicSuggestion = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5001/api/copilot/next-topic/${courseId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        }
      );

      const copilotMessage: Message = {
        id: Date.now().toString(),
        type: 'copilot',
        text: `🎯 **Next Topic: ${response.data.nextTopic}**\n\n${response.data.reason}\n\n${response.data.weakTopics && response.data.weakTopics.length > 0 ? `Weak topics to review: ${response.data.weakTopics.join(', ')}` : 'You have no weak topics! Keep it up!'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, copilotMessage]);
    } catch (error: any) {
      console.error('Error fetching next topic:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudyTips = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5001/api/copilot/study-tips/${courseId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        }
      );

      let tipsText = '💡 **Personalized Study Tips:**\n\n';
      if (response.data.tips && Array.isArray(response.data.tips)) {
        response.data.tips.forEach((tip: any, index: number) => {
          tipsText += `${index + 1}. **${tip.title || 'Tip'}**\n   ${tip.description || tip}\n\n`;
        });
      }

      const copilotMessage: Message = {
        id: Date.now().toString(),
        type: 'copilot',
        text: tipsText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, copilotMessage]);
    } catch (error: any) {
      console.error('Error fetching study tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizRecommendation = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5001/api/copilot/quiz-recommendation/${courseId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        }
      );

      let recommendationText: string;
      if (response.data.action === 'CREATE_QUIZ') {
        recommendationText = `📝 **Recommended Quiz**\n\nTopic: **${response.data.recommendedTopic}**\nDifficulty: **${response.data.suggestedDifficulty}**\nQuestions: **${response.data.questionCount}**\n\n${response.data.message}`;
      } else if (response.data.quiz) {
        recommendationText = `📝 **Take This Quiz**\n\n**${response.data.quiz.title}**\nTopic: ${response.data.quiz.topic}\nDifficulty: ${response.data.quiz.difficulty}\n\n${response.data.reason}`;
      } else {
        recommendationText = "I don't have a specific quiz recommendation right now. Keep studying!";
      }

      const copilotMessage: Message = {
        id: Date.now().toString(),
        type: 'copilot',
        text: recommendationText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, copilotMessage]);
    } catch (error: any) {
      console.error('Error fetching quiz recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="copilot-chat-container">
      <div className="copilot-header">
        <h2>🤖 Learning Copilot Chat</h2>
        <p>Your agentic mentor - Aware of your progress</p>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-content">
              {message.type === 'copilot' && <span className="icon">🤖</span>}
              {message.type === 'user' && <span className="icon">👤</span>}
              <div className="text">
                {message.text.split('\n').map((line, idx) => (
                  <p key={idx} style={{ marginBottom: idx === message.text.split('\n').length - 1 ? 0 : '0.5rem' }}>
                    {line}
                  </p>
                ))}
                {message.metadata?.suggestedNextStep && (
                  <div className="mt-3 pt-2 border-t border-gray-100 text-xs font-semibold text-blue-600">
                    🎯 Next Step: {message.metadata.suggestedNextStep}
                  </div>
                )}
                {message.metadata?.contextUsed && message.metadata.contextUsed.length > 0 && (
                  <div className="mt-1 text-[10px] text-gray-400 italic">
                    Sources: {message.metadata.contextUsed.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <span className="timestamp">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {loading && (
          <div className="message message-loading">
            <div className="loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Copilot is thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showOptions && (
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button
              className="action-btn"
              onClick={() => handleQuickAction('next-topic')}
            >
              📌 What should I study next?
            </button>
            <button
              className="action-btn"
              onClick={() => handleQuickAction('explain')}
            >
              📖 Explain concept
            </button>
            <button
              className="action-btn"
              onClick={() => handleQuickAction('tips')}
            >
              💡 Study tips
            </button>
            <button
              className="action-btn"
              onClick={() => handleQuickAction('quiz')}
            >
              ✏️ Recommend quiz
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading}
            className="chat-input"
          />
          <button type="submit" disabled={loading || !input.trim()} className="send-btn">
            {loading ? '⏳' : '📤'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CopilotChat;

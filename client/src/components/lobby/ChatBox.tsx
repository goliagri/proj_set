/**
 * ChatBox Component
 *
 * Simple chat interface for lobby and in-game communication.
 */

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, Player } from '@projective-set/shared';
import './ChatBox.css';

interface ChatBoxProps {
  /** Chat messages to display */
  messages: ChatMessage[];
  /** Called when user sends a message */
  onSendMessage: (content: string) => void;
  /** Players for color lookup */
  players?: Player[];
}

export function ChatBox({ messages, onSendMessage, players = [] }: ChatBoxProps) {
  // Build a map of playerId -> color for quick lookup
  const playerColors = new Map(players.map(p => [p.id, p.color]));
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-box__messages">
        {messages.length === 0 ? (
          <p className="chat-box__empty">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="chat-box__message">
              <span
                className="chat-box__author"
                style={{ color: playerColors.get(msg.playerId) || 'inherit' }}
              >
                {msg.playerName}:
              </span>
              <span className="chat-box__content">{msg.content}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-box__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="chat-box__input"
        />
        <button type="submit" className="btn btn-primary chat-box__send">
          Send
        </button>
      </form>
    </div>
  );
}

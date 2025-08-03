/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, {useState, useEffect, useRef, FormEvent} from 'react';
import {GoogleGenAI, Chat} from '@google/genai';
import {PaperAirplaneIcon, SparklesIcon} from './components/icons';

// --- Gemini AI Configuration ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const systemInstruction =
  'Tum ek expert assistant ho jo customer ko Capital Spindles ke products ke features samjhata hai, unki problem solve karta hai aur unhe suitable model suggest karta hai.';

// --- Type Definitions ---
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

// --- Main App Component ---
export const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize chat session on component mount
  useEffect(() => {
    const initChat = () => {
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {systemInstruction},
      });
      chatRef.current = chat;
      setMessages([
        {
          id: self.crypto.randomUUID(),
          text: 'Hello! How can I help you with Capital Spindles products today?',
          sender: 'bot',
        },
      ]);
    };
    initChat();
    inputRef.current?.focus();
  }, []);

  // Scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle message submission
  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userInput = formData.get('message') as string;

    if (!userInput.trim() || isLoading) return;
    e.currentTarget.reset();
    inputRef.current?.focus();

    const userMessage: Message = {
      id: self.crypto.randomUUID(),
      text: userInput,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const botMessageId = self.crypto.randomUUID();
    // Add a placeholder for the bot's response
    setMessages((prev) => [
      ...prev,
      {id: botMessageId, text: '', sender: 'bot'},
    ]);

    try {
      if (!chatRef.current) {
        throw new Error('Chat not initialized');
      }
      const stream = await chatRef.current.sendMessageStream({
        message: userInput,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? {...msg, text: fullResponse} : msg,
          ),
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text: `Sorry, I encountered an error. Please try again. \n> ${errorMessage}`,
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="p-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm shadow-sm">
        <h1 className="text-xl font-bold text-center text-white flex items-center justify-center gap-2">
          <SparklesIcon className="w-6 h-6 text-purple-400" />
          <span>Capital Spindles Assistant</span>
        </h1>
      </header>

      <main
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 chat-history">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}>
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-purple-500/50 flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-5 h-5 text-purple-300" />
              </div>
            )}
            <div
              className={`max-w-xl p-3 rounded-2xl shadow whitespace-pre-wrap animate-fade-in ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-lg'
                  : `bg-gray-700 text-gray-200 rounded-bl-lg ${
                      isLoading && index === messages.length - 1
                        ? 'typing-cursor'
                        : ''
                    }`
              }`}>
              {msg.text || '\u00A0'}
            </div>
          </div>
        ))}
      </main>

      <footer className="p-4 border-t border-gray-700/50 bg-gray-900">
        <form
          onSubmit={handleSendMessage}
          className="mx-auto max-w-2xl flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            name="message"
            placeholder={isLoading ? 'Thinking...' : 'Ask about our products...'}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
            disabled={isLoading}
            autoComplete="off"
            aria-label="Your message"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            aria-label="Send message">
            <PaperAirplaneIcon className="w-6 h-6" />
          </button>
        </form>
      </footer>
    </div>
  );
};

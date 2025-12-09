'use client';

import { useState } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, input]);
      setInput('');
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-16 lg:px-24 lg:py-24">
      {/* Header is rendered by layout.js */}
      <div className="flex flex-col py-12 lg:flex-row lg:py-0">
        <div className="mb-6 w-full rounded-lg bg-gray-900 p-6 shadow-lg lg:mb-0 lg:w-1/4">
          <h2 className="mb-4 text-xl font-bold text-white">RAGESTATE</h2>
          <ul className="text-gray-400">
            <li className="mb-2">Profile</li>
            <li className="mb-2">My Events</li>
            <li className="mb-2">Settings</li>
          </ul>
        </div>
        <div className="chat w-full rounded-lg bg-gray-900 p-6 shadow-lg lg:ml-6 lg:w-3/4">
          <h2 className="mb-4 text-2xl font-bold text-white">Chat</h2>
          <div className="messages mb-4 h-64 overflow-y-scroll rounded-lg bg-gray-800 p-4">
            {messages.map((msg, index) => (
              <div key={index} className="mb-2 text-gray-300">
                {msg}
              </div>
            ))}
          </div>
          <div className="input-group flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow rounded-l-lg bg-gray-700 p-2 text-white"
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              className="rounded-r-lg bg-red-600 p-2 text-white hover:bg-red-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

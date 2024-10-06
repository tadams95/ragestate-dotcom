"use client";

import React, { useState } from "react";
import Header from "../components/Header";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, input]);
      setInput("");
    }
  };

  return (
    <div className="py-8 px-4 sm:py-16 sm:px-6  lg:py-24 lg:px-24">
      <Header />
      <div className="flex flex-col lg:py-0 py-12 lg:flex-row">
        <div className="w-full lg:w-1/4 p-6 bg-gray-900 rounded-lg shadow-lg mb-6 lg:mb-0">
          <h2 className="text-xl font-bold text-white mb-4">RAGESTATE</h2>
          <ul className="text-gray-400">
            <li className="mb-2">Profile</li>
            <li className="mb-2">My Events</li>
            <li className="mb-2">Settings</li>
          </ul>
        </div>
        <div className="w-full lg:w-3/4 lg:ml-6 chat p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Chat</h2>
          <div className="messages mb-4 h-64 overflow-y-scroll bg-gray-700 p-4 rounded-lg">
            {messages.map((msg, index) => (
              <div key={index} className="text-white mb-2">
                {msg}
              </div>
            ))}
          </div>
          <div className="input-group flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow p-2 rounded-l-lg bg-gray-600 text-white"
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              className="p-2 bg-gray-900 text-white rounded-r-lg hover:bg-red-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

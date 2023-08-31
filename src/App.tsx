import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          This will be the new RAGESTATE website built in TypeScript
        </p>
        <a
          className="App-link"
          href="https://www.ragestate.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Link to existing site
        </a>
      </header>
    </div>
  );
}

export default App;

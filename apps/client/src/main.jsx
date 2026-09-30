import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Clean console across development & production
if (typeof window !== 'undefined') {
  const isDebug = window.location.search.includes('debug=true') || localStorage.getItem('debug') === 'true';
  if (!isDebug) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.warn = noop;
    console.error = noop;
  }
}

import { ThemeProvider } from './context/ThemeContext';
import { AuthContextProvider } from './context/AuthContext';

import { BranchProvider } from './context/BranchContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* ❌ BrowserRouter yahan se HATA DO */}
      <AuthContextProvider>
       
           <BranchProvider>
          <App />
          </BranchProvider>
       
      </AuthContextProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
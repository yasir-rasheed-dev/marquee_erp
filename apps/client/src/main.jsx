import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

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
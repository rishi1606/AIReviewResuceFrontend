import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Remove all console outputs across the entire frontend
const noop = () => {};
console.log = noop;
console.info = noop;
console.warn = noop;
console.debug = noop;
console.error = noop;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

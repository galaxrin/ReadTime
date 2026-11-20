import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './fonts.css'
import { desktop } from './utils/desktop'

window.desktop = desktop

const rootElement = document.getElementById('root')

if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Error rendering React app:', error)
    rootElement.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error + '</div>'
  }
} else {
  console.error('Root element not found')
  document.body.innerHTML = '<div style="color: white; padding: 20px; background: #1a1a1a;">Root element not found</div>'
}

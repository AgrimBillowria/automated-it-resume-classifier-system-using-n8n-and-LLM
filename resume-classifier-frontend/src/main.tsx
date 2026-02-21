import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// #region agent log
fetch('http://127.0.0.1:7242/ingest/3f4a49a6-6637-4ac7-8d83-4712f4ccc879',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx',message:'App root rendering',data:{hasRoot:!!document.getElementById('root')},timestamp:Date.now(),hypothesisId:'H2',runId:'run1'})}).catch(()=>{});
// #endregion
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

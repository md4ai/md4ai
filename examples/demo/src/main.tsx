import { createRoot } from 'react-dom/client';
import App from './App.js';
import './styles.css';
import 'highlight.js/styles/github.css';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);

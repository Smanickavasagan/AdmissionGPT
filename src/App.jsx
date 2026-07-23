import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PageTransition from './components/PageTransition';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import { useEffect } from 'react';
import { useStore } from './store/useStore';

export default function App() {
  const { fetchDocuments } = useStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <main className="page-content">
            <PageTransition>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/chat" element={<Chat />} />
              </Routes>
            </PageTransition>
          </main>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: 'white' },
          },
        }}
      />
    </BrowserRouter>
  );
}

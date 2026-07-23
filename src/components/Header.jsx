
import { useLocation } from 'react-router-dom';
import './Header.css';

const pageTitles = {
  '/': 'Dashboard',
  '/upload': 'Upload & Process',
  '/ocr-preview': 'OCR Preview & Validation',
  '/documents': 'Document Management',
  '/json-editor': 'JSON Editor & Mapping',
  '/db-sync': 'DB Sync & History',
  '/analytics': 'Analytics & Reports',
  '/settings': 'Settings & Configuration',
};

export default function Header() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'AdmissionScan';

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

    </header>
  );
}

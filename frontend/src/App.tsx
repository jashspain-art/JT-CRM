import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ContactList from './components/ContactList'
import ContactDetail from './components/ContactDetail'
import CompanyList from './components/CompanyList'
import CompanyDetail from './components/CompanyDetail'
import LeadResearch from './components/LeadResearch'
import CommandPalette from './components/CommandPalette'
import { ToastProvider } from './components/Toast'

function ContactsPage() {
  const navigate = useNavigate();
  return <ContactList onSelect={id => navigate(`/contacts/${id}`)} />;
}

function ContactDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  return <ContactDetail contactId={Number(id)} onBack={() => navigate('/contacts')} />;
}

function CompaniesPage() {
  const navigate = useNavigate();
  return <CompanyList onSelect={id => navigate(`/companies/${id}`)} />;
}

function ResearchPage() {
  return <LeadResearch />;
}

function CompanyDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  return <CompanyDetail companyId={Number(id)} onBack={() => navigate('/companies')} />;
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const commands = [
    { id: 'go-dash', label: 'Go to Dashboard', category: 'Navigation', action: () => navigate('/') },
    { id: 'go-contacts', label: 'Go to Contacts', category: 'Navigation', action: () => navigate('/contacts') },
    { id: 'go-companies', label: 'Go to Companies', category: 'Navigation', action: () => navigate('/companies') },
    { id: 'go-research', label: 'Go to Lead Research', category: 'Navigation', action: () => navigate('/research') },
    { id: 'add-contact', label: 'Add New Contact', category: 'Actions', action: () => navigate('/contacts/0') },
    { id: 'add-company', label: 'Add New Company', category: 'Actions', action: () => navigate('/companies/0') },
    { id: 'open-cmd', label: 'Open Command Palette', category: 'System', action: () => setCmdOpen(true) },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading JT CRM...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/contacts', label: 'Contacts' },
    { path: '/companies', label: 'Companies' },
    { path: '/research', label: 'Research' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <h1 className="text-lg font-bold text-gray-900">JT CRM</h1>
              <nav className="flex gap-1">
                {navItems.map(item => (
                  <button key={item.path} onClick={() => navigate(item.path)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                      ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => setCmdOpen(true)} className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">
                Ctrl+K
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Layout />
    </ToastProvider>
  )
}

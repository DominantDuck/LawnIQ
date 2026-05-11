'use client';

import { useState, useEffect } from 'react';
import { User, MapPin, TrendingUp, FileText, BarChart3, Settings, ArrowLeft, X } from 'lucide-react';
import ContactManagement from '../contacts/ContactManagement';
import useCRMStore from '../../store/useCRMStore';

/**
 * CRMLayout Component
 * Main CRM interface with sidebar navigation
 */
export default function CRMLayout({ isOpen, onClose, onViewContactProperty, entryMode = 'full' }) {
  const { user } = useCRMStore();
  const [activeSection, setActiveSection] = useState('contacts');
  const isQuickContactCreate = entryMode === 'quickContactCreate';

  useEffect(() => {
    if (isOpen && isQuickContactCreate) {
      setActiveSection('contacts');
    }
  }, [isOpen, isQuickContactCreate]);

  const crmSections = [
    {
      id: 'contacts',
      label: 'Contacts',
      icon: User,
      description: 'Manage your client contacts',
      component: () => (
        <ContactManagement
          onViewContactProperty={onViewContactProperty}
          quickContactCreate={isQuickContactCreate}
          onQuickFlowDone={onClose}
        />
      )
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: MapPin,
      description: 'Property management',
      component: () => <div className="coming-soon">Property management coming soon...</div>
    },
    {
      id: 'leads',
      label: 'Lead Pipeline',
      icon: TrendingUp,
      description: 'Track leads and opportunities',
      component: () => <div className="coming-soon">Lead pipeline coming soon...</div>
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FileText,
      description: 'Measurement projects',
      component: () => <div className="coming-soon">Project management coming soon...</div>
    },
    {
      id: 'quotes',
      label: 'Quotes',
      icon: BarChart3,
      description: 'Quote generation and tracking',
      component: () => <div className="coming-soon">Quote management coming soon...</div>
    }
  ];

  const activeTab = crmSections.find(section => section.id === activeSection);
  const ActiveComponent = activeTab?.component || ContactManagement;

  if (!isOpen) return null;

  return (
    <div className="crm-layout">
      <div className="crm-overlay" onClick={onClose} />

      <div className={`crm-container ${isQuickContactCreate ? 'crm-container--quick-contact' : ''}`}>
        {/* Sidebar */}
        {!isQuickContactCreate && (
        <div className="crm-sidebar">
          {/* Header */}
          <div className="sidebar-header">
            <div className="crm-brand">
              <div className="brand-icon">🏡</div>
              <div className="brand-text">
                <h2>SwiftQuote CRM</h2>
                <p>Welcome, {user?.first_name}</p>
              </div>
            </div>
            <button className="close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            <h3 className="nav-title">CRM Modules</h3>
            <ul className="nav-list">
              {crmSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isComingSoon = section.id !== 'contacts';

                return (
                  <li key={section.id}>
                    <button
                      className={`nav-item ${isActive ? 'active' : ''} ${isComingSoon ? 'coming-soon' : ''}`}
                      onClick={() => setActiveSection(section.id)}
                      disabled={isComingSoon}
                      title={isComingSoon ? 'Coming Soon' : section.description}
                    >
                      <Icon size={20} />
                      <div className="nav-item-content">
                        <span className="nav-item-label">{section.label}</span>
                        <span className="nav-item-desc">{section.description}</span>
                        {isComingSoon && <span className="coming-soon-badge">Soon</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Back to Map */}
          <div className="sidebar-footer">
            <button className="back-button" onClick={onClose}>
              <ArrowLeft size={18} />
              <span>Back to Map</span>
            </button>
          </div>
        </div>
        )}

        {/* Main Content */}
        <div className={`crm-main ${isQuickContactCreate ? 'crm-main--quick-contact' : ''}`}>
          {isQuickContactCreate ? (
            <div className="section-header section-header--quick">
              <div className="section-info">
                <User size={28} />
                <div>
                  <h1>New contact</h1>
                  <p>Save a contact to link your measurement. Address is pre-filled when available.</p>
                </div>
              </div>
              <button type="button" className="close-button quick-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="section-header">
              <div className="section-info">
                {activeTab && (
                  <>
                    <activeTab.icon size={28} />
                    <div>
                      <h1>{activeTab.label}</h1>
                      <p>{activeTab.description}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Section Content */}
          <div className={`section-content ${isQuickContactCreate ? 'section-content--quick' : ''}`}>
            <ActiveComponent />
          </div>
        </div>
      </div>

      <style jsx>{`
        .crm-layout {
          position: fixed;
          inset: 0;
          z-index: 1020;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crm-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
        }

        .crm-container {
          position: relative;
          width: 95vw;
          height: 90vh;
          max-width: 1400px;
          background: var(--surface-raised);
          border-radius: 20px;
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.2);
          display: flex;
          overflow: hidden;
          animation: slideIn 400ms cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        .crm-container--quick-contact {
          max-width: 560px;
          width: 92vw;
          height: auto;
          max-height: 90vh;
        }

        .crm-main--quick-contact {
          width: 100%;
        }

        .section-header--quick {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
        }

        .section-header--quick .section-info {
          flex: 1;
          min-width: 0;
        }

        .section-header--quick .quick-close {
          flex-shrink: 0;
          margin-top: 0.25rem;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.06);
          border: none;
          border-radius: 8px;
          color: var(--ink-muted);
          cursor: pointer;
        }

        .section-header--quick .quick-close:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }

        .section-content--quick {
          padding: 0 1.5rem 1.5rem;
        }

        .crm-sidebar {
          width: 300px;
          background: linear-gradient(145deg, var(--green-50), var(--green-100));
          border-right: 1px solid rgba(74, 138, 24, 0.1);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sidebar-header {
          padding: 2rem;
          border-bottom: 1px solid rgba(74, 138, 24, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .crm-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .brand-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--green-500), var(--green-500));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .brand-text h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--green-700);
          line-height: 1.2;
        }

        .brand-text p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--green-700);
          opacity: 0.8;
        }

        .close-button {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.6);
          border: none;
          border-radius: 8px;
          color: var(--green-700);
          cursor: pointer;
          transition: all 200ms ease;
        }

        .close-button:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }

        .sidebar-nav {
          flex: 1;
          padding: 2rem 1rem;
          overflow-y: auto;
        }

        .nav-title {
          margin: 0 0 1rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--green-700);
          opacity: 0.7;
        }

        .nav-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          padding: 1rem;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--green-700);
          cursor: pointer;
          transition: all 200ms ease;
          text-align: left;
          position: relative;
        }

        .nav-item:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.6);
          transform: translateY(-1px);
        }

        .nav-item.active {
          background: rgba(255, 255, 255, 0.9);
          color: var(--green-700);
          box-shadow: 0 4px 12px rgba(74, 138, 24, 0.15);
        }

        .nav-item.coming-soon {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-item-content {
          flex: 1;
          min-width: 0;
        }

        .nav-item-label {
          display: block;
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .nav-item-desc {
          display: block;
          font-size: 0.75rem;
          opacity: 0.7;
          line-height: 1.3;
        }

        .coming-soon-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          padding: 0.125rem 0.5rem;
          background: var(--green-200);
          color: var(--green-700);
          font-size: 0.625rem;
          font-weight: 600;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(74, 138, 24, 0.1);
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--green-500);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .back-button:hover {
          background: var(--green-700);
          transform: translateY(-1px);
        }

        .crm-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--surface);
        }

        .section-header {
          padding: 2rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          background: var(--surface-raised);
        }

        .section-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .section-info svg {
          color: var(--green-500);
        }

        .section-info h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.2;
        }

        .section-info p {
          margin: 0;
          font-size: 0.9375rem;
          color: var(--ink-muted);
        }

        .section-content {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }

        .coming-soon {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 1.125rem;
          color: var(--ink-muted);
          text-align: center;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .crm-container {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
            flex-direction: column;
          }

          .crm-sidebar {
            width: 100%;
            height: auto;
            min-height: 200px;
            background: var(--green-50);
          }

          .sidebar-header {
            padding: 1rem;
          }

          .sidebar-nav {
            padding: 1rem;
          }

          .nav-list {
            flex-direction: row;
            overflow-x: auto;
            gap: 0.75rem;
          }

          .nav-item {
            min-width: 120px;
            flex-direction: column;
            text-align: center;
            padding: 0.75rem;
            gap: 0.5rem;
          }

          .nav-item-content {
            text-align: center;
          }

          .nav-item-desc {
            display: none;
          }

          .coming-soon-badge {
            position: static;
            margin-top: 0.25rem;
          }

          .sidebar-footer {
            display: none;
          }

          .section-header {
            padding: 1rem;
          }

          .section-content {
            padding: 1rem;
          }

          .section-info h1 {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .brand-text h2 {
            font-size: 1rem;
          }

          .section-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .section-info svg {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
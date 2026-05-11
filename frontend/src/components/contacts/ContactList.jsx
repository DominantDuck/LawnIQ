'use client';

import { useState } from 'react';
import { Search, Plus, User, Mail, Phone, MapPin, MoreVertical, Edit3, Trash2, Eye, RefreshCw } from 'lucide-react';
import useCRMStore from '../../store/useCRMStore';

// GLOBAL FLAG to prevent infinite loops across ALL ContactList instances
let CONTACTS_MANUALLY_LOADED = false;

/**
 * ContactList Component - INFINITE LOOP PROOF VERSION
 * NO automatic loading, NO useEffects that could trigger API calls
 * Everything is 100% manual user action only
 */
export default function ContactList({ onContactSelect, onContactCreate, onContactEdit }) {
  const { contacts, deleteContactAPI, setSelectedContact } = useCRMStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showManualLoad, setShowManualLoad] = useState(!CONTACTS_MANUALLY_LOADED);

  // ONLY MANUAL FUNCTIONS - NO AUTOMATIC TRIGGERS

  const loadContacts = async (search = '') => {
    console.log('🔍 Manual load requested for:', search);
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search: search.trim(),
        limit: '50',
        offset: '0'
      });

      const response = await fetch(`/api/contacts?${params}`);
      const data = await response.json();

      if (response.ok) {
        useCRMStore.setState({
          contacts: data.contacts || [],
          contactsLoading: false,
          contactsError: null
        });
        setShowManualLoad(false);
        CONTACTS_MANUALLY_LOADED = true;
        console.log('✅ Loaded', data.contacts?.length || 0, 'contacts');
      } else {
        setError(data.error || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('❌ Contact fetch error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (CONTACTS_MANUALLY_LOADED) {
      loadContacts(searchTerm);
    }
  };

  const handleRefresh = () => {
    CONTACTS_MANUALLY_LOADED = false;
    setShowManualLoad(false);
    loadContacts(searchTerm);
  };

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    if (onContactSelect) {
      onContactSelect(contact);
    }
  };

  const handleEditContact = (contact, e) => {
    e?.stopPropagation();
    setActiveDropdown(null);
    if (onContactEdit) {
      onContactEdit(contact);
    }
  };

  const handleDeleteContact = async (contact, e) => {
    e?.stopPropagation();
    setActiveDropdown(null);

    if (!confirm(`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This action cannot be undone.`)) {
      return;
    }

    await deleteContactAPI(contact.id);
  };

  const handleDropdownToggle = (contactId, e) => {
    e?.stopPropagation();
    setActiveDropdown(activeDropdown === contactId ? null : contactId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="contact-list">
      {/* Header */}
      <div className="contact-list-header">
        <div className="header-left">
          <h2 className="section-title">
            <User size={24} />
            Contacts
            <span className="contact-count">({contacts.length})</span>
          </h2>
        </div>
        <div className="header-actions">
          {CONTACTS_MANUALLY_LOADED && (
            <button
              className="button secondary"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh contacts"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            className="button primary"
            onClick={onContactCreate}
            disabled={isLoading}
          >
            <Plus size={18} />
            Add Contact
          </button>
        </div>
      </div>

      {/* Manual Load Prompt */}
      {showManualLoad && (
        <div className="manual-load-state">
          <div className="load-prompt">
            <User size={48} className="load-icon" />
            <h3>Load Contacts</h3>
            <p>Click below to load your contact list and start managing your CRM.</p>
            <button
              className="button primary"
              onClick={() => loadContacts()}
              disabled={isLoading}
            >
              <User size={18} />
              {isLoading ? 'Loading...' : 'Load Contacts'}
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {!showManualLoad && (
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            name="contactSearch"
            id="contactSearch"
            placeholder="Search contacts by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={isLoading}
            title="Search contacts"
          >
            <Search size={16} />
          </button>
        </div>
      )}

      {/* Error State */}
      {!showManualLoad && error && (
        <div className="error-message">
          <span>Failed to load contacts: {error}</span>
          <button
            className="retry-button"
            onClick={() => loadContacts(searchTerm)}
            disabled={isLoading}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading contacts...</span>
        </div>
      )}

      {/* Empty State */}
      {!showManualLoad && !isLoading && !error && contacts.length === 0 && (
        <div className="empty-state">
          {searchTerm ? (
            <>
              <Search size={48} className="empty-icon" />
              <h3>No contacts found</h3>
              <p>{`No contacts match your search for "${searchTerm}"`}</p>
              <button
                className="button secondary"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <User size={48} className="empty-icon" />
              <h3>No contacts yet</h3>
              <p>Start building your contact list by adding your first contact.</p>
              <button
                className="button primary"
                onClick={onContactCreate}
              >
                <Plus size={18} />
                Add Your First Contact
              </button>
            </>
          )}
        </div>
      )}

      {/* Contacts Grid */}
      {!showManualLoad && !isLoading && contacts.length > 0 && (
        <div className="contacts-grid">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="contact-card"
              onClick={() => handleContactClick(contact)}
              title={contact.address ? `Click to view property map for ${contact.first_name} ${contact.last_name}` : `View contact details for ${contact.first_name} ${contact.last_name}`}
            >
              {/* Contact Avatar */}
              <div className="contact-avatar">
                {getInitials(contact.first_name, contact.last_name)}
              </div>

              {/* Contact Info */}
              <div className="contact-info">
                <h3 className="contact-name">
                  {contact.first_name} {contact.last_name}
                </h3>

                {contact.email && (
                  <div className="contact-detail">
                    <Mail size={14} />
                    <span>{contact.email}</span>
                  </div>
                )}

                {contact.phone && (
                  <div className="contact-detail">
                    <Phone size={14} />
                    <span>{contact.phone}</span>
                  </div>
                )}

                {contact.address && (
                  <div className="contact-detail">
                    <MapPin size={14} />
                    <span className="contact-address" title={contact.address}>{contact.address}</span>
                  </div>
                )}

                <div className="contact-meta">
                  <span>Added {formatDate(contact.created_at)}</span>
                </div>
              </div>

              {/* Actions Menu */}
              <div className="contact-actions">
                <button
                  className="action-button"
                  onClick={(e) => handleDropdownToggle(contact.id, e)}
                  aria-label="Contact options"
                >
                  <MoreVertical size={16} />
                </button>

                {activeDropdown === contact.id && (
                  <>
                    <div
                      className="dropdown-overlay"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(null);
                      }}
                    />
                    <div className="dropdown-menu">
                      <button
                        className="dropdown-item"
                        onClick={(e) => handleContactClick(contact)}
                      >
                        <Eye size={14} />
                        View Property Map
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={(e) => handleEditContact(contact, e)}
                      >
                        <Edit3 size={14} />
                        Edit Contact
                      </button>
                      <button
                        className="dropdown-item danger"
                        onClick={(e) => handleDeleteContact(contact, e)}
                      >
                        <Trash2 size={14} />
                        Delete Contact
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .contact-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: 100%;
        }

        .contact-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ink);
        }

        .contact-count {
          font-size: 1rem;
          font-weight: 500;
          color: var(--ink-muted);
        }

        .manual-load-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          flex: 1;
        }

        .load-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
        }

        .load-icon {
          color: var(--green-500);
          margin-bottom: 0.5rem;
        }

        .load-prompt h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--ink);
        }

        .load-prompt p {
          margin: 0;
          color: var(--ink-muted);
          max-width: 300px;
          line-height: 1.5;
        }

        .search-bar {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--ink-faint);
          pointer-events: none;
        }

        .search-bar input {
          flex: 1;
          padding: 0.875rem 1rem 0.875rem 3rem;
          border: 2px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          font-size: 0.875rem;
          background: var(--surface-raised);
          color: var(--ink);
          transition: all 200ms ease;
        }

        .search-bar input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(90, 166, 32, 0.1);
        }

        .search-bar input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .search-button {
          padding: 0.875rem 1rem;
          background: var(--green-700);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 200ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
        }

        .search-button:hover:not(:disabled) {
          background: var(--green-500);
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .retry-button {
          padding: 0.5rem 1rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .retry-button:hover {
          background: #b91c1c;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 3rem;
          color: var(--ink-muted);
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(74, 138, 24, 0.2);
          border-top: 2px solid var(--green-500);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 4rem 2rem;
          gap: 1rem;
        }

        .empty-icon {
          color: var(--ink-faint);
          margin-bottom: 0.5rem;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--ink);
        }

        .empty-state p {
          margin: 0;
          color: var(--ink-muted);
          max-width: 300px;
          line-height: 1.5;
        }

        .contacts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
          flex: 1;
        }

        .contact-card {
          position: relative;
          padding: 1.5rem;
          background: var(--surface-raised);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 200ms ease;
          display: flex;
          gap: 1rem;
        }

        .contact-card:hover {
          background: var(--surface);
          border-color: var(--green-200);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .contact-card:hover .contact-name {
          color: var(--green-700);
        }

        .contact-card:hover .contact-avatar {
          background: var(--green-500);
          transform: scale(1.05);
        }

        .contact-avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--green-700);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .contact-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          min-width: 0;
        }

        .contact-name {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.3;
        }

        .contact-detail {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--ink-muted);
        }

        .contact-detail svg {
          color: var(--ink-faint);
          flex-shrink: 0;
        }

        .contact-address {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .contact-meta {
          font-size: 0.75rem;
          color: var(--ink-faint);
          margin-top: auto;
        }

        .contact-actions {
          position: relative;
        }

        .action-button {
          padding: 0.5rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--ink-faint);
          cursor: pointer;
          transition: all 200ms ease;
          flex-shrink: 0;
        }

        .action-button:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--ink-muted);
        }

        .dropdown-overlay {
          position: fixed;
          inset: 0;
          z-index: 10;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          min-width: 160px;
          background: var(--surface-raised);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          z-index: 20;
          overflow: hidden;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          font-size: 0.875rem;
          color: var(--ink);
          cursor: pointer;
          transition: all 200ms ease;
          text-align: left;
        }

        .dropdown-item:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        .dropdown-item.danger {
          color: #dc2626;
        }

        .dropdown-item.danger:hover {
          background: rgba(239, 68, 68, 0.08);
        }

        .button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms ease;
          text-decoration: none;
        }

        .button.primary {
          background: var(--green-700);
          color: white;
          box-shadow: 0 2px 8px rgba(74, 138, 24, 0.2);
        }

        .button.primary:hover:not(:disabled) {
          background: var(--green-500);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 138, 24, 0.3);
        }

        .button.secondary {
          background: var(--surface-raised);
          color: var(--ink);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .button.secondary:hover:not(:disabled) {
          background: var(--surface);
          transform: translateY(-1px);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .contacts-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .contact-list-header {
            flex-direction: column;
            align-items: stretch;
          }

          .contact-card {
            padding: 1rem;
          }

          .section-title {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
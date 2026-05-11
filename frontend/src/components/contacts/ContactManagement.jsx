'use client';

import { useState, useEffect } from 'react';
import { MapPin, ArrowRight, User } from 'lucide-react';
import ContactList from './ContactList';
import ContactForm from './ContactForm';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

/**
 * ContactManagement Component
 * Main interface for managing contacts - combines list and form
 */
export default function ContactManagement({
  onViewContactProperty,
  quickContactCreate = false,
  onQuickFlowDone
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showPendingPrompt, setShowPendingPrompt] = useState(false);
  const [contactFormInitialData, setContactFormInitialData] = useState(null);

  const {
    pendingMeasurement,
    loadPendingMeasurement,
    associatePendingMeasurement,
    clearPendingMeasurement
  } = useCRMStore();

  const { addNotification } = useAppStore();

  const handleCreateContact = () => {
    setEditingContact(null);
    setContactFormInitialData(null);
    setShowForm(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setContactFormInitialData(null);
    if (quickContactCreate) {
      clearPendingMeasurement();
      onQuickFlowDone?.();
    }
  };

  const handleFormSuccess = async (contact) => {
    if (quickContactCreate && contact?.id) {
      const pm = useCRMStore.getState().pendingMeasurement;
      if (pm) {
        try {
          const project = await associatePendingMeasurement(contact.id);
          const areaText =
            project.polygon_count > 1
              ? `${project.polygon_count} areas (${Math.round(project.total_area_sqft).toLocaleString()} sq ft total)`
              : `${Math.round(project.total_area_sqft).toLocaleString()} sq ft`;
          addNotification({
            type: 'success',
            title: 'Measurement linked',
            message: `${areaText} linked to ${contact.first_name} ${contact.last_name}`
          });
        } catch (error) {
          addNotification({
            type: 'error',
            title: 'Could not link measurement',
            message: error.message || 'Try again from the map.'
          });
        }
      }
    }
  };

  // Load pending measurement once when this surface mounts (CRM just opened).
  useEffect(() => {
    const pending = loadPendingMeasurement();
    if (!pending) {
      if (quickContactCreate) {
        onQuickFlowDone?.();
      }
      return;
    }
    if (quickContactCreate) {
      setShowPendingPrompt(false);
      setEditingContact(null);
      setContactFormInitialData(
        pending.address ? { address: pending.address } : null
      );
      setShowForm(true);
    } else {
      setShowPendingPrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quickContactCreate fixed for this CRM open
  }, []);

  const handleContactSelect = async (contact) => {
    // If there's a pending measurement, associate it with this contact
    if (pendingMeasurement) {
      try {
        const project = await associatePendingMeasurement(contact.id);

        const areaText = project.polygon_count > 1
          ? `${project.polygon_count} areas (${Math.round(project.total_area_sqft).toLocaleString()} sq ft total)`
          : `${Math.round(project.total_area_sqft).toLocaleString()} sq ft`;

        addNotification({
          type: 'success',
          title: 'Measurement Associated',
          message: `${areaText} linked to ${contact.first_name} ${contact.last_name}`
        });

        setShowPendingPrompt(false);
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Association Failed',
          message: error.message
        });
      }
    } else {
      // View contact's property on the map
      handleViewContactProperty(contact);
    }
  };

  const handleViewContactProperty = (contact) => {
    // This will be called when a contact is clicked to view their property
    if (onViewContactProperty) {
      onViewContactProperty(contact);
    }
  };

  const handleAssociateWithNewContact = () => {
    // Create a new contact with pending measurement context
    setShowPendingPrompt(false);

    // Pre-fill the address field with the measurement address
    if (pendingMeasurement?.address) {
      setContactFormInitialData({
        address: pendingMeasurement.address
      });
    }

    setEditingContact(null);
    setShowForm(true);
  };

  const handleSkipAssociation = () => {
    clearPendingMeasurement();
    setShowPendingPrompt(false);

    addNotification({
      type: 'info',
      title: 'Measurement Not Associated',
      message: 'You can still find your measurement data in the map view'
    });
  };

  const formatArea = (area) => {
    return Math.round(area).toLocaleString();
  };

  return (
    <div className={`contact-management ${quickContactCreate ? 'contact-management--quick' : ''}`}>
      {/* Pending Measurement Prompt */}
      {!quickContactCreate && showPendingPrompt && pendingMeasurement && (
        <div className="pending-measurement-prompt">
          <div className="prompt-header">
            <div className="measurement-indicator">
              <MapPin size={20} />
              <div>
                <h4>Measurement Ready to Associate</h4>
                <span>{formatArea(pendingMeasurement.area)} sq ft • {pendingMeasurement.address}</span>
              </div>
            </div>
          </div>

          <div className="prompt-content">
            <p>Select an existing contact below or create a new one to associate this measurement.</p>

            <div className="prompt-actions">
              <button
                className="button primary"
                onClick={handleAssociateWithNewContact}
              >
                <User size={18} />
                Create New Contact
                <span className="button-note">(Address Pre-filled)</span>
              </button>
              <button
                className="button secondary"
                onClick={handleSkipAssociation}
              >
                Skip Association
              </button>
            </div>
          </div>
        </div>
      )}

      {!quickContactCreate && (
        <ContactList
          onContactCreate={handleCreateContact}
          onContactEdit={handleEditContact}
          onContactSelect={handleContactSelect}
        />
      )}

      <ContactForm
        isOpen={showForm}
        onClose={handleCloseForm}
        contact={editingContact}
        initialData={contactFormInitialData}
        onSuccess={handleFormSuccess}
      />

      <style jsx>{`
        .contact-management {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .contact-management--quick {
          min-height: 0;
        }

        .pending-measurement-prompt {
          background: linear-gradient(135deg, var(--green-50), var(--green-100));
          border: 2px solid var(--green-200);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          animation: slideDown 400ms cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        .prompt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .measurement-indicator {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .measurement-indicator svg {
          color: var(--green-700);
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .measurement-indicator h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--green-700);
          line-height: 1.2;
        }

        .measurement-indicator span {
          font-size: 0.875rem;
          color: var(--green-700);
          opacity: 0.8;
        }

        .prompt-content p {
          margin: 0 0 1rem 0;
          color: var(--green-700);
          font-size: 0.9375rem;
          line-height: 1.4;
        }

        .prompt-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
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

        .button-note {
          font-size: 0.75rem;
          opacity: 0.8;
          font-weight: 400;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .pending-measurement-prompt {
            padding: 1rem;
          }

          .measurement-indicator {
            gap: 0.75rem;
          }

          .measurement-indicator h4 {
            font-size: 0.9375rem;
          }

          .measurement-indicator span {
            font-size: 0.8125rem;
          }

          .prompt-actions {
            flex-direction: column;
            gap: 0.5rem;
          }

          .button {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { MapPin, User, X, ArrowRight } from 'lucide-react';
import useCRMStore from '../store/useCRMStore';

/**
 * MeasurementAssociationModal Component
 * Prompts user to associate a completed measurement with a contact
 */
export default function MeasurementAssociationModal({
  isOpen,
  onClose,
  measurementData,
  onOpenCRM /** (opts?: { intent: 'measurement-contact' }) => void */
}) {
  const { isAuthenticated, user } = useCRMStore();
  const [isAssociating, setIsAssociating] = useState(false);

  if (!isOpen || !measurementData) return null;

  const handleAssociate = async () => {
    setIsAssociating(true);
    try {
      // Clean measurement data for serialization (remove Google Maps objects)
      const cleanMeasurementData = {
        coordinates: measurementData.coordinates,
        area: measurementData.area,
        totalArea: measurementData.totalArea,
        polygonCount: measurementData.polygonCount,
        areas: measurementData.areas,
        source: measurementData.source,
        description: measurementData.description,
        address: measurementData.address,
        location: measurementData.location,
        timestamp: measurementData.timestamp,
        id: measurementData.id
      };

      // Store for CRM (Zustand survives Strict Mode remount; sessionStorage is backup)
      useCRMStore.getState().setPendingMeasurement(cleanMeasurementData);
      try {
        sessionStorage.setItem('pending-measurement', JSON.stringify(cleanMeasurementData));
      } catch (_) {}
      onOpenCRM({ intent: 'measurement-contact' });
      onClose({ reason: 'associate' });
    } catch (error) {
      console.error('Error associating measurement:', error);
    } finally {
      setIsAssociating(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const formatArea = (area) => {
    return Math.round(area).toLocaleString();
  };

  const getTotalArea = () => {
    return measurementData.totalArea || measurementData.area || 0;
  };

  const getAreaDescription = () => {
    if (measurementData.polygonCount && measurementData.polygonCount > 1) {
      return `${measurementData.polygonCount} areas totaling ${formatArea(getTotalArea())} sq ft`;
    }
    return `${formatArea(getTotalArea())} sq ft`;
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />

      <div className="association-modal">
        <div className="modal-header">
          <div className="header-content">
            <div className="measurement-icon">
              <MapPin size={24} />
            </div>
            <div>
              <h2>Measurement Completed!</h2>
              <p>You have measured <strong>{getAreaDescription()}</strong></p>
            </div>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {isAuthenticated ? (
            <div className="authenticated-content">
              <div className="welcome-section">
                <User size={20} />
                <span>Welcome back, {user?.first_name}!</span>
              </div>

              <div className="association-prompt">
                <h3>Associate with Contact</h3>
                <p>
                  Connect this measurement to a contact in your CRM to start building
                  a quote and track this lead through your pipeline.
                </p>

                <div className="benefits-list">
                  <div className="benefit">
                    <ArrowRight size={16} />
                    <span>Link measurement to client property</span>
                  </div>
                  <div className="benefit">
                    <ArrowRight size={16} />
                    <span>Address automatically pre-filled</span>
                  </div>
                  <div className="benefit">
                    <ArrowRight size={16} />
                    <span>Generate professional quotes</span>
                  </div>
                  <div className="benefit">
                    <ArrowRight size={16} />
                    <span>Track leads in your pipeline</span>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button
                  className="button primary"
                  onClick={handleAssociate}
                  disabled={isAssociating}
                >
                  <User size={18} />
                  {isAssociating ? 'Opening form...' : 'Create contact & link'}
                </button>
                <button className="button secondary" onClick={handleSkip}>
                  Maybe Later
                </button>
              </div>
            </div>
          ) : (
            <div className="unauthenticated-content">
              <div className="login-prompt">
                <h3>Want to save this measurement?</h3>
                <p>
                  Log in to associate this measurement with a contact, create quotes,
                  and track leads in your CRM system.
                </p>

                <div className="feature-highlight">
                  <div className="feature">
                    <MapPin size={16} />
                    <span>Save measurements to client properties</span>
                  </div>
                  <div className="feature">
                    <User size={16} />
                    <span>Manage contact relationships</span>
                  </div>
                  <div className="feature">
                    <ArrowRight size={16} />
                    <span>Generate and track quotes</span>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button
                  className="button primary"
                  onClick={() => {
                    // Store measurement for after login
                    sessionStorage.setItem('pending-measurement', JSON.stringify(measurementData));
                    onClose();
                    // The LoginModal will be handled by the Header component
                  }}
                >
                  <User size={18} />
                  Log In to Save
                </button>
                <button className="button secondary" onClick={handleSkip}>
                  Continue Without Saving
                </button>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            z-index: 1030;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .association-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90vw;
            max-width: 480px;
            max-height: 80vh;
            background: var(--surface-raised);
            border-radius: 16px;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
            z-index: 1031;
            overflow: hidden;
            animation: slideIn 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
          }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2rem 2rem 1rem 2rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          }

          .header-content {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .measurement-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--green-500), var(--green-700));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
          }

          .modal-header h2 {
            margin: 0 0 0.25rem 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--ink);
            line-height: 1.2;
          }

          .modal-header p {
            margin: 0;
            color: var(--ink-muted);
            font-size: 0.9375rem;
          }

          .close-button {
            padding: 0.5rem;
            background: transparent;
            border: none;
            color: var(--ink-faint);
            cursor: pointer;
            border-radius: 8px;
            transition: all 200ms ease;
            flex-shrink: 0;
          }

          .close-button:hover {
            background: rgba(0, 0, 0, 0.05);
            color: var(--ink-muted);
          }

          .modal-content {
            padding: 1rem 2rem 2rem 2rem;
            overflow-y: auto;
            max-height: calc(80vh - 7rem);
          }

          .welcome-section {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem;
            background: var(--green-50);
            border: 1px solid var(--green-200);
            border-radius: 8px;
            color: var(--green-700);
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1.5rem;
          }

          .association-prompt h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--ink);
          }

          .association-prompt p {
            margin: 0 0 1rem 0;
            color: var(--ink-muted);
            line-height: 1.5;
            font-size: 0.9375rem;
          }

          .benefits-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
          }

          .benefit {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--green-700);
            font-size: 0.875rem;
          }

          .login-prompt h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--ink);
          }

          .login-prompt p {
            margin: 0 0 1.5rem 0;
            color: var(--ink-muted);
            line-height: 1.5;
            font-size: 0.9375rem;
          }

          .feature-highlight {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 1rem;
            background: var(--surface);
            border-radius: 8px;
            margin-bottom: 1.5rem;
          }

          .feature {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--ink-muted);
            font-size: 0.875rem;
          }

          .feature svg {
            color: var(--green-500);
            flex-shrink: 0;
          }

          .actions {
            display: flex;
            gap: 0.75rem;
            flex-direction: column;
          }

          .button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.875rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 200ms ease;
            text-decoration: none;
            min-height: 44px;
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

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          @media (max-width: 640px) {
            .association-modal {
              width: 95vw;
              max-height: 90vh;
            }

            .modal-header {
              padding: 1.5rem 1.5rem 1rem 1.5rem;
            }

            .modal-content {
              padding: 1rem 1.5rem 1.5rem 1.5rem;
            }

            .header-content {
              gap: 0.75rem;
            }

            .measurement-icon {
              width: 40px;
              height: 40px;
            }

            .modal-header h2 {
              font-size: 1.25rem;
            }

            .actions {
              gap: 0.5rem;
            }
          }
        `}</style>
      </div>
    </>
  );
}
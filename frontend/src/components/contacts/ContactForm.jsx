'use client';

import { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Phone, MapPin, FileText, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import useCRMStore from '../../store/useCRMStore';

/**
 * ContactForm Component
 * Modal form for creating and editing contacts
 */
export default function ContactForm({ isOpen, onClose, contact = null, initialData = null, onSuccess }) {
  const { createContact, updateContactAPI, contactsLoading } = useCRMStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  const isEditing = !!contact;
  const title = isEditing ? 'Edit Contact' : 'Add New Contact';

  // Initialize form data when contact prop changes
  useEffect(() => {
    if (contact) {
      setFormData({
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        address: contact.address || '',
        notes: contact.notes || ''
      });
    } else {
      setFormData({
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        notes: initialData?.notes || ''
      });
    }
    setFieldErrors({});
    setShowSuccess(false);
    setFocusedField(null);
  }, [contact, initialData, isOpen]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Handle Escape key and focus trapping
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    const handleTabKey = (event) => {
      if (!isOpen || event.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (showSuccess) return; // Prevent closing during success animation
    setFieldErrors({});
    setShowSuccess(false);
    setFocusedField(null);
    onClose();
  };

  const validateField = (name, value) => {
    const errors = { ...fieldErrors };

    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          errors.firstName = 'First name is required';
        } else {
          delete errors.firstName;
        }
        break;

      case 'lastName':
        if (!value.trim()) {
          errors.lastName = 'Last name is required';
        } else {
          delete errors.lastName;
        }
        break;

      case 'email':
        if (value && value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.email = 'Please enter a valid email address';
          } else {
            delete errors.email;
          }
        } else {
          delete errors.email;
        }
        break;

      case 'phone':
        // Phone is optional, but if provided should be reasonable length
        if (value && value.trim() && value.trim().length < 10) {
          errors.phone = 'Please enter a valid phone number';
        } else {
          delete errors.phone;
        }
        break;

      default:
        break;
    }

    setFieldErrors(errors);
    return !errors[name];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Validate field on change (after first blur)
    if (fieldErrors[name] !== undefined) {
      validateField(name, value);
    }
  };

  const handleInputFocus = (fieldName) => {
    setFocusedField(fieldName);
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    setFocusedField(null);
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields
    const isFirstNameValid = validateField('firstName', formData.firstName);
    const isLastNameValid = validateField('lastName', formData.lastName);
    const isEmailValid = validateField('email', formData.email);
    const isPhoneValid = validateField('phone', formData.phone);

    if (!isFirstNameValid || !isLastNameValid || !isEmailValid || !isPhoneValid) {
      return;
    }

    try {
      let result;
      if (isEditing) {
        result = await updateContactAPI(contact.id, formData);
      } else {
        result = await createContact(formData);
      }

      if (result.success) {
        if (onSuccess) {
          await Promise.resolve(onSuccess(result.contact));
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          handleClose();
        }, 1200);
      }
    } catch (error) {
      console.error('Contact form error:', error);
    }
  };

  if (!isOpen) return null;

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const isFormValid = formData.firstName.trim() && formData.lastName.trim() && !hasFieldErrors;

  return (
    <>
      {/* Screen reader announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {showSuccess && `Contact ${isEditing ? 'updated' : 'created'} successfully.`}
        {contactsLoading && `${isEditing ? 'Updating' : 'Creating'} contact...`}
      </div>

      <div className="modal-backdrop" onClick={handleClose} />
      <div className="modal-container">
        <div
          ref={modalRef}
          className="contact-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          aria-describedby="contact-modal-description"
        >
          {/* Success Overlay */}
          {showSuccess && (
            <div className="success-overlay">
              <div className="success-content">
                <div className="success-icon-wrapper">
                  <CheckCircle2 size={52} className="success-icon" />
                </div>
                <h3>Success!</h3>
                <p>Contact {isEditing ? 'updated' : 'created'} successfully</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="contact-modal-header">
            <div className="header-content">
              <div className="brand-section">
                <div className="brand-icon">
                  <User size={24} />
                </div>
                <h1 id="contact-modal-title">{title}</h1>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={handleClose}
                disabled={contactsLoading}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>
            <p id="contact-modal-description" className="modal-subtitle">
              {isEditing ? 'Update contact information below.' : 'Enter the contact details below.'}
            </p>
          </div>

          {/* Form Content */}
          <div className="contact-modal-content">
            <form onSubmit={handleSubmit} className="contact-form" noValidate>
              {/* Name Row */}
              <div className="name-row">
                <div className={`form-group ${focusedField === 'firstName' ? 'focused' : ''}`}>
                  <label htmlFor="firstName">First Name *</label>
                  <div className="input-wrapper">
                    <input
                      ref={firstInputRef}
                      id="firstName"
                      name="firstName"
                      type="text"
                      className={`input ${fieldErrors.firstName ? 'error' : ''} ${formData.firstName ? 'has-value' : ''}`}
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onFocus={() => handleInputFocus('firstName')}
                      onBlur={handleInputBlur}
                      disabled={contactsLoading}
                      aria-invalid={!!fieldErrors.firstName}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <div className="field-error" role="alert">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.firstName}</span>
                    </div>
                  )}
                </div>

                <div className={`form-group ${focusedField === 'lastName' ? 'focused' : ''}`}>
                  <label htmlFor="lastName">Last Name *</label>
                  <div className="input-wrapper">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      className={`input ${fieldErrors.lastName ? 'error' : ''} ${formData.lastName ? 'has-value' : ''}`}
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      onFocus={() => handleInputFocus('lastName')}
                      onBlur={handleInputBlur}
                      disabled={contactsLoading}
                      aria-invalid={!!fieldErrors.lastName}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <div className="field-error" role="alert">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.lastName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className={`form-group ${focusedField === 'email' ? 'focused' : ''}`}>
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`input ${fieldErrors.email ? 'error' : ''} ${formData.email ? 'has-value' : ''}`}
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    onFocus={() => handleInputFocus('email')}
                    onBlur={handleInputBlur}
                    disabled={contactsLoading}
                    aria-invalid={!!fieldErrors.email}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <div className="field-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{fieldErrors.email}</span>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className={`form-group ${focusedField === 'phone' ? 'focused' : ''}`}>
                <label htmlFor="phone">Phone Number</label>
                <div className="input-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className={`input ${fieldErrors.phone ? 'error' : ''} ${formData.phone ? 'has-value' : ''}`}
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onFocus={() => handleInputFocus('phone')}
                    onBlur={handleInputBlur}
                    disabled={contactsLoading}
                    aria-invalid={!!fieldErrors.phone}
                    autoComplete="tel"
                  />
                </div>
                {fieldErrors.phone && (
                  <div className="field-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{fieldErrors.phone}</span>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className={`form-group ${focusedField === 'address' ? 'focused' : ''}`}>
                <label htmlFor="address">Address</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input
                    id="address"
                    name="address"
                    type="text"
                    className={`input ${formData.address ? 'has-value' : ''}`}
                    placeholder="123 Main St, City, State 12345"
                    value={formData.address}
                    onChange={handleInputChange}
                    onFocus={() => handleInputFocus('address')}
                    onBlur={handleInputBlur}
                    disabled={contactsLoading}
                    autoComplete="street-address"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className={`form-group ${focusedField === 'notes' ? 'focused' : ''}`}>
                <label htmlFor="notes">Notes</label>
                <div className="input-wrapper">
                  <FileText size={18} className="input-icon textarea-icon" />
                  <textarea
                    id="notes"
                    name="notes"
                    className={`input textarea ${formData.notes ? 'has-value' : ''}`}
                    placeholder="Additional notes about this contact..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    onFocus={() => handleInputFocus('notes')}
                    onBlur={handleInputBlur}
                    disabled={contactsLoading}
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`submit-button ${contactsLoading ? 'loading' : ''}`}
                disabled={contactsLoading || !isFormValid}
              >
                {contactsLoading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{isEditing ? 'Update Contact' : 'Create Contact'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 1230;
          animation: fadeIn 300ms ease-out;
        }

        .modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1231;
          pointer-events: none;
        }

        .contact-modal {
          background: linear-gradient(145deg, #ffffff 0%, #fafbf8 100%);
          border-radius: 24px;
          width: 100%;
          max-width: 520px;
          max-height: 95vh;
          overflow: hidden;
          box-shadow:
            0 32px 64px rgba(23, 52, 4, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
          pointer-events: all;
          animation: slideInScale 400ms cubic-bezier(0.4, 0.0, 0.2, 1);
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .success-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, #ffffff 0%, #f0f9f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          border-radius: 24px;
        }

        .success-content {
          text-align: center;
          padding: 3rem 2rem;
        }

        .success-icon-wrapper {
          display: inline-block;
          margin-bottom: 1.5rem;
        }

        .success-icon {
          color: var(--success);
          animation: successPulse 800ms ease-out;
        }

        .success-content h3 {
          margin: 0 0 0.75rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.025em;
        }

        .success-content p {
          margin: 0;
          color: var(--ink-muted);
          font-size: 1rem;
        }

        .contact-modal-header {
          padding: 2.5rem 2.5rem 1.5rem;
          border-bottom: none;
          flex-shrink: 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-icon {
          color: var(--green-700);
        }

        .brand-section h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.025em;
        }

        .close-button {
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.03);
          border: none;
          border-radius: 12px;
          color: var(--ink-muted);
          cursor: pointer;
          transition: all 200ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
          transform: scale(1.05);
        }

        .close-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .modal-subtitle {
          margin: 0;
          font-size: 0.9375rem;
          color: var(--ink-muted);
          line-height: 1.5;
        }

        .contact-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 0 2.5rem 2.5rem;
          -webkit-overflow-scrolling: touch;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .name-row {
          display: flex;
          gap: 1rem;
        }

        .name-row .form-group {
          flex: 1;
        }

        .form-group {
          position: relative;
          transition: all 200ms ease;
        }

        .form-group.focused {
          transform: scale(1.01);
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--ink);
          transition: all 200ms ease;
        }

        .form-group.focused label {
          color: var(--green-700);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: flex-start;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 1rem;
          color: var(--ink-faint);
          pointer-events: none;
          z-index: 1;
          transition: all 200ms ease;
        }

        .textarea-icon {
          top: 1rem;
        }

        .form-group.focused .input-icon {
          color: var(--green-500);
          transform: scale(1.1);
        }

        .input {
          width: 100%;
          padding: 1rem;
          border: 2px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          font-size: 0.9375rem;
          background: rgba(255, 255, 255, 0.8);
          color: var(--ink);
          transition: all 250ms cubic-bezier(0.4, 0.0, 0.2, 1);
          font-family: inherit;
          outline: none;
          resize: vertical;
        }

        .input.has-icon {
          padding-left: 3rem;
        }

        .input-icon + .input,
        .input:has(.input-icon) {
          padding-left: 3rem;
        }

        .input.textarea {
          min-height: 80px;
          padding-left: 3rem;
        }

        .input:hover {
          border-color: rgba(74, 138, 24, 0.3);
          background: rgba(255, 255, 255, 0.95);
        }

        .input:focus {
          border-color: var(--accent);
          background: var(--surface-raised);
          box-shadow:
            0 0 0 3px rgba(90, 166, 32, 0.1),
            0 4px 12px rgba(90, 166, 32, 0.15);
          transform: translateY(-1px);
        }

        .input:disabled {
          background: rgba(0, 0, 0, 0.02);
          color: var(--ink-faint);
          cursor: not-allowed;
          border-color: rgba(0, 0, 0, 0.05);
        }

        .input.error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        .input.error:focus {
          box-shadow:
            0 0 0 3px rgba(239, 68, 68, 0.1),
            0 4px 12px rgba(239, 68, 68, 0.15);
        }

        .input.has-value {
          background: var(--surface-raised);
        }

        .field-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.08);
          border-radius: 8px;
          font-size: 0.8125rem;
          color: #dc2626;
          font-weight: 500;
          animation: errorSlideIn 200ms ease-out;
        }

        .submit-button {
          width: 100%;
          padding: 1rem 1.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 250ms cubic-bezier(0.4, 0.0, 0.2, 1);
          position: relative;
          overflow: hidden;
          margin-top: 0.5rem;
          background: var(--green-700);
          color: white;
          box-shadow:
            0 4px 12px rgba(74, 138, 24, 0.3),
            0 0 0 1px rgba(74, 138, 24, 0.1);
        }

        .submit-button:hover:not(:disabled) {
          background: var(--green-500);
          transform: translateY(-2px);
          box-shadow:
            0 8px 24px rgba(74, 138, 24, 0.4),
            0 0 0 1px rgba(74, 138, 24, 0.2);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInScale {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes successPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes errorSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .modal-container {
            padding: 0.75rem;
            align-items: flex-start;
            padding-top: 2rem;
          }

          .contact-modal {
            max-width: 100%;
            max-height: calc(100vh - 4rem);
            border-radius: 20px;
          }

          .contact-modal-header {
            padding: 2rem 2rem 1.25rem;
          }

          .brand-section h1 {
            font-size: 1.25rem;
          }

          .contact-modal-content {
            padding: 0 2rem 2rem;
          }

          .name-row {
            flex-direction: column;
            gap: 2rem;
          }

          .contact-form {
            gap: 1.75rem;
          }

          .input {
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }

        @media (max-height: 700px) {
          .contact-form {
            gap: 1.5rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}
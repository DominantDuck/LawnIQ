'use client';

import { useState, useEffect, useRef } from 'react';
import { LogIn, Mail, Lock, User, X, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import useCRMStore from '../../store/useCRMStore';

/**
 * Beautiful Enhanced Login/Registration Modal
 * Features: Fixed scrolling, modern design, excellent UX, full accessibility
 */
export default function LoginModal() {
  const {
    showLoginModal,
    showRegisterModal,
    isLoading,
    authError,
    login,
    register,
    setShowLoginModal,
    setShowRegisterModal,
    clearAuthError
  } = useCRMStore();

  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const contentRef = useRef(null);

  const isOpen = showLoginModal || showRegisterModal;

  // Set active tab based on which modal is open
  useEffect(() => {
    if (showLoginModal) setActiveTab('login');
    if (showRegisterModal) setActiveTab('register');
  }, [showLoginModal, showRegisterModal]);

  // Clear form and error when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        confirmPassword: ''
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      setFieldErrors({});
      setShowSuccess(false);
      setFocusedField(null);
      clearAuthError();

      // Focus first input when modal opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, clearAuthError]);

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
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
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
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
    clearAuthError();
    setFieldErrors({});
    setShowSuccess(false);
    setFocusedField(null);
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    clearAuthError();
    setFieldErrors({});
    setShowSuccess(false);
    setFocusedField(null);
    if (tab === 'login') {
      setShowLoginModal(true);
      setShowRegisterModal(false);
    } else {
      setShowLoginModal(false);
      setShowRegisterModal(true);
    }
    // Scroll to top when switching tabs
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const validateField = (name, value) => {
    const errors = { ...fieldErrors };

    switch (name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          errors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;

      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else {
          delete errors.password;
        }
        break;

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

      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
    }

    setFieldErrors(errors);
    return !errors[name];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear auth error when user starts typing
    if (authError) clearAuthError();

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

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validate all fields
    const isEmailValid = validateField('email', formData.email);
    const isPasswordValid = validateField('password', formData.password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    const result = await login(formData.email, formData.password);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(handleClose, 1200);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validate all fields
    const isEmailValid = validateField('email', formData.email);
    const isPasswordValid = validateField('password', formData.password);
    const isFirstNameValid = validateField('firstName', formData.firstName);
    const isLastNameValid = validateField('lastName', formData.lastName);
    const isConfirmPasswordValid = validateField('confirmPassword', formData.confirmPassword);

    if (!isEmailValid || !isPasswordValid || !isFirstNameValid || !isLastNameValid || !isConfirmPasswordValid) {
      return;
    }

    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName
    });

    if (result.success) {
      setShowSuccess(true);
      setTimeout(handleClose, 1500);
    }
  };

  if (!isOpen) return null;

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const isFormValid = activeTab === 'login'
    ? formData.email && formData.password && !hasFieldErrors
    : formData.email && formData.password && formData.firstName && formData.lastName &&
      formData.confirmPassword && !hasFieldErrors;

  return (
    <>
      {/* Screen reader announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {showSuccess && `${activeTab === 'login' ? 'Successfully signed in' : 'Account created successfully'}. Redirecting...`}
        {authError && `Authentication error: ${authError}`}
        {isLoading && `${activeTab === 'login' ? 'Signing you in' : 'Creating your account'}...`}
      </div>

      <div className="modal-backdrop" onClick={handleClose} />
      <div className="modal-container">
        <div
          ref={modalRef}
          className="auth-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          aria-describedby="auth-modal-description"
        >
          {/* Success Overlay */}
          {showSuccess && (
            <div className="success-overlay">
              <div className="success-content">
                <div className="success-icon-wrapper">
                  <CheckCircle2 size={52} className="success-icon" />
                  <Sparkles size={24} className="sparkle sparkle-1" />
                  <Sparkles size={18} className="sparkle sparkle-2" />
                  <Sparkles size={20} className="sparkle sparkle-3" />
                </div>
                <h3>Welcome to SwiftQuote!</h3>
                <p>{activeTab === 'login' ? 'Successfully signed in' : 'Account created successfully'}</p>
              </div>
            </div>
          )}

          {/* Header with tabs */}
          <div className="auth-modal-header">
            <div className="header-content">
              <div className="brand-section">
                <div className="brand-icon">🏡</div>
                <h1>Join SwiftQuote</h1>
              </div>
              <button
                type="button"
                className="auth-close-button"
                onClick={handleClose}
                disabled={isLoading}
                aria-label="Close dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'login'}
                aria-controls="login-panel"
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('login')}
                disabled={isLoading}
              >
                <LogIn size={18} aria-hidden="true" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'register'}
                aria-controls="register-panel"
                className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('register')}
                disabled={isLoading}
              >
                <User size={18} aria-hidden="true" />
                <span>Create Account</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div ref={contentRef} className="auth-modal-content">
            {activeTab === 'login' ? (
              <div id="login-panel" role="tabpanel" aria-labelledby="login-tab">
                <div className="auth-intro">
                  <h2 id="auth-modal-title">Welcome back</h2>
                  <p id="auth-modal-description" className="auth-subtitle">Sign in to manage your property measurement projects</p>
                </div>

                <form onSubmit={handleLogin} className="auth-form" noValidate>
                  <div className={`form-group ${focusedField === 'email' ? 'focused' : ''}`}>
                    <label htmlFor="login-email">Email Address</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" aria-hidden="true" />
                      <input
                        ref={firstInputRef}
                        id="login-email"
                        name="email"
                        type="email"
                        className={`input ${fieldErrors.email ? 'error' : ''} ${formData.email ? 'has-value' : ''}`}
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('email')}
                        onBlur={handleInputBlur}
                        disabled={isLoading}
                        aria-invalid={!!fieldErrors.email}
                        aria-describedby={fieldErrors.email ? "email-error" : undefined}
                        autoComplete="email"
                        required
                      />
                    </div>
                    {fieldErrors.email && (
                      <div id="email-error" className="field-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>{fieldErrors.email}</span>
                      </div>
                    )}
                  </div>

                  <div className={`form-group ${focusedField === 'password' ? 'focused' : ''}`}>
                    <label htmlFor="login-password">Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" aria-hidden="true" />
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`input ${fieldErrors.password ? 'error' : ''} ${formData.password ? 'has-value' : ''}`}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('password')}
                        onBlur={handleInputBlur}
                        disabled={isLoading}
                        aria-invalid={!!fieldErrors.password}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <div id="password-error" className="field-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>

                  {authError && (
                    <div className="auth-error" role="alert">
                      <AlertCircle size={18} aria-hidden="true" />
                      <div>
                        <strong>Sign in failed</strong>
                        <p>{authError}</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`auth-submit primary ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading || !isFormValid}
                    aria-describedby={isLoading ? "loading-message" : undefined}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="spinner" aria-hidden="true" />
                        <span id="loading-message">Signing you in...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={18} aria-hidden="true" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div id="register-panel" role="tabpanel" aria-labelledby="register-tab">
                <div className="auth-intro">
                  <h2 id="auth-modal-title">Create your account</h2>
                  <p id="auth-modal-description" className="auth-subtitle">Start measuring properties and managing projects</p>
                </div>

                <form onSubmit={handleRegister} className="auth-form" noValidate>
                  <div className="name-row">
                    <div className={`form-group ${focusedField === 'firstName' ? 'focused' : ''}`}>
                      <label htmlFor="register-firstName">First Name</label>
                      <div className="input-wrapper">
                        <input
                          ref={firstInputRef}
                          id="register-firstName"
                          name="firstName"
                          type="text"
                          className={`input ${fieldErrors.firstName ? 'error' : ''} ${formData.firstName ? 'has-value' : ''}`}
                          placeholder="First"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          onFocus={() => handleInputFocus('firstName')}
                          onBlur={handleInputBlur}
                          disabled={isLoading}
                          aria-invalid={!!fieldErrors.firstName}
                          autoComplete="given-name"
                          required
                        />
                      </div>
                      {fieldErrors.firstName && (
                        <div className="field-error" role="alert">
                          <AlertCircle size={14} aria-hidden="true" />
                          <span>{fieldErrors.firstName}</span>
                        </div>
                      )}
                    </div>
                    <div className={`form-group ${focusedField === 'lastName' ? 'focused' : ''}`}>
                      <label htmlFor="register-lastName">Last Name</label>
                      <div className="input-wrapper">
                        <input
                          id="register-lastName"
                          name="lastName"
                          type="text"
                          className={`input ${fieldErrors.lastName ? 'error' : ''} ${formData.lastName ? 'has-value' : ''}`}
                          placeholder="Last"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          onFocus={() => handleInputFocus('lastName')}
                          onBlur={handleInputBlur}
                          disabled={isLoading}
                          aria-invalid={!!fieldErrors.lastName}
                          autoComplete="family-name"
                          required
                        />
                      </div>
                      {fieldErrors.lastName && (
                        <div className="field-error" role="alert">
                          <AlertCircle size={14} aria-hidden="true" />
                          <span>{fieldErrors.lastName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`form-group ${focusedField === 'email' ? 'focused' : ''}`}>
                    <label htmlFor="register-email">Email Address</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" aria-hidden="true" />
                      <input
                        id="register-email"
                        name="email"
                        type="email"
                        className={`input ${fieldErrors.email ? 'error' : ''} ${formData.email ? 'has-value' : ''}`}
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('email')}
                        onBlur={handleInputBlur}
                        disabled={isLoading}
                        aria-invalid={!!fieldErrors.email}
                        autoComplete="email"
                        required
                      />
                    </div>
                    {fieldErrors.email && (
                      <div className="field-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>{fieldErrors.email}</span>
                      </div>
                    )}
                  </div>

                  <div className={`form-group ${focusedField === 'password' ? 'focused' : ''}`}>
                    <label htmlFor="register-password">Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" aria-hidden="true" />
                      <input
                        id="register-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`input ${fieldErrors.password ? 'error' : ''} ${formData.password ? 'has-value' : ''}`}
                        placeholder="Create a secure password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('password')}
                        onBlur={handleInputBlur}
                        disabled={isLoading}
                        aria-invalid={!!fieldErrors.password}
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="form-hint">
                      <span>At least 8 characters</span>
                    </div>
                    {fieldErrors.password && (
                      <div className="field-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>

                  <div className={`form-group ${focusedField === 'confirmPassword' ? 'focused' : ''}`}>
                    <label htmlFor="register-confirmPassword">Confirm Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" aria-hidden="true" />
                      <input
                        id="register-confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`input ${fieldErrors.confirmPassword ? 'error' : ''} ${formData.confirmPassword ? 'has-value' : ''}`}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('confirmPassword')}
                        onBlur={handleInputBlur}
                        disabled={isLoading}
                        aria-invalid={!!fieldErrors.confirmPassword}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <div className="field-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>{fieldErrors.confirmPassword}</span>
                      </div>
                    )}
                  </div>

                  {authError && (
                    <div className="auth-error" role="alert">
                      <AlertCircle size={18} aria-hidden="true" />
                      <div>
                        <strong>Registration failed</strong>
                        <p>{authError}</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`auth-submit primary ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading || !isFormValid}
                    aria-describedby={isLoading ? "loading-message" : undefined}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="spinner" aria-hidden="true" />
                        <span id="loading-message">Creating your account...</span>
                      </>
                    ) : (
                      <>
                        <User size={18} aria-hidden="true" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>

                  <p className="privacy-notice">
                    By creating an account, you agree to our <a href="#" tabIndex={-1}>Terms of Service</a> and <a href="#" tabIndex={-1}>Privacy Policy</a>.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 1200;
          animation: fadeIn 300ms ease-out;
        }

        .modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1201;
          pointer-events: none;
        }

        .auth-modal {
          background: linear-gradient(145deg, #ffffff 0%, #fafbf8 100%);
          border-radius: 24px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          min-height: 520px;
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
          position: relative;
          display: inline-block;
          margin-bottom: 1.5rem;
        }

        .success-icon {
          color: var(--success);
          animation: successPulse 800ms ease-out;
        }

        .sparkle {
          position: absolute;
          color: #10b981;
          opacity: 0.8;
        }

        .sparkle-1 {
          top: -8px;
          right: -4px;
          animation: sparkleFloat 2s ease-in-out infinite;
        }

        .sparkle-2 {
          bottom: 2px;
          left: -6px;
          animation: sparkleFloat 2s ease-in-out infinite 0.6s;
        }

        .sparkle-3 {
          top: 8px;
          left: -8px;
          animation: sparkleFloat 2s ease-in-out infinite 1.2s;
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

        .auth-modal-header {
          padding: 2.5rem 2.5rem 1.5rem;
          border-bottom: none;
          flex-shrink: 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-icon {
          font-size: 1.75rem;
          background: linear-gradient(135deg, var(--green-500), var(--green-700));
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
        }

        .brand-section h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.025em;
        }

        .auth-close-button {
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

        .auth-close-button:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
          transform: scale(1.05);
        }

        .auth-close-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .auth-tabs {
          display: flex;
          background: rgba(74, 138, 24, 0.08);
          border-radius: 16px;
          padding: 0.375rem;
          position: relative;
        }

        .auth-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.25rem;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--ink-muted);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 250ms cubic-bezier(0.4, 0.0, 0.2, 1);
          position: relative;
          z-index: 2;
        }

        .auth-tab span {
          transition: all 200ms ease;
        }

        .auth-tab:hover:not(:disabled) {
          color: var(--green-700);
          transform: translateY(-1px);
        }

        .auth-tab:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .auth-tab.active {
          background: var(--surface-raised);
          color: var(--green-700);
          box-shadow:
            0 4px 12px rgba(74, 138, 24, 0.15),
            0 0 0 1px rgba(74, 138, 24, 0.1);
          transform: translateY(-2px);
        }

        .auth-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 0 2.5rem 2.5rem;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(74, 138, 24, 0.3) transparent;
        }

        .auth-modal-content::-webkit-scrollbar {
          width: 6px;
        }

        .auth-modal-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .auth-modal-content::-webkit-scrollbar-thumb {
          background: rgba(74, 138, 24, 0.3);
          border-radius: 3px;
        }

        .auth-modal-content::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 138, 24, 0.5);
        }

        .auth-intro {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .auth-intro h2 {
          margin: 0 0 0.75rem 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.025em;
        }

        .auth-subtitle {
          margin: 0;
          font-size: 0.9375rem;
          color: var(--ink-muted);
          line-height: 1.5;
        }

        .auth-form {
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
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: var(--ink-faint);
          pointer-events: none;
          z-index: 1;
          transition: all 200ms ease;
        }

        .form-group.focused .input-icon {
          color: var(--green-600);
          transform: scale(1.1);
        }

        .input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          font-size: 0.9375rem;
          background: rgba(255, 255, 255, 0.8);
          color: var(--ink);
          transition: all 250ms cubic-bezier(0.4, 0.0, 0.2, 1);
          font-family: inherit;
          outline: none;
        }

        .input:hover {
          border-color: rgba(74, 138, 24, 0.3);
          background: rgba(255, 255, 255, 0.95);
        }

        .input:focus {
          border-color: var(--green-500);
          background: var(--surface-raised);
          box-shadow:
            0 0 0 3px rgba(74, 138, 24, 0.1),
            0 4px 12px rgba(74, 138, 24, 0.15);
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

        .input:not(.input-icon + .input) {
          padding-left: 1rem;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: var(--ink-faint);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          transition: all 200ms ease;
          z-index: 2;
        }

        .password-toggle:hover:not(:disabled) {
          color: var(--green-600);
          background: rgba(74, 138, 24, 0.1);
          transform: scale(1.1);
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .form-hint {
          margin-top: 0.5rem;
          font-size: 0.8125rem;
          color: var(--ink-faint);
          line-height: 1.4;
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

        .auth-error {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          color: #dc2626;
          font-size: 0.875rem;
          animation: errorSlideIn 300ms ease-out;
        }

        .auth-error strong {
          font-weight: 600;
          margin-bottom: 0.25rem;
          display: block;
        }

        .auth-error p {
          margin: 0;
          opacity: 0.9;
        }

        .auth-submit {
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
        }

        .auth-submit.primary {
          background: linear-gradient(135deg, var(--green-600), var(--green-700));
          color: white;
          box-shadow:
            0 4px 12px rgba(74, 138, 24, 0.3),
            0 0 0 1px rgba(74, 138, 24, 0.1);
        }

        .auth-submit.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--green-700), var(--green-900));
          transform: translateY(-2px);
          box-shadow:
            0 8px 24px rgba(74, 138, 24, 0.4),
            0 0 0 1px rgba(74, 138, 24, 0.2);
        }

        .auth-submit.primary:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .auth-submit.loading {
          position: relative;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .privacy-notice {
          margin: 1.5rem 0 0 0;
          font-size: 0.8125rem;
          color: var(--ink-faint);
          text-align: center;
          line-height: 1.5;
        }

        .privacy-notice a {
          color: var(--green-600);
          text-decoration: none;
          font-weight: 500;
        }

        .privacy-notice a:hover {
          text-decoration: underline;
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

        @keyframes sparkleFloat {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-8px) rotate(180deg);
          }
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

          .auth-modal {
            max-width: 100%;
            max-height: calc(100vh - 4rem);
            border-radius: 20px;
          }

          .auth-modal-header {
            padding: 2rem 2rem 1.25rem;
          }

          .header-content {
            margin-bottom: 1.75rem;
          }

          .brand-section h1 {
            font-size: 1.25rem;
          }

          .auth-modal-content {
            padding: 0 2rem 2rem;
          }

          .auth-intro h2 {
            font-size: 1.5rem;
          }

          .name-row {
            flex-direction: column;
            gap: 1.5rem;
          }

          .auth-tabs {
            border-radius: 14px;
            padding: 0.25rem;
          }

          .auth-tab {
            padding: 0.875rem 1rem;
            border-radius: 10px;
            font-size: 0.8125rem;
          }

          .input {
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }

        @media (max-height: 700px) {
          .auth-intro {
            margin-bottom: 2rem;
          }

          .auth-form {
            gap: 1.25rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .auth-modal {
            border: 3px solid;
            background: Canvas;
            color: CanvasText;
          }

          .input {
            border: 2px solid ButtonText;
            background: Field;
            color: FieldText;
          }

          .input:focus {
            border: 3px solid Highlight;
            outline: 2px solid Highlight;
            outline-offset: 2px;
          }

          .auth-submit.primary {
            background: ButtonFace;
            color: ButtonText;
            border: 2px solid ButtonText;
          }

          .auth-submit.primary:hover:not(:disabled) {
            background: Highlight;
            color: HighlightText;
          }
        }

        /* Screen reader only content */
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

        /* Mobile viewport units support */
        @supports (height: 100dvh) {
          .modal-container {
            height: 100dvh;
          }

          @media (max-width: 640px) {
            .auth-modal {
              max-height: calc(100dvh - 4rem);
            }
          }
        }

        /* Better mobile keyboard handling */
        @media (max-width: 640px) and (max-height: 600px) {
          .modal-container {
            align-items: flex-start;
            padding-top: 1rem;
          }

          .auth-modal {
            max-height: calc(100vh - 2rem);
          }

          .auth-modal-header {
            padding: 1rem 1rem 0.5rem;
          }

          .header-content {
            margin-bottom: 1rem;
          }

          .auth-intro {
            margin-bottom: 1rem;
          }

          .auth-intro h2 {
            font-size: 1.25rem;
          }

          .auth-form {
            gap: 1rem;
          }
        }
      `}</style>
    </>
  );
}
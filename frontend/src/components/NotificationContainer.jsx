import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';

const notificationIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

function Notification({ notification, onClose }) {
  const IconComponent = notificationIcons[notification.type] || Info;

  // Auto-dismiss after 5 seconds (except errors)
  useEffect(() => {
    if (notification.type !== 'error') {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.type, onClose]);

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-icon">
        <IconComponent size={18} />
      </div>
      <div className="notification-content">
        {notification.title && (
          <div className="notification-title">
            {notification.title}
          </div>
        )}
        <div className="notification-message">
          {notification.message}
        </div>
      </div>
      <button
        className="notification-close"
        onClick={() => onClose(notification.id)}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>

      <style>{`
        .notification {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          margin-bottom: 0.5rem;
          position: relative;
          animation: slideIn 0.3s ease-out;
          min-width: 300px;
          max-width: 400px;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .notification-success {
          border-left: 4px solid var(--success);
        }

        .notification-success .notification-icon {
          color: var(--success);
        }

        .notification-error {
          border-left: 4px solid var(--error);
        }

        .notification-error .notification-icon {
          color: var(--error);
        }

        .notification-warning {
          border-left: 4px solid var(--warning);
        }

        .notification-warning .notification-icon {
          color: var(--warning);
        }

        .notification-info {
          border-left: 4px solid var(--info);
        }

        .notification-info .notification-icon {
          color: var(--info);
        }

        .notification-icon {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--ink);
          margin-bottom: 0.25rem;
          line-height: 1.3;
        }

        .notification-message {
          font-size: 0.8125rem;
          color: var(--ink-muted);
          line-height: 1.4;
          word-wrap: break-word;
        }

        .notification-close {
          background: none;
          border: none;
          color: var(--ink-faint);
          cursor: pointer;
          padding: 0.125rem;
          border-radius: 4px;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .notification-close:hover {
          color: var(--ink);
          background: var(--surface);
        }
      `}</style>
    </div>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}

      <style>{`
        .notification-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1100;
          pointer-events: none;
        }

        .notification-container :global(.notification) {
          pointer-events: all;
        }

        @media (max-width: 640px) {
          .notification-container {
            top: 0.5rem;
            right: 0.5rem;
            left: 0.5rem;
          }

          .notification-container :global(.notification) {
            min-width: auto;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}

export default NotificationContainer;
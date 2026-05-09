import {
  Edit3,
  ChevronLeft,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  MapPin
} from 'lucide-react';
import useAppStore from '../store/useAppStore';

function Sidebar() {
  const {
    sidebarOpen,
    polygons,
    totalArea,
    currentAddress,
    drawingMode,
    toggleSidebar,
    clearAllPolygons,
    setDrawingMode,
    exportData
  } = useAppStore();

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swiftquote-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!sidebarOpen) {
    return (
      <div className="sidebar-collapsed">
        <button
          className="expand-button"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>

        <style>{`
          .sidebar-collapsed {
            position: relative;
            width: 0;
            overflow: visible;
          }

          .expand-button {
            position: absolute;
            left: 0;
            top: 1rem;
            z-index: 10;
            background: var(--surface-raised);
            border: 1px solid var(--border);
            border-left: none;
            border-radius: 0 6px 6px 0;
            padding: 0.5rem 0.25rem;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .expand-button:hover {
            background: var(--surface);
            border-color: var(--accent);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Edit3 size={16} />
          <span>Draw areas</span>
        </div>

        <button
          className="collapse-button"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sidebar-content">
        {currentAddress && (
          <div className="location-card">
            <div className="location-icon">
              <MapPin size={14} />
            </div>
            <div className="location-text">
              <div className="location-label">Current Property</div>
              <div className="location-address">{currentAddress}</div>
            </div>
          </div>
        )}

        <div className="tab-content">
          <div className="section-header">
            <h3>Manual measurement</h3>
            <p>Outline areas on the map to measure square footage</p>
          </div>

          <div className="draw-controls">
            <button
              className={`button ${drawingMode ? 'success' : 'primary'} draw-button`}
              onClick={() => setDrawingMode(!drawingMode)}
              disabled={!currentAddress}
            >
              {drawingMode ? (
                <>
                  <RotateCcw size={16} />
                  Stop Drawing
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Draw Area
                </>
              )}
            </button>

            {polygons.length > 0 && (
              <button
                className="button danger clear-button"
                onClick={clearAllPolygons}
              >
                <Trash2 size={16} />
                Clear All
              </button>
            )}
          </div>

          <div className="draw-help">
            <p>Click on the map to place corners, then click the first point again to close the polygon.</p>
          </div>
        </div>

        {polygons.length > 0 && (
          <div className="results-summary">
            <div className="summary-header">
              <h4>Current results</h4>
            </div>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-value">{polygons.length}</span>
                <span className="stat-label">Areas</span>
              </div>
              <div className="stat">
                <span className="stat-value">{Math.round(totalArea).toLocaleString()}</span>
                <span className="stat-label">sq ft</span>
              </div>
            </div>
            <button className="button export-button" onClick={handleExport}>
              <Download size={14} />
              Export data
            </button>
          </div>
        )}
      </div>

      <style>{`
        .sidebar {
          width: 320px;
          background: var(--surface-raised);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .sidebar-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--ink);
        }

        .collapse-button {
          background: none;
          border: none;
          color: var(--ink-faint);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .collapse-button:hover {
          background: var(--surface);
          color: var(--ink);
        }

        .sidebar-content {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .location-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--green-50);
          border: 1px solid var(--green-100);
          border-radius: 8px;
        }

        .location-icon {
          color: var(--green-700);
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .location-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--green-700);
          margin-bottom: 0.125rem;
        }

        .location-address {
          font-size: 0.875rem;
          color: var(--ink);
          line-height: 1.3;
        }

        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-header h3 {
          font-size: 1rem;
          font-weight: 500;
          color: var(--ink);
          margin-bottom: 0.25rem;
        }

        .section-header p {
          font-size: 0.875rem;
          color: var(--ink-muted);
          line-height: 1.4;
        }

        .draw-controls {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .draw-button, .clear-button {
          width: 100%;
          padding: 0.75rem;
          font-size: 0.875rem;
          justify-content: center;
        }

        .draw-help {
          padding: 0.75rem;
          background: var(--surface);
          border-radius: 6px;
        }

        .draw-help p {
          font-size: 0.875rem;
          color: var(--ink-muted);
          line-height: 1.4;
          margin: 0;
        }

        .results-summary {
          margin-top: auto;
          padding: 1rem;
          background: var(--surface);
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .summary-header h4 {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--ink);
          margin-bottom: 0.75rem;
        }

        .summary-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--green-700);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--ink-muted);
          margin-top: 0.125rem;
        }

        .export-button {
          width: 100%;
          font-size: 0.875rem;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 56px;
            left: 0;
            height: calc(100vh - 56px);
            z-index: 30;
            transform: translateX(${sidebarOpen ? '0' : '-100%'});
            transition: transform 0.3s ease;
          }
        }
      `}</style>
    </div>
  );
}

export default Sidebar;

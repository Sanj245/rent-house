import React, { useState } from 'react';
import { 
  Home, 
  Users, 
  DollarSign, 
  History, 
  Plus, 
  X, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Calendar,
  Sparkles,
  Settings
} from 'lucide-react';
import MobilePropertyManager from './MobilePropertyManager';
import MobileTenantManager from './MobileTenantManager';
import MobileRentLedger from './MobileRentLedger';
import MobileTenancyHistory from './MobileTenancyHistory';

const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr === '—') return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }
  return dateStr;
};

export default function MobileApp({
  properties,
  setProperties,
  tenants,
  setTenants,
  ledger,
  setLedger,
  pastTenants,
  setPastTenants,
  notifications,
  addProperty,
  editProperty,
  deleteProperty,
  addTenant,
  removeTenant,
  scheduleRentRaise,
  updatePaymentStatus,
  updateTenantNotes,
  handleExportData,
  requestNotificationPermission,
  loadDemoData
}) {
  const [activeTab, setActiveTab] = useState('ledger');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Sheets Control
  const [activeSheet, setActiveSheet] = useState(null); // 'add-property', 'add-tenant', 'quick-pay'
  const [editingProp, setEditingProp] = useState(null);

  const toggleFab = () => setFabOpen(!fabOpen);
  const closeFab = () => setFabOpen(false);

  const openSheet = (sheetName) => {
    if (sheetName === 'add-tenant') {
      const vacantProperties = properties.filter(p => !tenants.some(t => t.propertyId === p.id));
      if (vacantProperties.length === 0) {
        alert('⚠️ No Vacant Properties: Please register a vacant property first before adding a tenant agreement.');
        closeFab();
        return;
      }
    }
    setActiveSheet(sheetName);
    closeFab();
  };

  const closeSheet = () => setActiveSheet(null);

  const houseCode = localStorage.getItem('rentarc_house_code') || '';

  const handleCopyHouseCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(houseCode)
        .then(() => alert('📋 House code copied to clipboard!'))
        .catch(() => fallbackCopyText(houseCode));
    } else {
      fallbackCopyText(houseCode);
    }
  };

  const fallbackCopyText = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('📋 House code copied to clipboard!');
      } else {
        alert('Unable to copy. Please manually copy the code: ' + text);
      }
    } catch (err) {
      alert('Unable to copy. Please manually copy the code: ' + text);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="mobile-app-wrapper">
      
      {/* Top Header Bar */}
      <header className="mobile-header-bar">
        <a href="#" className="mobile-app-title" onClick={() => setActiveTab('ledger')}>
          🏠 Rent<span>Arc</span>
        </a>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Notification Button */}
          <button 
            onClick={async () => {
              if (requestNotificationPermission) {
                await requestNotificationPermission();
              }
              setShowNotifications(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              color: 'var(--mobile-text)'
            }}
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--mobile-secondary)',
                borderRadius: '50%'
              }} />
            )}
          </button>

          {/* Settings Button */}
          <button 
            onClick={() => setShowSettings(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              color: 'var(--mobile-text)'
            }}
            title="Settings & House Code"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Viewport Scrollable Panel */}
      <main className="mobile-viewport-content">
        

        {activeTab === 'properties' && (
          <MobilePropertyManager
            properties={properties}
            tenants={tenants}
            addProperty={addProperty}
            editProperty={editProperty}
            deleteProperty={deleteProperty}
            openSheet={openSheet}
            activeSheet={activeSheet}
            closeSheet={closeSheet}
            editingProp={editingProp}
            setEditingProp={setEditingProp}
          />
        )}

        {activeTab === 'tenants' && (
          <MobileTenantManager
            tenants={tenants}
            properties={properties}
            addTenant={addTenant}
            removeTenant={removeTenant}
            scheduleRentRaise={scheduleRentRaise}
            openSheet={openSheet}
            activeSheet={activeSheet}
            closeSheet={closeSheet}
          />
        )}

        {activeTab === 'ledger' && (
          <MobileRentLedger
            tenants={tenants}
            properties={properties}
            ledger={ledger}
            updatePaymentStatus={updatePaymentStatus}
            updateTenantNotes={updateTenantNotes}
          />
        )}

        {activeTab === 'history' && (
          <MobileTenancyHistory
            properties={properties}
            tenants={tenants}
            pastTenants={pastTenants}
            ledger={ledger}
            handleExportData={handleExportData}
          />
        )}

      </main>



      {/* FAB Overlay & Menu */}
      <div 
        className={`mobile-fab-menu-overlay ${fabOpen ? 'show' : ''}`}
        onClick={closeFab}
      >
        <div className="mobile-fab-menu-container">
          <button className="mobile-fab-menu-item" onClick={() => { setEditingProp(null); openSheet('add-property'); }}>
            <span className="mobile-fab-menu-label">Register Home</span>
            <div className="mobile-fab-menu-icon">
              <Home size={18} />
            </div>
          </button>

          <button className="mobile-fab-menu-item" onClick={() => openSheet('add-tenant')}>
            <span className="mobile-fab-menu-label">Add Agreement</span>
            <div className="mobile-fab-menu-icon">
              <Users size={18} />
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-tabs">

        <button 
          className={`mobile-tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => { setActiveTab('properties'); closeSheet(); }}
        >
          <div className="mobile-tab-icon-wrapper">
            <Home size={20} />
          </div>
          Properties
        </button>

        <button 
          className={`mobile-tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
          onClick={() => { setActiveTab('tenants'); closeSheet(); }}
        >
          <div className="mobile-tab-icon-wrapper">
            <Users size={20} />
          </div>
          Agreements
        </button>

        {/* CENTERED ADD ACTION TAB BUTTON */}
        <button 
          className="mobile-tab-btn"
          onClick={toggleFab}
          aria-label="Toggle actions menu"
        >
          <div className="mobile-tab-add-icon-wrapper">
            <Plus size={22} />
          </div>
          Add
        </button>


        <button 
          className={`mobile-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ledger'); closeSheet(); }}
        >
          <div className="mobile-tab-icon-wrapper">
            <DollarSign size={20} />
          </div>
          Rents
        </button>

        <button 
          className={`mobile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); closeSheet(); }}
        >
          <div className="mobile-tab-icon-wrapper">
            <History size={20} />
          </div>
          Logs
        </button>
      </nav>

      {/* NOTIFICATIONS DRAWER OVERLAY */}
      {showNotifications && (
        <div className="mobile-sheet-overlay" style={{ zIndex: 1200 }} onClick={() => setShowNotifications(false)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔔 Alerts Center
              </h3>
              <button className="mobile-sheet-close" onClick={() => setShowNotifications(false)}>
                <X size={18} />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--mobile-muted)' }}>
                <CheckCircle size={36} style={{ color: 'var(--mobile-primary)', marginBottom: '10px', display: 'inline-block' }} />
                <p style={{ fontWeight: '600' }}>You're all caught up!</p>
                <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>No pending alerts or repairs.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto', paddingBottom: '10px' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--mobile-border)',
                    backgroundColor: '#faf9f6',
                    borderLeft: `4px solid ${n.type === 'repair' ? 'var(--mobile-warning)' : n.type === 'due' ? 'var(--mobile-danger)' : 'var(--mobile-primary)'}`,
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ marginTop: '2px' }}>
                      {n.type === 'repair' ? (
                        <AlertTriangle size={16} style={{ color: 'var(--mobile-warning)' }} />
                      ) : n.type === 'due' ? (
                        <AlertTriangle size={16} style={{ color: 'var(--mobile-danger)' }} />
                      ) : (
                        <Info size={16} style={{ color: 'var(--mobile-primary)' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{n.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--mobile-muted)', marginTop: '2px', lineHeight: '1.4' }}>{n.message}</div>
                      {n.date && <div style={{ fontSize: '0.7rem', color: 'var(--mobile-muted)', marginTop: '4px' }}>📅 Date: {formatDateToDDMMYYYY(n.date)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              className="mobile-btn mobile-btn-primary" 
              onClick={() => setShowNotifications(false)}
              style={{ width: '100%', marginTop: '10px' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MOBILE SETTINGS DRAWER OVERLAY */}
      {showSettings && (
        <div className="mobile-sheet-overlay" style={{ zIndex: 1200 }} onClick={() => setShowSettings(false)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚙️ RentArc Settings
              </h3>
              <button className="mobile-sheet-close" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '16px' }}>
              
              {/* House Code Sync Panel */}
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: '#fcfbf9',
                border: '1px solid var(--mobile-border)'
              }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--mobile-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  🏠 Your House Code
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--mobile-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
                  Trusted family members can enter this code on their devices to view and edit the same live database.
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    flexGrow: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1.5px dashed var(--mobile-primary)',
                    fontFamily: 'monospace',
                    fontSize: '1.05rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    color: 'var(--mobile-text)'
                  }}>
                    {houseCode}
                  </div>
                  <button 
                    onClick={handleCopyHouseCode}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--mobile-primary)',
                      background: 'rgba(61, 106, 84, 0.08)',
                      color: 'var(--mobile-primary)',
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Data Backup Option */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--mobile-text)', marginBottom: '4px' }}>
                  💾 Backup Offline Copy
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--mobile-muted)', lineHeight: '1.4', marginBottom: '8px' }}>
                  Download a physical backup file (`.json`) of all agreements, payments, and registered properties.
                </p>
                <button 
                  className="mobile-btn"
                  onClick={handleExportData}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '0.85rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    marginBottom: '16px'
                  }}
                >
                  Download RentArc Backup
                </button>
              </div>

              {/* Load Mock Demo Data */}
              {loadDemoData && (
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'rgba(212, 163, 115, 0.08)',
                  border: '1px dashed #d4a373'
                }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#d4a373', marginBottom: '4px' }}>
                    🛠️ Testing / Mock Demo Data
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--mobile-muted)', lineHeight: '1.4', marginBottom: '8px' }}>
                    Populate this house with realistic properties, tenant agreements, payment ledgers, and overdue notifications for testing purposes.
                  </p>
                  <button 
                    className="mobile-btn"
                    onClick={loadDemoData}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '0.85rem',
                      background: '#d4a373',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '700'
                    }}
                  >
                    Load Testing Demo Data
                  </button>
                </div>
              )}

              {/* Log Out button */}
              <div style={{ borderTop: '1px solid var(--mobile-border)', paddingTop: '16px' }}>
                <button 
                  className="mobile-btn"
                  onClick={() => {
                    if (window.confirm('Sign out of this house?\n\nYou can re-enter the code anytime to reconnect.')) {
                      localStorage.removeItem('rentarc_house_code');
                      window.location.reload();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontWeight: '700'
                  }}
                >
                  🚪 Sign Out of House
                </button>
              </div>

            </div>

            <button 
              className="mobile-btn mobile-btn-primary" 
              onClick={() => setShowSettings(false)}
              style={{ width: '100%', marginTop: '5px' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC PORTALS (BOTTOM DRAWER SHEETS) */}
      {activeSheet === 'add-property' && (
        <MobilePropertyManager
          properties={properties}
          tenants={tenants}
          addProperty={addProperty}
          editProperty={editProperty}
          deleteProperty={deleteProperty}
          openSheet={openSheet}
          activeSheet={activeSheet}
          closeSheet={closeSheet}
          isPortal={true}
          editingProp={editingProp}
          setEditingProp={setEditingProp}
        />
      )}

      {activeSheet === 'add-tenant' && (
        <MobileTenantManager
          tenants={tenants}
          properties={properties}
          addTenant={addTenant}
          removeTenant={removeTenant}
          scheduleRentRaise={scheduleRentRaise}
          openSheet={openSheet}
          activeSheet={activeSheet}
          closeSheet={closeSheet}
          isPortal={true}
        />
      )}

    </div>
  );
}

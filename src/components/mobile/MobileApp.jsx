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
  handleExportData
}) {
  const [activeTab, setActiveTab] = useState('ledger');
  const [showNotifications, setShowNotifications] = useState(false);
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

  return (
    <div className="mobile-app-wrapper">
      
      {/* Top Header Bar */}
      <header className="mobile-header-bar">
        <a href="#" className="mobile-app-title" onClick={() => setActiveTab('ledger')}>
          🏠 Rent<span>Ease</span>
        </a>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Notification Button */}
          <button 
            onClick={() => setShowNotifications(true)}
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
            <Bell size={22} />
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
                      {n.date && <div style={{ fontSize: '0.7rem', color: 'var(--mobile-muted)', marginTop: '4px' }}>📅 Date: {n.date}</div>}
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

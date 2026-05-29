import React, { useState, useEffect } from 'react';
import { Home, Users, DollarSign, Settings, Download, Bell, Info, AlertTriangle, CheckCircle, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PropertyManager from './components/PropertyManager';
import TenantManager from './components/TenantManager';
import RentLedger from './components/RentLedger';

export default function App() {
  // Initial state is an empty slate (ready for user data entry)
  const [properties, setProperties] = useState(() => {
    const saved = localStorage.getItem('rentease_properties');
    return saved ? JSON.parse(saved) : [];
  });

  const [tenants, setTenants] = useState(() => {
    const saved = localStorage.getItem('rentease_tenants');
    const initialTenants = saved ? JSON.parse(saved) : [];
    
    const todayStr = new Date().toISOString().split('T')[0];
    let updated = false;
    
    const checkedTenants = initialTenants.map(t => {
      if (t.scheduledRaiseEffectiveDate && todayStr >= t.scheduledRaiseEffectiveDate && !t.raiseApplied) {
        const raiseAmt = Math.round((Number(t.rent) * Number(t.scheduledRaisePercent)) / 100);
        const newRent = Number(t.rent) + raiseAmt;
        const history = t.rentHistory || [{ date: t.moveInDate, amount: t.rent, reason: 'Starting Rent' }];
        
        updated = true;
        return {
          ...t,
          rent: newRent,
          raiseApplied: true,
          rentHistory: [
            ...history,
            { 
              date: t.scheduledRaiseEffectiveDate, 
              amount: newRent, 
              reason: `Automatic ${t.scheduledRaisePercent}% Raise Applied` 
            }
          ]
        };
      }
      return t;
    });
    
    if (updated) {
      localStorage.setItem('rentease_tenants', JSON.stringify(checkedTenants));
      return checkedTenants;
    }
    return initialTenants;
  });

  const [ledger, setLedger] = useState(() => {
    const saved = localStorage.getItem('rentease_ledger');
    return saved ? JSON.parse(saved) : {};
  });

  // Navigation State
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  // Dynamic notifications list
  const getNotifications = () => {
    const list = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Rent raises (upcoming & recent)
    tenants.forEach(t => {
      // Upcoming
      if (t.scheduledRaiseEffectiveDate && !t.raiseApplied) {
        const raiseDate = new Date(t.scheduledRaiseEffectiveDate);
        const diffTime = raiseDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) {
          const raiseAmt = Math.round((Number(t.rent) * Number(t.scheduledRaisePercent)) / 100);
          const previewRent = Number(t.rent) + raiseAmt;
          list.push({
            id: `upcoming-raise-${t.id}`,
            title: `Rent Increase Scheduled`,
            message: `${t.name}'s rent will raise by ${t.scheduledRaisePercent}% to ₹${previewRent} on ${t.scheduledRaiseEffectiveDate} (${diffDays} days left).`,
            type: 'upcoming-raise',
            date: t.scheduledRaiseEffectiveDate
          });
        }
      }
      // Recent applied raise
      if (t.raiseApplied && t.rentHistory) {
        const latestRaise = t.rentHistory.find(h => h.reason && h.reason.includes('Raise Applied'));
        if (latestRaise) {
          const raiseDate = new Date(latestRaise.date);
          const diffTime = today - raiseDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 30 && diffDays >= 0) {
            list.push({
              id: `recent-raise-${t.id}`,
              title: `🎉 Rent Increase Applied`,
              message: `Rent for ${t.name} was automatically increased to ₹${t.rent} starting ${latestRaise.date} (${diffDays} days ago).`,
              type: 'recent-raise',
              date: latestRaise.date
            });
          }
        }
      }
    });

    // 2. Repairs
    properties.forEach(p => {
      if (p.items) {
        Object.entries(p.items).forEach(([item, condition]) => {
          if (condition === 'Needs Repair') {
            list.push({
              id: `repair-${p.id}-${item}`,
              title: `🛠️ Repair Needed`,
              message: `"${item}" at ${p.name} needs repair.`,
              type: 'repair',
              date: todayStr
            });
          }
        });
      }
    });

    // 3. Rent Due for current month
    const monthsKeys = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = today.getMonth();
    const currentMonthKey = monthsKeys[currentMonthIndex];
    tenants.forEach(t => {
      const tenantPayments = ledger[t.id] || {};
      const currentPay = tenantPayments[currentMonthKey];
      
      if (t.moveInDate) {
        const moveInParts = t.moveInDate.split('-');
        if (moveInParts.length >= 2) {
          const moveInMonth = parseInt(moveInParts[1], 10);
          if (currentMonthIndex + 1 >= moveInMonth) {
            let isUnmarked = !currentPay;
            if (currentPay) {
              if (typeof currentPay === 'string') {
                isUnmarked = currentPay !== 'Paid' && currentPay !== 'Unpaid' && currentPay !== 'Partial';
              } else {
                isUnmarked = currentPay.status !== 'Paid' && currentPay.status !== 'Partial';
              }
            }
            if (isUnmarked) {
              list.push({
                id: `due-${t.id}-${currentMonthKey}`,
                title: `💰 Rent Pending`,
                message: `Rent for ${t.name} is due for ${currentMonthKey}.`,
                type: 'due',
                date: todayStr
              });
            }
          }
        }
      }
    });

    return list;
  };

  const notifications = getNotifications();

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('rentease_properties', JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem('rentease_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('rentease_ledger', JSON.stringify(ledger));
  }, [ledger]);

  // Operations
  const addProperty = (newProp) => {
    const propId = `prop-${Date.now()}`;
    setProperties(prev => [...prev, { ...newProp, id: propId }]);
  };

  const editProperty = (id, updatedProp) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updatedProp } : p));
  };

  const deleteProperty = (id) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    const associatedTenant = tenants.find(t => t.propertyId === id);
    if (associatedTenant) {
      removeTenant(associatedTenant.id, id);
    }
  };

  const addTenant = (newTenant) => {
    const tenantId = `tenant-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    let processedTenant = { ...newTenant, id: tenantId };
    
    // If scheduled raise effective date is today or in the past, apply immediately
    if (processedTenant.scheduledRaiseEffectiveDate && todayStr >= processedTenant.scheduledRaiseEffectiveDate && !processedTenant.raiseApplied) {
      const raiseAmt = Math.round((Number(processedTenant.rent) * Number(processedTenant.scheduledRaisePercent)) / 100);
      const newRent = Number(processedTenant.rent) + raiseAmt;
      const history = processedTenant.rentHistory || [{ date: processedTenant.moveInDate, amount: processedTenant.rent, reason: 'Starting Rent' }];
      
      processedTenant = {
        ...processedTenant,
        rent: newRent,
        raiseApplied: true,
        rentHistory: [
          ...history,
          { 
            date: processedTenant.scheduledRaiseEffectiveDate, 
            amount: newRent, 
            reason: `Automatic ${processedTenant.scheduledRaisePercent}% Raise Applied` 
          }
        ]
      };
    }

    setTenants(prev => [...prev, processedTenant]);
    setProperties(prev => prev.map(p => p.id === newTenant.propertyId ? { ...p, status: 'Occupied' } : p));
    setLedger(prev => ({ ...prev, [tenantId]: {} }));
  };

  const removeTenant = (tenantId, propertyId) => {
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'Vacant' } : p));
    setLedger(prev => {
      const copy = { ...prev };
      delete copy[tenantId];
      return copy;
    });
  };

  const scheduleRentRaise = (tenantId, percent, effectiveDate) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        let updatedTenant = {
          ...t,
          scheduledRaisePercent: Number(percent),
          scheduledRaiseEffectiveDate: effectiveDate,
          raiseApplied: false
        };
        
        // If the scheduled date is today/past, apply raise instantly
        if (effectiveDate && todayStr >= effectiveDate) {
          const raiseAmt = Math.round((Number(updatedTenant.rent) * Number(percent)) / 100);
          const newRent = Number(updatedTenant.rent) + raiseAmt;
          const history = updatedTenant.rentHistory || [{ date: updatedTenant.moveInDate, amount: updatedTenant.rent, reason: 'Starting Rent' }];
          
          updatedTenant = {
            ...updatedTenant,
            rent: newRent,
            raiseApplied: true,
            rentHistory: [
              ...history,
              { 
                date: effectiveDate, 
                amount: newRent, 
                reason: `Automatic ${percent}% Raise Applied` 
              }
            ]
          };
          alert(`🎉 Raise Applied Immediately!\n\nThe effective date is in the past/today, so rent was increased to ₹${newRent}.`);
        } else {
          alert(`📅 Raise Scheduled Successfully!\n\nAn automatic ${percent}% raise is scheduled for ${effectiveDate}.`);
        }
        return updatedTenant;
      }
      return t;
    }));
  };

  const updatePaymentStatus = (tenantId, monthKey, statusDetails) => {
    setLedger(prev => {
      const tenantHistory = prev[tenantId] || {};
      return {
        ...prev,
        [tenantId]: {
          ...tenantHistory,
          [monthKey]: statusDetails
        }
      };
    });
  };

  const updateTenantNotes = (tenantId, notes) => {
    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        return { ...t, notes };
      }
      return t;
    }));
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ properties, tenants, ledger }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `RentEase-Backup.json`);
    linkElement.click();
  };

  return (
    <div id="app-root" className="app-layout">
      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="#" className="app-logo" onClick={() => setCurrentTab('dashboard')}>
              🏠 Rent<span className="app-logo-span">Ease</span>
            </a>
            <button 
              className="notification-bell-btn" 
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
                color: 'var(--text-main)',
                transition: 'var(--transition-normal)',
                borderRadius: '50%'
              }}
              title="Open Alerts Center"
            >
              <Bell size={22} />
              {notifications.length > 0 && (
                <span className="bell-badge-pulse" style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '9px',
                  height: '9px',
                  backgroundColor: 'var(--color-secondary)',
                  borderRadius: '50%'
                }} />
              )}
            </button>
          </div>
          
          <nav className="nav-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '32px' }}>
            <button 
              className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`nav-link ${currentTab === 'properties' ? 'active' : ''}`}
              onClick={() => setCurrentTab('properties')}
            >
              🏠 Properties
            </button>
            <button 
              className={`nav-link ${currentTab === 'tenants' ? 'active' : ''}`}
              onClick={() => setCurrentTab('tenants')}
            >
              👥 Agreements
            </button>
            <button 
              className={`nav-link ${currentTab === 'ledger' ? 'active' : ''}`}
              onClick={() => setCurrentTab('ledger')}
            >
              📅 Rents
            </button>
            <button 
              className={`nav-link ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentTab('settings')}
            >
              ⚙️ Settings
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Badge */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          🔒 Private Local Ledger
          <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>All data saved offline in browser</div>
        </div>
      </aside>

      {/* MOBILE TOP HEADER BAR (Only visible on mobile viewport) */}
      <header className="main-header">
        <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <a href="#" className="app-logo" onClick={() => setCurrentTab('dashboard')}>
            🏠 Rent<span className="app-logo-span">Ease</span>
          </a>
          <button 
            className="notification-bell-btn" 
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
              color: 'var(--text-main)'
            }}
            title="Open Alerts Center"
          >
            <Bell size={22} />
            {notifications.length > 0 && (
              <span className="bell-badge-pulse" style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '9px',
                height: '9px',
                backgroundColor: 'var(--color-secondary)',
                borderRadius: '50%'
              }} />
            )}
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="nav-container nav-mobile-bar" style={{ display: 'none' }}>
        <button 
          className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <Home size={20} />
          Dashboard
        </button>
        <button 
          className={`nav-link ${currentTab === 'properties' ? 'active' : ''}`}
          onClick={() => setCurrentTab('properties')}
        >
          <Home size={20} />
          Properties
        </button>
        <button 
          className={`nav-link ${currentTab === 'tenants' ? 'active' : ''}`}
          onClick={() => setCurrentTab('tenants')}
        >
          <Users size={20} />
          Agreements
        </button>
        <button 
          className={`nav-link ${currentTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setCurrentTab('ledger')}
        >
          <DollarSign size={20} />
          Rents
        </button>
        <button 
          className={`nav-link ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentTab('settings')}
        >
          <Settings size={20} />
          Settings
        </button>
      </div>

      {/* RIGHT SIDE / MAIN SCROLLABLE CONTENT */}
      <div className="main-content">
        <main className="app-container" style={{ maxWidth: '100%', padding: 0 }}>
          
          {currentTab === 'dashboard' && (
            <Dashboard 
              properties={properties}
              tenants={tenants}
              ledger={ledger}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'properties' && (
            <PropertyManager 
              properties={properties}
              tenants={tenants}
              addProperty={addProperty}
              editProperty={editProperty}
              deleteProperty={deleteProperty}
            />
          )}

          {currentTab === 'tenants' && (
            <TenantManager 
              tenants={tenants}
              properties={properties}
              addTenant={addTenant}
              removeTenant={removeTenant}
              updateTenantRent={scheduleRentRaise}
            />
          )}

          {currentTab === 'ledger' && (
            <RentLedger 
              tenants={tenants}
              properties={properties}
              ledger={ledger}
              updatePaymentStatus={updatePaymentStatus}
              updateTenantNotes={updateTenantNotes}
            />
          )}

          {currentTab === 'settings' && (
            <div className="settings-box">
              <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
                ⚙️ Dashboard Settings & Data Backups
              </h2>

              <div className="settings-group" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <h3 className="settings-title">
                  <Download size={18} style={{ color: 'var(--color-secondary)' }} />
                  Save My Data (Download Backup File)
                </h3>
                <p className="settings-description">
                  Your data is stored securely and privately in this local browser. To save a safe physical backup copy of your properties, tenants, and monthly payment records directly on your computer, click the download button below:
                </p>
                <button className="btn btn-primary" onClick={handleExportData}>
                  💾 Click to Save Data
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* DETAILED NOTIFICATIONS OVERLAY MODAL */}
      {showNotifications && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '440px', borderRadius: 'var(--radius-lg)' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔔 Notifications Center
              </h3>
              <button 
                onClick={() => setShowNotifications(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <CheckCircle size={36} style={{ color: 'var(--color-primary)', marginBottom: '10px', display: 'inline-block' }} />
                <p style={{ fontWeight: '600' }}>You're all caught up!</p>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>No pending alerts, repair items, or upcoming rent adjustments.</p>
              </div>
            ) : (
              <div className="notification-list-scrollable" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-app)',
                    borderLeft: `4px solid ${n.type === 'repair' ? 'var(--color-warning)' : n.type === 'due' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ marginTop: '2px' }}>
                      {n.type === 'repair' ? (
                        <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
                      ) : n.type === 'due' ? (
                        <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
                      ) : (
                        <Info size={16} style={{ color: 'var(--color-primary)' }} />
                      )}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{n.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>{n.message}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>📅 Date: {n.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowNotifications(false)}
              style={{ width: '100%', marginTop: '20px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

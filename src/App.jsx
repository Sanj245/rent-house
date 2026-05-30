import React, { useState, useEffect } from 'react';
import { Home, Users, DollarSign, Settings, Download, Bell, Info, AlertTriangle, CheckCircle, X, History } from 'lucide-react';

import PropertyManager from './components/PropertyManager';
import TenantManager from './components/TenantManager';
import RentLedger from './components/RentLedger';
import TenancyHistory from './components/TenancyHistory';
import MobileApp from './components/mobile/MobileApp';
import './mobile.css';

import { getValue, setValue } from './db';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [pastTenants, setPastTenants] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [ledger, setLedger] = useState({});

  // 11-Month raise engine helper
  const checkTenantsRaise = (initialTenants) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let updated = false;
    
    const checkedTenants = initialTenants.map(t => {
      let temp = { ...t };
      let changed = false;

      // Rent raise
      if (temp.scheduledRaiseEffectiveDate && todayStr >= temp.scheduledRaiseEffectiveDate && !temp.raiseApplied) {
        const raiseAmt = Math.round((Number(temp.rent) * Number(temp.scheduledRaisePercent)) / 100);
        const newRent = Number(temp.rent) + raiseAmt;
        const history = temp.rentHistory || [{ date: temp.moveInDate, amount: temp.rent, reason: 'Starting Rent' }];
        
        temp.rent = newRent;
        temp.raiseApplied = true;
        temp.rentHistory = [
          ...history,
          { 
            date: temp.scheduledRaiseEffectiveDate, 
            amount: newRent, 
            reason: `Automatic ${temp.scheduledRaisePercent}% Raise Applied` 
          }
        ];
        changed = true;
      }

      if (changed) {
        updated = true;
      }
      return temp;
    });

    if (updated) {
      setValue('rentease_tenants', checkedTenants);
    }
    return checkedTenants;
  };

  // Hydrate states from IndexedDB / localStorage on mount
  useEffect(() => {
    async function loadData() {
      try {
        let props = await getValue('rentease_properties', null);
        let tnts = await getValue('rentease_tenants', null);
        let ledg = await getValue('rentease_ledger', null);
        let past = await getValue('rentease_past_tenants', null);

        // Fallback / migration from localStorage
        if (props === null) {
          const saved = localStorage.getItem('rentease_properties');
          props = saved ? JSON.parse(saved) : [];
          if (props.length > 0) await setValue('rentease_properties', props);
        }
        if (tnts === null) {
          const saved = localStorage.getItem('rentease_tenants');
          tnts = saved ? JSON.parse(saved) : [];
          if (tnts.length > 0) await setValue('rentease_tenants', tnts);
        }
        if (ledg === null) {
          const saved = localStorage.getItem('rentease_ledger');
          ledg = saved ? JSON.parse(saved) : {};
          if (Object.keys(ledg).length > 0) await setValue('rentease_ledger', ledg);
        }
        if (past === null) {
          const saved = localStorage.getItem('rentease_past_tenants');
          past = saved ? JSON.parse(saved) : [];
          if (past.length > 0) await setValue('rentease_past_tenants', past);
        }

        if (props) setProperties(props);
        if (tnts) setTenants(checkTenantsRaise(tnts));
        if (ledg) setLedger(ledg);
        if (past) setPastTenants(past);
      } catch (err) {
        console.error("Error loading data from IndexedDB:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Navigation State
  const [currentTab, setCurrentTab] = useState('ledger');
  const [showNotifications, setShowNotifications] = useState(false);

  // Dynamic notifications list
  const getNotifications = () => {
    const list = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Rent raises only
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

  // Sync to IndexedDB
  useEffect(() => {
    if (!loading) {
      setValue('rentease_properties', properties);
    }
  }, [properties, loading]);

  useEffect(() => {
    if (!loading) {
      setValue('rentease_tenants', tenants);
    }
  }, [tenants, loading]);

  useEffect(() => {
    if (!loading) {
      setValue('rentease_ledger', ledger);
    }
  }, [ledger, loading]);

  useEffect(() => {
    if (!loading) {
      setValue('rentease_past_tenants', pastTenants);
    }
  }, [pastTenants, loading]);

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
            reason: `Automatic ${processedTenant.scheduledRaisePercent}% Rent Raise Applied` 
          }
        ]
      };
    }


    setTenants(prev => [...prev, processedTenant]);
    setProperties(prev => prev.map(p => p.id === newTenant.propertyId ? { ...p, status: 'Occupied' } : p));
    setLedger(prev => ({ ...prev, [tenantId]: {} }));
  };

  const removeTenant = (tenantId, propertyId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      const tenantPayments = ledger[tenantId] || {};
      let totalRentCollected = 0;
      Object.values(tenantPayments).forEach(pay => {
        if (pay) {
          if (typeof pay === 'string' && pay === 'Paid') {
            totalRentCollected += Number(tenant.rent);
          } else if (typeof pay === 'object') {
            if (pay.status === 'Paid') {
              totalRentCollected += Number(pay.paid || pay.rentDue || tenant.rent);
            } else if (pay.status === 'Partial') {
              totalRentCollected += Number(pay.paid || 0);
            }
          }
        }
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const pastRecord = {
        id: `${tenant.id}-past-${Date.now()}`,
        name: tenant.name,
        phone: tenant.phone,
        propertyId: tenant.propertyId,
        propertyName: properties.find(p => p.id === tenant.propertyId)?.name || 'Unknown',
        moveInDate: tenant.moveInDate,
        moveOutDate: todayStr,
        totalRentCollected: totalRentCollected,
        securityDeposit: tenant.securityDeposit,
        rent: tenant.rent
      };
      setPastTenants(prev => [...prev, pastRecord]);
    }

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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at top right, #3d6a54, #1a2c22, #0d1510)',
        color: '#ffffff',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div className="loader-spinner" style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: '#d4a373',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <h3 style={{ fontWeight: '500', fontSize: '1.2rem', letterSpacing: '0.5px' }}>RentEase Dossiers</h3>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>Loading secure local storage...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileApp 
        properties={properties}
        setProperties={setProperties}
        tenants={tenants}
        setTenants={setTenants}
        ledger={ledger}
        setLedger={setLedger}
        pastTenants={pastTenants}
        setPastTenants={setPastTenants}
        notifications={notifications}
        addProperty={addProperty}
        editProperty={editProperty}
        deleteProperty={deleteProperty}
        addTenant={addTenant}
        removeTenant={removeTenant}
        scheduleRentRaise={scheduleRentRaise}
        updatePaymentStatus={updatePaymentStatus}
        updateTenantNotes={updateTenantNotes}
        handleExportData={handleExportData}
      />
    );
  }

  return (
    <div id="app-root" className="app-layout">
      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="#" className="app-logo" onClick={() => setCurrentTab('ledger')}>
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
              className={`nav-link ${currentTab === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentTab('history')}
            >
              📖 History Logs
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
          <a href="#" className="app-logo" onClick={() => setCurrentTab('ledger')}>
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
          className={`nav-link ${currentTab === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentTab('history')}
        >
          <History size={20} />
          Logs
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

          {currentTab === 'history' && (
            <TenancyHistory 
              properties={properties}
              tenants={tenants}
              pastTenants={pastTenants}
              ledger={ledger}
            />
          )}

          {currentTab === 'settings' && (
            <div className="settings-box">
              <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
                ⚙️ Settings & Data Backups
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

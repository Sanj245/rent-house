import React from 'react';
import { Home, Users, DollarSign, ShieldAlert, Award, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Dashboard({ 
  properties, 
  tenants, 
  ledger, 
  setCurrentTab 
}) {
  // 1. Calculate Statistics
  const totalProps = properties.length;
  const occupiedProps = properties.filter(p => p.status === 'Occupied').length;
  const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;
  
  const totalRentRoll = tenants.reduce((sum, t) => sum + Number(t.rent), 0);
  const totalEscrow = tenants.reduce((sum, t) => sum + Number(t.securityDeposit || 0), 0);

  // 2. Generate Alerts
  const alerts = [];
  const today = new Date();

  // Automatic Scheduled Rent Raise Alerts (coming up in the next 30 days)
  tenants.forEach(tenant => {
    if (tenant.scheduledRaiseEffectiveDate && !tenant.raiseApplied) {
      const raiseDate = new Date(tenant.scheduledRaiseEffectiveDate);
      const diffTime = raiseDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const previewAmt = Math.round((Number(tenant.rent) * Number(tenant.scheduledRaisePercent)) / 100);
      const previewRent = Number(tenant.rent) + previewAmt;

      if (diffDays <= 30 && diffDays >= 0) {
        alerts.push({
          id: `upcoming-raise-${tenant.id}`,
          type: 'info',
          title: `Upcoming Automatic Rent Increase in ${diffDays} Days`,
          text: `${tenant.name} is scheduled for an automatic ${tenant.scheduledRaisePercent}% rent raise on ${tenant.scheduledRaiseEffectiveDate}.`,
          details: `Rent will automatically increase from ₹${tenant.rent} to ₹${previewRent} (+₹${previewAmt}) on the effective date.`,
          actionLabel: `👥 Manage Agreement`,
          action: () => setCurrentTab('tenants')
        });
      }
    }
  });

  // Repair Alerts: House items marked as "Needs Repair"
  properties.forEach(prop => {
    if (prop.items) {
      Object.entries(prop.items).forEach(([itemName, condition]) => {
        if (condition === 'Needs Repair') {
          alerts.push({
            id: `repair-${prop.id}-${itemName}`,
            type: 'warning',
            title: `Repair Needed at ${prop.name}`,
            text: `The "${itemName}" is marked as "Needs Repair".`,
            details: `Arrange maintenance checkup for this item soon.`,
            actionLabel: `🛠️ View Property Items`,
            action: () => setCurrentTab('properties')
          });
        }
      });
    }
  });

  return (
    <div>
      {/* Welcome Banner */}
      <div className="notebook-header">
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.5px' }}>
            Rent Registry Logbook
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Review the status of your Indian rental properties, active tenants, and monthly rent logs.
          </p>
        </div>
      </div>

      {/* Main Metric Cards (Indian Rupees ₹) */}
      <div className="dashboard-grid" style={{ marginTop: '16px' }}>
        <div className="metric-card" onClick={() => setCurrentTab('properties')} style={{ cursor: 'pointer', position: 'relative', marginTop: '24px', borderTopLeftRadius: '0px' }}>
          <div className="card-folder-tab tab-property" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.65rem' }}>
            🏷️ Homes
          </div>
          <div className="metric-icon-box bg-emerald">
            <Home size={22} />
          </div>
          <div className="metric-details">
            <h3>Properties</h3>
            <div className="value">{totalProps} Homes</div>
          </div>
        </div>

        <div className="metric-card" onClick={() => setCurrentTab('properties')} style={{ cursor: 'pointer', position: 'relative', marginTop: '24px', borderTopLeftRadius: '0px' }}>
          <div className="card-folder-tab tab-occupied" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.65rem' }}>
            📊 Stats
          </div>
          <div className="metric-icon-box bg-blue">
            <Users size={22} />
          </div>
          <div className="metric-details">
            <h3>Occupancy</h3>
            <div className="value">{occupancyRate}%</div>
          </div>
        </div>

        <div className="metric-card" onClick={() => setCurrentTab('ledger')} style={{ cursor: 'pointer', position: 'relative', marginTop: '24px', borderTopLeftRadius: '0px' }}>
          <div className="card-folder-tab tab-ledger" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.65rem' }}>
            ₹ Ledger
          </div>
          <div className="metric-icon-box bg-purple">
            <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>₹</span>
          </div>
          <div className="metric-details">
            <h3>Monthly Rent Roll</h3>
            <div className="value">₹{totalRentRoll}</div>
          </div>
        </div>

        <div className="metric-card" onClick={() => setCurrentTab('tenants')} style={{ cursor: 'pointer', position: 'relative', marginTop: '24px', borderTopLeftRadius: '0px' }}>
          <div className="card-folder-tab tab-dossier" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.65rem' }}>
            🔒 Deposit
          </div>
          <div className="metric-icon-box bg-amber">
            <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>₹</span>
          </div>
          <div className="metric-details">
            <h3>Security Deposits</h3>
            <div className="value">₹{totalEscrow}</div>
          </div>
        </div>
      </div>

      {/* Actionable Alerts Panel */}
      <div className="alerts-section">
        <div className="alerts-header">
          <ShieldAlert size={20} style={{ color: 'var(--color-secondary)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Operational Highlights & Maintenance</h3>
        </div>

        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
            <CheckCircle size={32} style={{ color: 'var(--color-primary)', marginBottom: '8px', display: 'inline-block' }} />
            <p style={{ fontSize: '1rem', fontWeight: '600' }}>All clear! No property items require repairs or automatic rent increases soon.</p>
          </div>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-item ${alert.type}`}>
                <div style={{ marginTop: '2px' }}>
                  <AlertTriangle size={18} style={{ 
                    color: alert.type === 'urgent' ? 'var(--color-danger)' : alert.type === 'warning' ? 'var(--color-warning)' : 'var(--color-secondary)' 
                  }} />
                </div>
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-text">{alert.text}</div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px' }}>{alert.details}</div>
                  
                  {alert.action && (
                    <div className="alert-actions">
                      <button 
                        className="btn btn-primary" 
                        onClick={alert.action}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', minHeight: '32px' }}
                      >
                        {alert.actionLabel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indian Landlord Tips Card */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid var(--border-color)',
        padding: '20px',
        borderRadius: 'var(--radius-lg)'
      }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '10px' }}>
          🇮🇳 Indian Landlord Guidelines
        </h3>
        <ul style={{ paddingLeft: '16px', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>Always log the **Security Deposit** details upon tenant move-in for easy adjustment calculations when they vacate.</li>
          <li>For automatic rent increases, fill out the **Scheduled Rent Raise** percentage and effective date on the tenant agreement forms.</li>
          <li>The system will automatically calculate and apply the raised amount to your rents ledger from the effective date onward!</li>
        </ul>
      </div>
    </div>
  );
}

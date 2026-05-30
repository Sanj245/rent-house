import React, { useState, useEffect } from 'react';
import { 
  Clipboard, 
  DollarSign, 
  Users, 
  Award,
  Download,
  Database,
  Calendar,
  History,
  Info
} from 'lucide-react';

export default function MobileTenancyHistory({
  properties,
  tenants,
  pastTenants = [],
  ledger,
  handleExportData
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties.length > 0 ? properties[0].id : ''
  );

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  function getPropertyName(id) {
    const p = properties.find(prop => prop.id === id);
    return p ? p.name : 'Unknown';
  }

  // Calculate aggregated revenue for a single property
  const getPropertyFinancials = (property) => {
    const propertyPast = pastTenants.filter(t => t.propertyId === property.id);
    const activeTenant = tenants.find(t => t.propertyId === property.id);

    // Sum past tenancies
    const pastRentSum = propertyPast.reduce((sum, t) => sum + Number(t.totalRentCollected || 0), 0);

    // Sum active tenancy ledger payments
    let activeRentSum = 0;
    if (activeTenant) {
      const activePayments = ledger[activeTenant.id] || {};
      Object.values(activePayments).forEach(pay => {
        if (pay) {
          if (typeof pay === 'string' && pay === 'Paid') {
            activeRentSum += Number(activeTenant.rent);
          } else if (typeof pay === 'object') {
            if (pay.status === 'Paid') {
              activeRentSum += Number(pay.paid || pay.rentDue || activeTenant.rent);
            } else if (pay.status === 'Partial') {
              activeRentSum += Number(pay.paid || 0);
            }
          }
        }
      });
    }

    const totalRevenue = pastRentSum + activeRentSum;
    const totalTransactions = propertyPast.length + (activeTenant ? 1 : 0);

    return {
      totalRevenue,
      activeRent: activeTenant ? activeTenant.rent : 0,
      activeTenantName: activeTenant ? activeTenant.name : null,
      totalTransactions,
      pastCount: propertyPast.length
    };
  };

  const generatePropertyPDF = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const financials = getPropertyFinancials(property);
    const propertyPast = pastTenants.filter(t => t.propertyId === property.id);
    const activeTenant = tenants.find(t => t.propertyId === property.id);
    const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const pastRows = propertyPast.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;font-style:italic;">No vacated tenants archived yet.</td></tr>`
      : propertyPast.map(t => `
          <tr style="border-bottom:1px solid #e8e4dd;">
            <td style="padding:10px 8px;font-weight:700;">${t.name}</td>
            <td style="padding:10px 8px;color:#555;">${t.phone}</td>
            <td style="padding:10px 8px;">${t.moveInDate}</td>
            <td style="padding:10px 8px;font-weight:600;">${t.moveOutDate}</td>
            <td style="padding:10px 8px;text-align:right;font-weight:800;color:#3d6a54;">₹${Number(t.totalRentCollected).toLocaleString('en-IN')}</td>
          </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Property Log – ${property.name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a2c22;font-size:13px;}
        .page{max-width:800px;margin:0 auto;padding:40px 48px;}
        .header{border-bottom:3px solid #3d6a54;padding-bottom:20px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start;}
        .logo{font-size:22px;font-weight:900;color:#3d6a54;}.logo span{color:#cc5a37;}
        .property-title{font-size:20px;font-weight:800;margin-bottom:4px;}
        .property-meta{font-size:12px;color:#666;}
        .stats{display:flex;gap:16px;margin:24px 0;}
        .stat-box{flex:1;padding:14px 18px;border-radius:10px;border:1px solid #e8e4dd;}
        .stat-box.green{background:#f0f6f3;border-color:#b5d5c5;}
        .stat-box.orange{background:#fdf6f3;border-color:#f0c8b8;}
        .stat-box.grey{background:#f8f8f6;border-color:#ddd;}
        .stat-label{font-size:10px;text-transform:uppercase;font-weight:800;letter-spacing:0.5px;color:#888;margin-bottom:6px;}
        .stat-value{font-size:20px;font-weight:900;color:#3d6a54;}
        .stat-value.orange{color:#cc5a37;}.stat-value.grey{font-size:16px;color:#333;}
        .section-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px dashed #ddd;}
        table{width:100%;border-collapse:collapse;}thead tr{background:#f0f6f3;}
        th{padding:10px 8px;text-align:left;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.4px;color:#555;}
        th:last-child{text-align:right;}td{padding:10px 8px;font-size:12.5px;}
        .active-badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800;}
        .active-badge.occ{background:#e6f2ec;color:#3d6a54;}.active-badge.vac{background:#fff8e6;color:#a0620f;}
        .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8e4dd;font-size:10px;color:#aaa;display:flex;justify-content:space-between;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      </style></head><body>
      <div class="page">
        <div class="header">
          <div><div class="logo">🏠 Rent<span>Ease</span></div><div style="font-size:11px;color:#888;margin-top:2px;">Private Local Landlord Ledger</div></div>
          <div style="font-size:11px;color:#888;text-align:right;"><div style="font-weight:700;color:#333;">Property Log Report</div><div>Generated: ${generatedOn}</div></div>
        </div>
        <div class="property-title">🏠 ${property.name}</div>
        <div class="property-meta">📍 ${property.address} &nbsp;•&nbsp; Type: ${property.type} &nbsp;•&nbsp;
          <span class="active-badge ${activeTenant ? 'occ' : 'vac'}">${activeTenant ? '🟢 Occupied' : '⚪ Vacant'}</span>
        </div>
        <div class="stats">
          <div class="stat-box green"><div class="stat-label">Total Rent Collected</div><div class="stat-value">₹${financials.totalRevenue.toLocaleString('en-IN')}</div></div>
          <div class="stat-box orange"><div class="stat-label">Current Monthly Rent</div><div class="stat-value orange">${activeTenant ? '₹' + activeTenant.rent + '/mo' : 'Vacant'}</div></div>
          <div class="stat-box grey"><div class="stat-label">Tenancy Cycles</div><div class="stat-value grey">${financials.totalTransactions} total</div></div>
        </div>
        ${activeTenant ? `
        <div class="section-title">✅ Current Active Tenant</div>
        <table><thead><tr><th>Tenant Name</th><th>Phone</th><th>Move-In</th><th>Security Deposit</th><th style="text-align:right;">Monthly Rent</th></tr></thead>
        <tbody><tr style="border-bottom:1px solid #e8e4dd;">
          <td style="font-weight:700;">${activeTenant.name}</td><td>${activeTenant.phone}</td><td>${activeTenant.moveInDate}</td>
          <td>₹${Number(activeTenant.securityDeposit).toLocaleString('en-IN')}</td>
          <td style="text-align:right;font-weight:800;color:#3d6a54;">₹${Number(activeTenant.rent).toLocaleString('en-IN')}/mo</td>
        </tr></tbody></table>` : ''}
        <div class="section-title">📜 Historical Tenancy Registers (${propertyPast.length} archived)</div>
        <table><thead><tr><th>Past Tenant</th><th>Phone No.</th><th>Move-In</th><th>Move-Out</th><th style="text-align:right;">Rent Collected</th></tr></thead>
        <tbody>${pastRows}</tbody></table>
        <div class="footer"><span>RentEase — Private Local Landlord Ledger</span><span>${property.name} • ${generatedOn}</span></div>
      </div></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) { win.onload = () => { setTimeout(() => { win.print(); }, 400); }; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '2px' }}>
          Logs & profit Board
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--mobile-muted)' }}>
          Historical records of closed agreements, aggregated yields, and local offline database configurations.
        </p>
      </div>

      {properties.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 16px', 
          backgroundColor: 'var(--mobile-card-bg)', 
          borderRadius: 'var(--mobile-radius)',
          border: '1px solid var(--mobile-border)'
        }}>
          <Clipboard size={36} style={{ color: 'var(--mobile-muted)', marginBottom: '10px', display: 'inline-block' }} />
          <h4 style={{ fontWeight: '800', fontSize: '1rem' }}>No Houses Listed</h4>
          <p style={{ fontSize: '0.76rem', color: 'var(--mobile-muted)', marginTop: '4px' }}>
            Agregated yields will populate once your rental property registry is set.
          </p>
        </div>
      ) : (
        <>
          {/* horizontal properties pills + download button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="mobile-pills-row">
              {properties.map(p => {
                const isActive = p.id === selectedPropertyId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPropertyId(p.id)}
                    className={`mobile-pill-btn ${isActive ? 'active' : ''}`}
                  >
                    🏠 {p.name}
                  </button>
                );
              })}
            </div>
            <button
              className="mobile-btn mobile-btn-primary"
              onClick={() => generatePropertyPDF(selectedPropertyId)}
              style={{ width: '100%', gap: '6px', height: '42px', fontSize: '0.82rem' }}
            >
              <Download size={15} /> Download Property PDF Report
            </button>
          </div>

          {/* Aggregated Property Logs Card Sheet */}
          {(() => {
            const property = properties.find(p => p.id === selectedPropertyId) || properties[0];
            if (!property) return null;

            const financials = getPropertyFinancials(property);
            const propertyPast = pastTenants.filter(t => t.propertyId === property.id);
            const activeTenant = tenants.find(t => t.propertyId === property.id);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* yield analysis block */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  
                  <div style={{
                    backgroundColor: 'rgba(61, 106, 84, 0.04)',
                    border: '1px solid rgba(61, 106, 84, 0.12)',
                    borderRadius: '16px',
                    padding: '14px',
                    boxShadow: 'var(--mobile-shadow)'
                  }}>
                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--mobile-muted)', fontWeight: '800' }}>
                      Yield Sum
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '4px', color: 'var(--mobile-primary)' }}>
                      ₹{financials.totalRevenue.toLocaleString('en-IN')}
                    </h3>
                  </div>

                  <div style={{
                    backgroundColor: activeTenant ? 'rgba(61, 106, 84, 0.04)' : 'rgba(212, 163, 115, 0.04)',
                    border: `1px solid ${activeTenant ? 'rgba(61, 106, 84, 0.12)' : 'rgba(212, 163, 115, 0.12)'}`,
                    borderRadius: '16px',
                    padding: '14px',
                    boxShadow: 'var(--mobile-shadow)'
                  }}>
                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--mobile-muted)', fontWeight: '800' }}>
                      Yield Status
                    </span>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', marginTop: '4px', color: activeTenant ? 'var(--mobile-primary)' : 'var(--mobile-warning)' }}>
                      {activeTenant ? '🟢 Occupied' : '⚪ Vacant'}
                    </div>
                  </div>

                </div>

                {/* archived receipts checklist */}
                <div>
                  <div className="mobile-section-header" style={{ marginBottom: '10px' }}>
                    <h3 className="mobile-section-title">Archived Tenant Logs</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--mobile-muted)', fontWeight: '700' }}>
                      {propertyPast.length} vacated
                    </span>
                  </div>

                  {propertyPast.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '24px 12px',
                      backgroundColor: '#f6f5f0',
                      border: '1px dashed var(--mobile-border)',
                      borderRadius: 'var(--mobile-radius)',
                      fontSize: '0.75rem',
                      color: 'var(--mobile-muted)',
                      fontStyle: 'italic'
                    }}>
                      No vacated agreements saved for this property. Ending an agreement archives logs here.
                    </div>
                  ) : (
                    <div className="mobile-feed-container">
                      {propertyPast.map(past => (
                        <div key={past.id} className="mobile-card" style={{ borderLeft: '3px solid #6e7a85', padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h5 style={{ fontSize: '0.88rem', fontWeight: '800' }}>{past.name}</h5>
                            <span style={{ fontSize: '0.84rem', fontWeight: '800', color: 'var(--mobile-primary)' }}>
                              ₹{past.totalRentCollected.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: 'var(--mobile-muted)', marginTop: '2px' }}>
                            <div>📞 Contact: <strong>{past.phone}</strong></div>
                            <div>📅 Tenure: <strong>{past.moveInDate}</strong> to <strong>{past.moveOutDate}</strong></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* Database Admin Offline Controls */}
          <div style={{
            backgroundColor: 'var(--mobile-card-bg)',
            border: '1px solid var(--mobile-border)',
            borderRadius: 'var(--mobile-radius)',
            padding: '16px',
            boxShadow: 'var(--mobile-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '8px'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={16} style={{ color: 'var(--mobile-secondary)' }} />
              Database Backups
            </h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--mobile-muted)', lineHeight: '1.4' }}>
              All database items are stored privately inside your local offline browser. Download a safe copy to your device:
            </p>
            <button 
              className="mobile-btn mobile-btn-primary" 
              onClick={handleExportData}
              style={{ width: '100%', gap: '6px', height: '42px' }}
            >
              <Download size={16} /> Save Data Backup File
            </button>
          </div>
        </>
      )}

    </div>
  );
}

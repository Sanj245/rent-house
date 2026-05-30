import React from 'react';
import { Clipboard, Phone, Calendar, ArrowDownToLine, Users, DollarSign, Award, ArrowUpRight } from 'lucide-react';

export default function TenancyHistory({ properties, tenants, pastTenants, ledger }) {
  const [selectedPropertyId, setSelectedPropertyId] = React.useState(
    properties.length > 0 ? properties[0].id : ''
  );

  React.useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  function getPropertyName(id) {
    const p = properties.find(prop => prop.id === id);
    return p ? p.name : 'Unknown Property';
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

    // Build HTML string for the PDF
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Property Log – ${property.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a2c22; font-size: 13px; }
          .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
          .header { border-bottom: 3px solid #3d6a54; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
          .logo { font-size: 22px; font-weight: 900; color: #3d6a54; letter-spacing: -0.5px; }
          .logo span { color: #cc5a37; }
          .gen-date { font-size: 11px; color: #888; text-align: right; margin-top: 4px; }
          .property-title { font-size: 20px; font-weight: 800; color: #1a2c22; margin-bottom: 4px; }
          .property-meta { font-size: 12px; color: #666; }
          .stats { display: flex; gap: 16px; margin: 24px 0; }
          .stat-box { flex: 1; padding: 14px 18px; border-radius: 10px; border: 1px solid #e8e4dd; }
          .stat-box.green { background: #f0f6f3; border-color: #b5d5c5; }
          .stat-box.orange { background: #fdf6f3; border-color: #f0c8b8; }
          .stat-box.grey { background: #f8f8f6; border-color: #ddd; }
          .stat-label { font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; color: #888; margin-bottom: 6px; }
          .stat-value { font-size: 20px; font-weight: 900; color: #3d6a54; }
          .stat-value.orange { color: #cc5a37; }
          .stat-value.grey { font-size: 16px; color: #333; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px dashed #ddd; }
          table { width: 100%; border-collapse: collapse; }
          thead tr { background: #f0f6f3; }
          th { padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: #555; }
          th:last-child { text-align: right; }
          td { padding: 10px 8px; font-size: 12.5px; }
          .active-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; }
          .active-badge.occ { background: #e6f2ec; color: #3d6a54; }
          .active-badge.vac { background: #fff8e6; color: #a0620f; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e4dd; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <div class="logo">🏠 Rent<span>Ease</span></div>
              <div style="font-size:11px;color:#888;margin-top:2px;">Private Local Landlord Ledger</div>
            </div>
            <div class="gen-date">
              <div style="font-weight:700;color:#333;">Property Log Report</div>
              <div>Generated: ${generatedOn}</div>
            </div>
          </div>

          <div class="property-title">🏠 ${property.name}</div>
          <div class="property-meta">📍 ${property.address} &nbsp;•&nbsp; Type: ${property.type} &nbsp;•&nbsp;
            <span class="active-badge ${activeTenant ? 'occ' : 'vac'}">${activeTenant ? '🟢 Occupied' : '⚪ Vacant'}</span>
          </div>

          <div class="stats">
            <div class="stat-box green">
              <div class="stat-label">Total Rent Collected</div>
              <div class="stat-value">₹${financials.totalRevenue.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-box orange">
              <div class="stat-label">Current Monthly Rent</div>
              <div class="stat-value orange">${activeTenant ? '₹' + activeTenant.rent + '/mo' : 'Vacant'}</div>
            </div>
            <div class="stat-box grey">
              <div class="stat-label">Tenancy Cycles</div>
              <div class="stat-value grey">${financials.totalTransactions} total</div>
            </div>
          </div>

          ${activeTenant ? `
          <div class="section-title">✅ Current Active Tenant</div>
          <table>
            <thead><tr>
              <th>Tenant Name</th><th>Phone</th><th>Move-In Date</th><th>Security Deposit</th><th style="text-align:right;">Monthly Rent</th>
            </tr></thead>
            <tbody>
              <tr style="border-bottom:1px solid #e8e4dd;">
                <td style="font-weight:700;">${activeTenant.name}</td>
                <td>${activeTenant.phone}</td>
                <td>${activeTenant.moveInDate}</td>
                <td>₹${Number(activeTenant.securityDeposit).toLocaleString('en-IN')}</td>
                <td style="text-align:right;font-weight:800;color:#3d6a54;">₹${Number(activeTenant.rent).toLocaleString('en-IN')}/mo</td>
              </tr>
            </tbody>
          </table>` : ''}

          <div class="section-title">📜 Historical Tenancy Registers (${propertyPast.length} archived)</div>
          <table>
            <thead><tr>
              <th>Past Tenant</th><th>Phone No.</th><th>Move-In</th><th>Move-Out</th><th style="text-align:right;">Rent Collected</th>
            </tr></thead>
            <tbody>${pastRows}</tbody>
          </table>

          <div class="footer">
            <span>RentEase — Private Local Landlord Ledger</span>
            <span>${property.name} • ${generatedOn}</span>
          </div>
        </div>
      </body>
      </html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        setTimeout(() => { win.print(); }, 400);
      };
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="notebook-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Tenancy History & Profit Logs</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Archived logs of vacated tenants, aggregated rent revenues, and historical property profitability metrics.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => generatePropertyPDF(selectedPropertyId)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowDownToLine size={18} /> Download PDF Report
        </button>
      </div>

      {properties.length === 0 ? (
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          padding: '40px', 
          borderRadius: 'var(--radius-lg)', 
          textAlign: 'center' 
        }}>
          <Clipboard size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Properties Registered</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Register rental properties in the Properties tab to begin historical logging.
          </p>
        </div>
      ) : (
        <div>
          {/* Properties Selection pill buttons on top */}
          <div className="no-print" style={{ 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap', 
            marginBottom: '24px', 
            borderBottom: '1px dashed var(--border-color)', 
            paddingBottom: '16px' 
          }}>
            {properties.map(p => {
              const isActive = p.id === selectedPropertyId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPropertyId(p.id)}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--color-secondary)' : 'var(--bg-card)',
                    color: isActive ? '#ffffff' : 'var(--text-main)',
                    boxShadow: isActive ? '0 4px 10px var(--color-secondary-glow)' : 'var(--shadow-sm)',
                    transition: 'var(--transition-normal)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🏠 {p.name}
                </button>
              );
            })}
          </div>

          {/* Render Active selected property sheet */}
          {(() => {
            const property = properties.find(p => p.id === selectedPropertyId) || properties[0];
            if (!property) return null;

            const financials = getPropertyFinancials(property);
            const propertyPast = pastTenants.filter(t => t.propertyId === property.id);
            const activeTenant = tenants.find(t => t.propertyId === property.id);

            return (
              <div className="item-card print-section" style={{ 
                borderTop: '4px solid var(--color-secondary)', 
                padding: '24px', 
                position: 'relative',
                marginTop: '12px'
              }}>
                {/* Dossier Notebook Folder Tab */}
                <div className="card-folder-tab tab-ledger" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.7rem' }}>
                  🗂️ {property.name} Logs
                </div>

                {/* Property Header */}
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    🏠 {property.name}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📍 {property.address} • Type: {property.type}
                  </p>
                </div>

                {/* SMALL ANALYSIS OF THE PROFIT / METRICS BOARD */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '24px' 
                }}>
                  {/* Total Collected Revenue Card */}
                  <div style={{ 
                    backgroundColor: 'var(--color-primary-light)', 
                    border: '1px solid rgba(61, 106, 84, 0.15)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(61, 106, 84, 0.12)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--color-primary)',
                      flexShrink: 0
                    }}>
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                        Total Collected
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-primary)', marginTop: '2px' }}>
                        ₹{financials.totalRevenue}
                      </div>
                    </div>
                  </div>

                  {/* Active Income Stream Card */}
                  <div style={{ 
                    backgroundColor: 'var(--color-secondary-light)', 
                    border: '1px solid rgba(204, 90, 55, 0.15)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(204, 90, 55, 0.12)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--color-secondary)',
                      flexShrink: 0
                    }}>
                      <Award size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                        Yield Status
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                        {activeTenant ? (
                          <span style={{ color: 'var(--color-primary)', fontWeight: '800' }}>
                            🟢 Active (₹{financials.activeRent}/mo)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-warning)', fontWeight: '700' }}>
                            🟡 Vacant (Offline)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profitability Index Performance */}
                  <div style={{ 
                    backgroundColor: 'var(--bg-app)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(29, 36, 43, 0.05)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      flexShrink: 0
                    }}>
                      <Users size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                        Tenancy Cycle
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                        {financials.totalTransactions} cycles registered
                      </div>
                    </div>
                  </div>
                </div>

                {/* PAST TENANTS LOG TABLE */}
                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  📜 Historical Tenancy Registers
                </h4>

                {propertyPast.length === 0 ? (
                  <div style={{ 
                    backgroundColor: 'var(--bg-app)', 
                    border: '1px dashed var(--border-color)', 
                    padding: '24px', 
                    borderRadius: 'var(--radius-md)', 
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    fontStyle: 'italic'
                  }}>
                    No completed past tenancy logs stored for this property yet. Vacating an active tenant will archive their records here.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 8px' }}>👤 Past Tenant</th>
                          <th style={{ padding: '10px 8px' }}>📞 Phone Number</th>
                          <th style={{ padding: '10px 8px' }}>📅 Move-In</th>
                          <th style={{ padding: '10px 8px' }}>📅 Move-Out</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>💵 Rent Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyPast.map(tenant => (
                          <tr key={tenant.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }} className="ruled-row">
                            <td style={{ padding: '12px 8px', fontWeight: '700', color: 'var(--text-main)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '50%', 
                                  backgroundColor: 'var(--color-secondary-light)', 
                                  color: 'var(--color-secondary)',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  fontWeight: '800',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border-color)',
                                  flexShrink: 0
                                }}>
                                  {tenant.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                {tenant.name}
                              </div>
                            </td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: '600' }}>
                              {tenant.phone}
                            </td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-main)' }}>
                              {tenant.moveInDate}
                            </td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-main)', fontWeight: '600' }}>
                              {tenant.moveOutDate}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '800', color: 'var(--color-primary)', fontSize: '1rem' }}>
                              ₹{tenant.totalRentCollected}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

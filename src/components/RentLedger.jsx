import React, { useState } from 'react';
import { Check, X, Calendar, TrendingUp, Edit3, Zap, RotateCcw, AlertCircle, FileText } from 'lucide-react';

export default function RentLedger({ 
  tenants, 
  properties, 
  ledger, 
  updatePaymentStatus,
  updateTenantNotes 
}) {
  const months = [
    { name: 'January', key: 'Jan', index: 1 },
    { name: 'February', key: 'Feb', index: 2 },
    { name: 'March', key: 'Mar', index: 3 },
    { name: 'April', key: 'Apr', index: 4 },
    { name: 'May', key: 'May', index: 5 },
    { name: 'June', key: 'Jun', index: 6 },
    { name: 'July', key: 'Jul', index: 7 },
    { name: 'August', key: 'Aug', index: 8 },
    { name: 'September', key: 'Sep', index: 9 },
    { name: 'October', key: 'Oct', index: 10 },
    { name: 'November', key: 'Nov', index: 11 },
    { name: 'December', key: 'Dec', index: 12 },
  ];

  // Modal State
  const [activeSquare, setActiveSquare] = useState(null); 
  const [paymentStatus, setPaymentStatus] = useState('Paid'); 
  const [paidAmt, setPaidAmt] = useState('');
  const [remainingAmt, setRemainingAmt] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  function getPropertyName(id) {
    const p = properties.find(prop => prop.id === id);
    return p ? p.name : 'Unknown Property';
  }

  // Hide months prior to joining date
  const getAvailableMonths = (moveInDateStr) => {
    if (!moveInDateStr) return months;
    const parts = moveInDateStr.split('-');
    if (parts.length < 2) return months;
    
    const moveInMonth = parseInt(parts[1], 10); 
    return months.filter(m => m.index >= moveInMonth);
  };

  const handleOpenSquareEditor = (tenant, month) => {
    const tenantPayments = ledger[tenant.id] || {};
    const currentData = tenantPayments[month.key];
    
    setActiveSquare({
      tenantId: tenant.id,
      tenantName: tenant.name,
      monthKey: month.key,
      monthName: month.name,
      monthlyRent: tenant.rent
    });

    const todayStr = new Date().toISOString().split('T')[0];

    if (currentData) {
      if (typeof currentData === 'string') {
        setPaymentStatus(currentData);
        setPaidAmt(currentData === 'Paid' ? tenant.rent.toString() : '');
        setRemainingAmt('');
        setPaymentDate(todayStr);
        setPaymentNotes('');
      } else {
        setPaymentStatus(currentData.status || 'Paid');
        setPaidAmt(currentData.paid ? currentData.paid.toString() : (currentData.status === 'Paid' ? tenant.rent.toString() : ''));
        setRemainingAmt(currentData.remaining ? currentData.remaining.toString() : '');
        setPaymentDate(currentData.datePaid || todayStr);
        setPaymentNotes(currentData.notes || '');
      }
    } else {
      setPaymentStatus('Unmarked');
      setPaidAmt('');
      setRemainingAmt('');
      setPaymentDate(todayStr);
      setPaymentNotes('');
    }
  };

  const handleSavePaymentDetails = (e) => {
    e.preventDefault();
    if (!activeSquare) return;

    let details;
    if (paymentStatus === 'Paid') {
      details = { 
        status: 'Paid',
        paid: Number(paidAmt) || activeSquare.monthlyRent,
        datePaid: paymentDate || new Date().toISOString().split('T')[0],
        notes: paymentNotes || ''
      };
    } else if (paymentStatus === 'Unpaid') {
      details = { 
        status: 'Unpaid',
        datePaid: '',
        notes: paymentNotes || ''
      };
    } else if (paymentStatus === 'Partial') {
      if (!paidAmt || !remainingAmt) {
        alert('Please fill out both the Paid and Remaining amounts for partial payments.');
        return;
      }
      details = { 
        status: 'Partial', 
        paid: Number(paidAmt), 
        remaining: Number(remainingAmt),
        datePaid: paymentDate || new Date().toISOString().split('T')[0],
        notes: paymentNotes || ''
      };
    } else {
      details = undefined; 
    }

    updatePaymentStatus(activeSquare.tenantId, activeSquare.monthKey, details);
    setActiveSquare(null);
  };

  // Instant single-click Automated payment
  const handleQuickPay = (tenant, month) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const details = {
      status: 'Paid',
      paid: tenant.rent,
      datePaid: todayStr,
      notes: 'Recorded via Quick Pay⚡'
    };
    updatePaymentStatus(tenant.id, month.key, details);
  };

  const handleResetMonth = (tenant, month) => {
    const doubleCheck = window.confirm(`Reset payment logs for ${month.name}?`);
    if (doubleCheck) {
      updatePaymentStatus(tenant.id, month.key, undefined);
    }
  };

  const getRaiseHistory = (tenant) => {
    if (tenant.rentHistory && tenant.rentHistory.length > 0) {
      return tenant.rentHistory.map((h, idx) => ({
        date: h.date,
        event: h.reason || (idx === 0 ? 'Starting Rent Set' : 'Rent Adjusted'),
        amount: `₹${h.amount}/mo`
      }));
    }
    return [{
      date: tenant.moveInDate || 'N/A',
      event: 'Starting Rent Set',
      amount: `₹${tenant.rent}/mo`
    }];
  };

  return (
    <div>
      <div className="notebook-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Rent Notebook Ledger</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Interactive ruled ledger cards containing vertical monthly details. Click <strong>⚡ Record Full Payment</strong> to register payments instantly on today's date.
          </p>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          padding: '40px', 
          borderRadius: 'var(--radius-lg)', 
          textAlign: 'center' 
        }}>
          <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Tenants Active</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Active tenants will automatically populate the payment logbook grid cards.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {tenants.map((tenant) => {
            const tenantPayments = ledger[tenant.id] || {};
            const availableMonths = getAvailableMonths(tenant.moveInDate);
            const hadRaise = tenant.rentHistory && tenant.rentHistory.length > 1;
            const baseRent = hadRaise ? tenant.rentHistory[0].amount : tenant.rent;
            const raiseHistory = getRaiseHistory(tenant);

            return (
              <div key={tenant.id} className="item-card" style={{ borderTop: '4px solid var(--color-primary)', position: 'relative', padding: '24px' }}>
                
                {/* Visual Binder Sheet Tab */}
                <div className="card-folder-tab tab-ledger" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.7rem' }}>
                  📂 Ledger Sheet: {tenant.name}
                </div>

                {/* Notebook Top Page Header */}
                <div className="property-ledger-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
                      🏠 {getPropertyName(tenant.propertyId)}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span>👤 <strong>Tenant:</strong> {tenant.name}</span>
                      <span>📅 <strong>Move-In:</strong> {tenant.moveInDate}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
                    <div style={{ backgroundColor: 'var(--color-purple-light)', border: '1px solid rgba(176,125,98,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-purple)', textTransform: 'uppercase', fontWeight: '700' }}>🔒 Security Deposit</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-purple)' }}>₹{tenant.securityDeposit}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-primary-light)', border: '1px solid rgba(61,106,84,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: '700' }}>💵 Monthly Rent</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)' }}>₹{tenant.rent}</div>
                    </div>
                  </div>
                </div>

                {hadRaise && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--color-primary)', 
                      backgroundColor: 'var(--color-primary-light)', 
                      padding: '4px 10px', 
                      borderRadius: '4px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      📈 Rent Raised by {tenant.scheduledRaisePercent}% (From ₹{baseRent})
                    </span>
                  </div>
                )}

                {/* Vertical Ruled Monthly Logbook Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                        <th style={{ padding: '8px 12px' }}>Month</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px' }}>Amount Paid (₹)</th>
                        <th style={{ padding: '8px 12px' }}>Payment Date</th>
                        <th style={{ padding: '8px 12px' }}>Notes/Remarks</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((month) => {
                        const isAvailable = availableMonths.some(m => m.key === month.key);
                        const payData = tenantPayments[month.key];
                        
                        let statusText = 'Unmarked';
                        let amountStr = '—';
                        let dateStr = '—';
                        let notesStr = '—';
                        let statusClass = 'status-unmarked';

                        if (!isAvailable) {
                          statusText = 'Prior to Tenancy';
                          statusClass = 'status-prior';
                        } else if (payData) {
                          if (typeof payData === 'string') {
                            statusText = payData;
                            statusClass = payData === 'Paid' ? 'status-paid' : 'status-unpaid';
                            if (payData === 'Paid') amountStr = `₹${tenant.rent}`;
                          } else {
                            statusText = payData.status;
                            statusClass = payData.status === 'Paid' ? 'status-paid' : payData.status === 'Unpaid' ? 'status-unpaid' : 'status-partial';
                            
                            if (payData.status === 'Paid') {
                              amountStr = `₹${payData.paid || tenant.rent}`;
                            } else if (payData.status === 'Partial') {
                              amountStr = `₹${payData.paid} (Due: ₹${payData.remaining})`;
                            }
                            
                            dateStr = payData.datePaid || '—';
                            notesStr = payData.notes || '—';
                          }
                        } else {
                          statusText = 'Pending Due';
                          statusClass = 'status-unmarked';
                          amountStr = `₹${tenant.rent} (Due)`;
                        }

                        return (
                          <tr key={month.key} style={{ 
                            borderBottom: '1px solid var(--border-color)', 
                            fontSize: '0.92rem',
                            opacity: isAvailable ? 1 : 0.5,
                            backgroundColor: isAvailable && !payData ? 'rgba(214, 73, 51, 0.02)' : 'transparent',
                            transition: 'var(--transition-normal)'
                          }} className="ruled-row">
                            <td style={{ padding: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                              🗓️ {month.name}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span className={`ledger-status-pill ${statusClass}`}>
                                {statusText === 'Paid' ? '🟢 Paid' : statusText === 'Unpaid' ? '🔴 Unpaid' : statusText === 'Partial' ? '🟡 Partial' : statusText === 'Prior to Tenancy' ? '⚪ Prior' : '🔴 Pending Due'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontWeight: statusText === 'Paid' ? '700' : '500', color: statusText === 'Paid' ? 'var(--color-primary)' : 'var(--text-main)' }}>
                              {amountStr}
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              {dateStr}
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)', fontStyle: notesStr !== '—' ? 'italic' : 'normal', fontSize: '0.85rem' }}>
                              {notesStr}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {isAvailable && (statusText === 'PendingDue' || statusText === 'Pending Due' || statusText === 'Unmarked' || statusText === 'Unpaid') && (
                                  <button 
                                    className="btn btn-primary" 
                                    onClick={() => handleQuickPay(tenant, month)}
                                    style={{ padding: '4px 10px', fontSize: '0.78rem', minHeight: '26px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--color-secondary)' }}
                                    title="Automated Single-Tap Log"
                                  >
                                    <Zap size={12} /> Quick Pay
                                  </button>
                                )}

                                {isAvailable && (
                                  <button 
                                    onClick={() => handleOpenSquareEditor(tenant, month)}
                                    className="icon-action-btn"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--text-muted)',
                                      padding: '4px',
                                      display: 'inline-flex'
                                    }}
                                    title="Open Custom Payment Editor"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                )}

                                {isAvailable && payData && (
                                  <button 
                                    onClick={() => handleResetMonth(tenant, month)}
                                    className="icon-action-btn"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--color-danger)',
                                      padding: '4px',
                                      display: 'inline-flex'
                                    }}
                                    title="Reset / Unmark month"
                                  >
                                    <RotateCcw size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* INLINE RENT DIARY NOTES */}
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    📝 Rent Diary Notes & Remarks:
                  </label>
                  <textarea
                    value={tenant.notes || ''}
                    onChange={(e) => updateTenantNotes(tenant.id, e.target.value)}
                    placeholder="Write logs here... (e.g. Paid online, promising balance next week)"
                    className="diary-ruled-sheet"
                    style={{ 
                      width: '100%',
                      marginTop: '6px',
                      resize: 'vertical',
                      minHeight: '60px'
                    }}
                  />
                </div>

                {/* RENT RAISE HISTORY IN CARD */}
                <div style={{ marginTop: '16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid var(--border-color)' }}>
                  <h5 style={{ fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontWeight: '700' }}>
                    <TrendingUp size={12} style={{ color: 'var(--color-primary)' }} />
                    Rent Rate Increase Ledger History:
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {raiseHistory.map((hist, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: idx < raiseHistory.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>📅 {hist.date} &mdash; {hist.event}</span>
                        <span style={{ fontWeight: '700', color: idx > 0 ? 'var(--color-primary)' : 'var(--text-main)' }}>{hist.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED MONTH CHECKLIST STATUS SELECTOR MODAL */}
      {activeSquare && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                💰 Log Payment: {activeSquare.monthName}
              </h3>
              <button 
                onClick={() => setActiveSquare(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '0.9rem', backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div>👤 <strong>Tenant Name:</strong> {activeSquare.tenantName}</div>
              <div>💵 <strong>Full Rent Value:</strong> ₹{activeSquare.monthlyRent}</div>
            </div>

            <form onSubmit={handleSavePaymentDetails}>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select 
                  className="form-input" 
                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    if (e.target.value === 'Paid') {
                      setPaidAmt(activeSquare.monthlyRent.toString());
                      setRemainingAmt('');
                    } else if (e.target.value === 'Unpaid' || e.target.value === 'Unmarked') {
                      setPaidAmt('');
                      setRemainingAmt('');
                    }
                  }}
                >
                  <option value="Paid">🟢 Fully Paid (Received Rent)</option>
                  <option value="Unpaid">🔴 Unpaid (No Payment Received)</option>
                  <option value="Partial">🟡 Partial Payment (Received part amount)</option>
                  <option value="Unmarked">⚪ Unmarked / Reset</option>
                </select>
              </div>

              {(paymentStatus === 'Paid' || paymentStatus === 'Partial') && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Amount Paid (₹)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={paidAmt}
                      onChange={(e) => {
                        setPaidAmt(e.target.value);
                        if (paymentStatus === 'Partial' && e.target.value) {
                          const diff = activeSquare.monthlyRent - Number(e.target.value);
                          setRemainingAmt(diff > 0 ? diff.toString() : '0');
                        }
                      }}
                      placeholder="e.g. 5000"
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {paymentStatus === 'Partial' && (
                <div className="form-group">
                  <label className="form-label">Remaining Balance Due (₹)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={remainingAmt}
                    onChange={(e) => setRemainingAmt(e.target.value)}
                    placeholder="Calculated automatically"
                    min="0"
                    required
                  />
                </div>
              )}

              {(paymentStatus === 'Paid' || paymentStatus === 'Partial' || paymentStatus === 'Unpaid') && (
                <div className="form-group">
                  <label className="form-label">Notes & Remarks (e.g. UPI, Cash, Check #)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Enter payment notes..."
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setActiveSquare(null)}
                  style={{ flexGrow: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flexGrow: 1 }}
                >
                  Save Payment Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

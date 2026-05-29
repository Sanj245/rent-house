import React, { useState } from 'react';
import { Check, X, Calendar, TrendingUp, Info } from 'lucide-react';

export default function RentLedger({ 
  tenants, 
  properties, 
  ledger, 
  updatePaymentStatus,
  updateTenantNotes 
}) {
  const months = [
    { name: 'Jan', key: 'Jan', index: 1 },
    { name: 'Feb', key: 'Feb', index: 2 },
    { name: 'Mar', key: 'Mar', index: 3 },
    { name: 'Apr', key: 'Apr', index: 4 },
    { name: 'May', key: 'May', index: 5 },
    { name: 'Jun', key: 'Jun', index: 6 },
    { name: 'Jul', key: 'Jul', index: 7 },
    { name: 'Aug', key: 'Aug', index: 8 },
    { name: 'Sep', key: 'Sep', index: 9 },
    { name: 'Oct', key: 'Oct', index: 10 },
    { name: 'Nov', key: 'Nov', index: 11 },
    { name: 'Dec', key: 'Dec', index: 12 },
  ];

  // Modal State
  const [activeSquare, setActiveSquare] = useState(null); 
  const [paymentStatus, setPaymentStatus] = useState('Paid'); 
  const [paidAmt, setPaidAmt] = useState('');
  const [remainingAmt, setRemainingAmt] = useState('');

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

    if (currentData) {
      if (typeof currentData === 'string') {
        setPaymentStatus(currentData);
        setPaidAmt('');
        setRemainingAmt('');
      } else {
        setPaymentStatus(currentData.status || 'Paid');
        setPaidAmt(currentData.paid ? currentData.paid.toString() : '');
        setRemainingAmt(currentData.remaining ? currentData.remaining.toString() : '');
      }
    } else {
      setPaymentStatus('Unmarked');
      setPaidAmt('');
      setRemainingAmt('');
    }
  };

  const handleSavePaymentDetails = (e) => {
    e.preventDefault();
    if (!activeSquare) return;

    let details;
    if (paymentStatus === 'Paid') {
      details = { status: 'Paid' };
    } else if (paymentStatus === 'Unpaid') {
      details = { status: 'Unpaid' };
    } else if (paymentStatus === 'Partial') {
      if (!paidAmt || !remainingAmt) {
        alert('Please fill out both the Paid and Remaining amounts for partial payments.');
        return;
      }
      details = { 
        status: 'Partial', 
        paid: Number(paidAmt), 
        remaining: Number(remainingAmt) 
      };
    } else {
      details = undefined; 
    }

    updatePaymentStatus(activeSquare.tenantId, activeSquare.monthKey, details);
    setActiveSquare(null);
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
      <div className="notebook-header">
        <div>
          <h2 className="section-title">Rent Payment Book</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Bespoke logbook ledger cards to log monthly collections, adjust partial amounts, and record diary notes.
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
        <div className="card-grid">
          {tenants.map((tenant) => {
            const tenantPayments = ledger[tenant.id] || {};
            const availableMonths = getAvailableMonths(tenant.moveInDate);
            const hadRaise = tenant.rentHistory && tenant.rentHistory.length > 1;
            const baseRent = hadRaise ? tenant.rentHistory[0].amount : tenant.rent;
            const raiseHistory = getRaiseHistory(tenant);

            return (
              <div key={tenant.id} className="item-card" style={{ borderTop: '4px solid var(--color-primary)' }}>
                {/* Visual Notebook Ledger Tab */}
                <div className="card-folder-tab tab-ledger">
                  📅 Ledger Sheet
                </div>

                <div>
                  {/* Card Header */}
                  <div className="item-card-header" style={{ marginTop: '4px' }}>
                    <div>
                      <div className="item-card-title">{tenant.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        🏠 {getPropertyName(tenant.propertyId)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                        ₹{tenant.rent}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>per month</div>
                    </div>
                  </div>

                  {/* Raise indicator */}
                  {hadRaise && (
                    <div style={{ marginTop: '4px', marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        color: 'var(--color-primary)', 
                        backgroundColor: 'var(--color-primary-light)', 
                        padding: '2px 8px', 
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

                  {/* Move-in Date Row */}
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-main)', 
                    backgroundColor: 'var(--bg-app)', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    border: '1px solid var(--border-color)',
                    fontWeight: '600'
                  }}>
                    📅 Move-in Date: {tenant.moveInDate}
                  </div>

                  {/* MONTHLY CHECKLIST CELLS (Organic Grid Checklist) */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                      🗓️ Rent Payments Log:
                    </h4>
                    <div className="payment-grid">
                      {availableMonths.map((month) => {
                        const payData = tenantPayments[month.key]; 
                        
                        let isPaid = false;
                        let isUnpaid = false;
                        let isPartial = false;
                        let partialText = '';

                        if (payData) {
                          if (typeof payData === 'string') {
                            isPaid = payData === 'Paid';
                            isUnpaid = payData === 'Unpaid';
                          } else {
                            isPaid = payData.status === 'Paid';
                            isUnpaid = payData.status === 'Unpaid';
                            isPartial = payData.status === 'Partial';
                            if (isPartial) {
                              partialText = `Paid: ₹${payData.paid} | Due: ₹${payData.remaining}`;
                            }
                          }
                        }
                        
                        return (
                          <div 
                            key={month.key} 
                            className={`payment-square ${isPaid ? 'paid' : isUnpaid ? 'unpaid' : isPartial ? 'partial-stamp' : ''}`}
                            onClick={() => handleOpenSquareEditor(tenant, month)}
                            title={isPartial ? partialText : `Click to update ${month.name}`}
                            style={{ 
                              width: '45px',
                              height: '45px'
                            }}
                          >
                            <span className="month-label" style={{ fontSize: '0.62rem' }}>{month.name}</span>
                            {isPaid && <Check className="check-icon" size={11} style={{ color: 'var(--color-primary)' }} />}
                            {isUnpaid && <X className="check-icon" size={11} style={{ color: 'var(--color-danger)' }} />}
                            {isPartial && (
                              <span style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--color-warning)' }}>
                                ₹{payData.paid}
                              </span>
                            )}
                            {!isPaid && !isUnpaid && !isPartial && <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>—</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      * Hiding months before move-in date.
                    </div>
                  </div>

                  {/* INLINE RENT DIARY NOTES */}
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      📝 Rent Diary Notes:
                    </label>
                    <textarea
                      value={tenant.notes || ''}
                      onChange={(e) => updateTenantNotes(tenant.id, e.target.value)}
                      placeholder="Write notes here... (e.g. Paid ₹5,000, promising balance ₹1,000 next Sunday)"
                      className="diary-ruled-sheet"
                      style={{ 
                        width: '100%',
                        marginTop: '6px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* HISTORY LOG INSIDE CARD */}
                  <div style={{ marginTop: '16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', padding: '10px', border: '1px solid var(--border-color)' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      <TrendingUp size={12} style={{ color: 'var(--color-primary)' }} />
                      Rent Rate History:
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
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED MONTH CHECKLIST STATUS SELECTOR MODAL */}
      {activeSquare && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                💰 Rent status: {activeSquare.monthName} 2026
              </h3>
              <button 
                onClick={() => setActiveSquare(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
              <div>👤 <strong>Tenant:</strong> {activeSquare.tenantName}</div>
              <div>💵 <strong>Full Rent Value:</strong> ₹{activeSquare.monthlyRent}</div>
            </div>

            <form onSubmit={handleSavePaymentDetails}>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select 
                  className="form-input" 
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="Paid">🟢 Fully Paid (Received Rent)</option>
                  <option value="Unpaid">🔴 Unpaid (No Payment Received)</option>
                  <option value="Partial">🟡 Partial Payment (Received part amount)</option>
                  <option value="Unmarked">⚪ Unmarked / Future month</option>
                </select>
              </div>

              {paymentStatus === 'Partial' && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Amount Paid (₹)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={paidAmt}
                      onChange={(e) => setPaidAmt(e.target.value)}
                      placeholder="e.g. 5000"
                      min="0"
                      max={activeSquare.monthlyRent}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Remaining Due (₹)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={remainingAmt}
                      onChange={(e) => setRemainingAmt(e.target.value)}
                      placeholder="e.g. 1000"
                      min="0"
                      required
                    />
                  </div>
                </div>
              )}

              {paymentStatus === 'Partial' && paidAmt && (
                <div style={{ 
                  margin: '8px 0', 
                  fontSize: '0.85rem', 
                  color: 'var(--color-warning)', 
                  fontWeight: '700', 
                  textAlign: 'center' 
                }}>
                  ⚠️ Notice: Rent log will show ₹{paidAmt} received and ₹{remainingAmt} pending. Write details in your Rent Notes!
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
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

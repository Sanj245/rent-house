import React, { useState } from 'react';
import { Check, X, Calendar, TrendingUp, Edit3, Zap, RotateCcw, AlertCircle, FileText, List, Clock, Filter } from 'lucide-react';

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

  // Layout Toggle and Filter States
  const [viewMode, setViewMode] = useState('sheet'); // 'sheet' (Current Month Grid) or 'history' (Chronological Log)
  const currentMonthIdx = new Date().getMonth(); // 0-11
  const [selectedMonthKey, setSelectedMonthKey] = useState(months[currentMonthIdx].key);

  // Modal Editor State
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

  // Check if month is available based on move-in date
  const isMonthAvailable = (moveInDateStr, monthKey) => {
    if (!moveInDateStr) return true;
    const parts = moveInDateStr.split('-');
    if (parts.length < 2) return true;
    
    const moveInMonth = parseInt(parts[1], 10); 
    const monthIndex = months.find(m => m.key === monthKey)?.index || 1;
    return monthIndex >= moveInMonth;
  };

  const handleOpenSquareEditor = (tenant, monthKey) => {
    const tenantPayments = ledger[tenant.id] || {};
    const currentData = tenantPayments[monthKey];
    const monthName = months.find(m => m.key === monthKey)?.name || monthKey;
    
    setActiveSquare({
      tenantId: tenant.id,
      tenantName: tenant.name,
      monthKey: monthKey,
      monthName: monthName,
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
  const handleQuickPay = (tenant, monthKey) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const details = {
      status: 'Paid',
      paid: tenant.rent,
      datePaid: todayStr,
      notes: 'Recorded via Quick Pay⚡'
    };
    updatePaymentStatus(tenant.id, monthKey, details);
  };

  const handleResetMonth = (tenant, monthKey) => {
    const monthName = months.find(m => m.key === monthKey)?.name || monthKey;
    const doubleCheck = window.confirm(`Reset payment logs for ${tenant.name} - ${monthName}?`);
    if (doubleCheck) {
      updatePaymentStatus(tenant.id, monthKey, undefined);
    }
  };

  // Extract and sort complete chronological payments logs
  const getChronologicalHistoryList = () => {
    const list = [];
    tenants.forEach(tenant => {
      const tenantPayments = ledger[tenant.id] || {};
      Object.entries(tenantPayments).forEach(([monthKey, payData]) => {
        if (payData) {
          const monthName = months.find(m => m.key === monthKey)?.name || monthKey;
          
          let statusText = 'Paid';
          let amountPaid = tenant.rent;
          let paymentDateStr = tenant.moveInDate || '2026-05-29';
          let remarks = '';
          let remainingDue = 0;

          if (typeof payData === 'string') {
            statusText = payData;
            if (payData === 'Unpaid') amountPaid = 0;
          } else {
            statusText = payData.status || 'Paid';
            amountPaid = payData.paid !== undefined ? payData.paid : (payData.status === 'Paid' ? tenant.rent : 0);
            paymentDateStr = payData.datePaid || tenant.moveInDate || '2026-05-29';
            remarks = payData.notes || '';
            remainingDue = payData.remaining || 0;
          }

          list.push({
            id: `${tenant.id}-${monthKey}-${paymentDateStr}`,
            tenantId: tenant.id,
            tenantName: tenant.name,
            propertyId: tenant.propertyId,
            propertyName: getPropertyName(tenant.propertyId),
            securityDeposit: tenant.securityDeposit,
            monthKey: monthKey,
            monthName: monthName,
            status: statusText,
            amountPaid: amountPaid,
            remaining: remainingDue,
            datePaid: paymentDateStr,
            notes: remarks,
            rent: tenant.rent
          });
        }
      });
    });

    // Sort by payment date descending (most recent first)
    list.sort((a, b) => new Date(b.datePaid) - new Date(a.datePaid));
    return list;
  };

  const historyLogs = getChronologicalHistoryList();
  const selectedMonthName = months.find(m => m.key === selectedMonthKey)?.name || selectedMonthKey;

  return (
    <div>
      {/* Page Header */}
      <div className="notebook-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Rent Collections Ledger</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Grid-ruled table for monthly rents collections (Y-axis properties, X-axis payment columns) and chronological history logbook.
          </p>
        </div>
      </div>

      {/* Main View Mode Toggles */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px',
        marginBottom: '24px',
        backgroundColor: 'var(--bg-card)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setViewMode('sheet')}
            className={`btn ${viewMode === 'sheet' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <List size={16} /> 🗓️ Current Month Sheet
          </button>
          <button 
            onClick={() => setViewMode('history')}
            className={`btn ${viewMode === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={16} /> 📜 Chronological History Log
          </button>
        </div>

        {viewMode === 'sheet' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)' }}>Select Month:</span>
            <select 
              value={selectedMonthKey} 
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="form-input"
              style={{ width: '150px', padding: '6px 12px', minHeight: '34px', cursor: 'pointer' }}
            >
              {months.map(m => (
                <option key={m.key} value={m.key}>
                  {m.name} {m.key === months[currentMonthIdx].key ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Tenants Registered</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Active tenants registered in Agreements tab will automatically populate your ledger sheets.
          </p>
        </div>
      ) : (
        <div>
          {/* VIEW 1: CURRENT MONTH SHEET GRID TABLE */}
          {viewMode === 'sheet' && (
            <div className="item-card" style={{ borderTop: '4px solid var(--color-primary)', padding: '24px', position: 'relative' }}>
              <div className="card-folder-tab tab-ledger" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.7rem' }}>
                🗓️ {selectedMonthName} 2026 Sheet
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                      <th style={{ padding: '12px' }}>🏠 Property / Home</th>
                      <th style={{ padding: '12px' }}>👥 Active Tenant</th>
                      <th style={{ padding: '12px' }}>💵 Rent Due</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Amount Paid (₹)</th>
                      <th style={{ padding: '12px' }}>Payment Date</th>
                      <th style={{ padding: '12px' }}>Remarks / Diary</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(tenant => {
                      const tenantPayments = ledger[tenant.id] || {};
                      const isAvailable = isMonthAvailable(tenant.moveInDate, selectedMonthKey);
                      const payData = tenantPayments[selectedMonthKey];

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
                          statusText = payData.status || 'Paid';
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
                        <tr key={tenant.id} style={{ 
                          borderBottom: '1px solid var(--border-color)', 
                          fontSize: '0.92rem',
                          opacity: isAvailable ? 1 : 0.5,
                          backgroundColor: isAvailable && !payData ? 'rgba(214, 73, 51, 0.02)' : 'transparent',
                          transition: 'var(--transition-normal)'
                        }} className="ruled-row">
                          <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--text-main)' }}>
                            🏠 {getPropertyName(tenant.propertyId)}
                          </td>
                          <td style={{ padding: '14px 12px', fontWeight: '600' }}>
                            👤 {tenant.name}
                          </td>
                          <td style={{ padding: '14px 12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                            ₹{tenant.rent}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <span className={`ledger-status-pill ${statusClass}`}>
                              {statusText === 'Paid' ? '🟢 Paid' : statusText === 'Unpaid' ? '🔴 Unpaid' : statusText === 'Partial' ? '🟡 Partial' : statusText === 'Prior to Tenancy' ? 'Prior' : '🔴 Pending Due'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px', fontWeight: statusText === 'Paid' ? '700' : '500', color: statusText === 'Paid' ? 'var(--color-primary)' : 'var(--text-main)' }}>
                            {amountStr}
                          </td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {dateStr}
                          </td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: notesStr !== '—' ? 'italic' : 'normal' }}>
                            {notesStr}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {isAvailable && (statusText === 'PendingDue' || statusText === 'Pending Due' || statusText === 'Unmarked' || statusText === 'Unpaid') && (
                                <button 
                                  className="btn btn-primary" 
                                  onClick={() => handleQuickPay(tenant, selectedMonthKey)}
                                  style={{ padding: '4px 10px', fontSize: '0.78rem', minHeight: '26px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--color-secondary)' }}
                                  title="Automated Single-Tap Log"
                                >
                                  <Zap size={12} /> Quick Pay
                                </button>
                              )}

                              {isAvailable && (
                                <button 
                                  onClick={() => handleOpenSquareEditor(tenant, selectedMonthKey)}
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
                                  onClick={() => handleResetMonth(tenant, selectedMonthKey)}
                                  className="icon-action-btn"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-danger)',
                                    padding: '4px',
                                    display: 'inline-flex'
                                  }}
                                  title="Reset / Unmark Month"
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
            </div>
          )}

          {/* VIEW 2: CHRONOLOGICAL STATEMENT PAYMENT HISTORY LOG */}
          {viewMode === 'history' && (
            <div className="item-card" style={{ borderTop: '4px solid var(--color-purple)', padding: '24px', position: 'relative' }}>
              <div className="card-folder-tab tab-ledger" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.7rem', borderLeft: '3px solid var(--color-purple)' }}>
                📜 Chronological Collection Log
              </div>

              {historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px', display: 'inline-block' }} />
                  <p style={{ fontWeight: '600' }}>No Payments Logged Yet</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>Your logged payment history across all months will display chronologically here.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                        <th style={{ padding: '12px' }}>📅 Payment Date</th>
                        <th style={{ padding: '12px' }}>🏠 Property</th>
                        <th style={{ padding: '12px' }}>👤 Tenant</th>
                        <th style={{ padding: '12px' }}>🗓️ Ledger Month</th>
                        <th style={{ padding: '12px' }}>Rent Status</th>
                        <th style={{ padding: '12px' }}>Amount Paid (₹)</th>
                        <th style={{ padding: '12px' }}>Notes / remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.92rem' }} className="ruled-row">
                          <td style={{ padding: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {log.datePaid}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '600' }}>
                            {log.propertyName}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {log.tenantName}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {log.monthName} 2026
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`ledger-status-pill ${log.status === 'Paid' ? 'status-paid' : log.status === 'Unpaid' ? 'status-unpaid' : 'status-partial'}`}>
                              {log.status === 'Paid' ? '🟢 Paid' : log.status === 'Unpaid' ? '🔴 Unpaid' : '🟡 Partial'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontWeight: '700', color: log.status === 'Paid' ? 'var(--color-primary)' : 'var(--text-main)' }}>
                            ₹{log.amountPaid} {log.status === 'Partial' ? `(Due: ₹${log.remaining})` : ''}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: log.notes ? 'italic' : 'normal' }}>
                            {log.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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

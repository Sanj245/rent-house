import React, { useState } from 'react';
import { 
  DollarSign, 
  X, 
  Calendar, 
  Edit3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

export default function MobileRentLedger({
  tenants,
  properties,
  ledger,
  updatePaymentStatus,
  updateTenantNotes
}) {
  const monthsBase = [
    { name: 'January',   key: 'Jan', index: 1  },
    { name: 'February',  key: 'Feb', index: 2  },
    { name: 'March',     key: 'Mar', index: 3  },
    { name: 'April',     key: 'Apr', index: 4  },
    { name: 'May',       key: 'May', index: 5  },
    { name: 'June',      key: 'Jun', index: 6  },
    { name: 'July',      key: 'Jul', index: 7  },
    { name: 'August',    key: 'Aug', index: 8  },
    { name: 'September', key: 'Sep', index: 9  },
    { name: 'October',   key: 'Oct', index: 10 },
    { name: 'November',  key: 'Nov', index: 11 },
    { name: 'December',  key: 'Dec', index: 12 },
  ];

  const yearsList = [2026, 2027, 2028];

  const today = new Date();
  const currentMonthKey = monthsBase[today.getMonth()].key;
  const currentYear = today.getFullYear();
  const [selectedTimelineKey, setSelectedTimelineKey] = useState(`${currentMonthKey}-${currentYear}`);

  // Edit payment sheet
  const [editPaymentNode, setEditPaymentNode] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [customRentDue, setCustomRentDue] = useState('');
  const [paidAmt, setPaidAmt] = useState('');
  const [remainingAmt, setRemainingAmt] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [receivedBy, setReceivedBy] = useState('Landlord');
  const [paymentNotes, setPaymentNotes] = useState('');

  function getPropertyName(id) {
    const p = properties.find(prop => prop.id === id);
    return p ? p.name : 'Unknown';
  }

  const getPropertyPaymentConfig = (propertyId) => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return { isCash: true, account: 'Landlord' };
    return {
      isCash: prop.isCashOnly !== undefined ? prop.isCashOnly : true,
      account: prop.accountName && prop.accountName !== 'None' && prop.accountName.trim() !== '' ? prop.accountName.trim() : 'Landlord'
    };
  };

  const getPaymentData = (tenantPayments, monthKey, year) => {
    const timelineKey = `${monthKey}-${year}`;
    if (tenantPayments[timelineKey] !== undefined) return tenantPayments[timelineKey];
    if (year === 2026 && tenantPayments[monthKey] !== undefined) return tenantPayments[monthKey];
    return undefined;
  };

  const getRentForMonth = (tenant, timelineKey) => {
    const tenantPayments = ledger[tenant.id] || {};
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const payData = getPaymentData(tenantPayments, monthKey, year);
    if (payData && typeof payData === 'object' && payData.rentDue !== undefined) return payData.rentDue;

    const monthIndex = monthsBase.find(m => m.key === monthKey)?.index || 12;
    const selectedAbsoluteIndex = (year - 2026) * 12 + monthIndex;

    if (tenant.scheduledRaiseEffectiveDate) {
      const parts = tenant.scheduledRaiseEffectiveDate.split('-');
      if (parts.length >= 2) {
        const raiseYear  = parseInt(parts[0], 10);
        const raiseMonth = parseInt(parts[1], 10);
        const raiseAbsoluteIndex = (raiseYear - 2026) * 12 + raiseMonth;
        const baseRent = tenant.rentHistory && tenant.rentHistory[0] ? Number(tenant.rentHistory[0].amount) : Number(tenant.rent);
        if (selectedAbsoluteIndex < raiseAbsoluteIndex) return baseRent;
        const raisePercent = Number(tenant.scheduledRaisePercent || 10);
        return baseRent + Math.round((baseRent * raisePercent) / 100);
      }
    }
    return tenant.rent;
  };

  const isMonthAvailable = (moveInDateStr, timelineKey) => {
    if (!moveInDateStr) return true;
    const parts = moveInDateStr.split('-');
    if (parts.length < 2) return true;
    const moveInYear  = parseInt(parts[0], 10);
    const moveInMonth = parseInt(parts[1], 10);
    const moveInAbsoluteIndex = (moveInYear - 2026) * 12 + moveInMonth;
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = monthsBase.find(m => m.key === monthKey)?.index || 1;
    const selectedAbsoluteIndex = (year - 2026) * 12 + monthIndex;
    return selectedAbsoluteIndex >= moveInAbsoluteIndex;
  };

  const handleMarkPaid = (tenant, timelineKey) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const rentAmount = getRentForMonth(tenant, timelineKey);
    const { isCash, account } = getPropertyPaymentConfig(tenant.propertyId);
    updatePaymentStatus(tenant.id, timelineKey, {
      status: 'Paid',
      rentDue: rentAmount,
      paid: rentAmount,
      datePaid: todayStr,
      paymentMethod: isCash ? 'Cash' : 'UPI',
      receivedBy: account,
      notes: '⚡ Quick marked Paid'
    });
  };

  const handleMarkUnpaid = (tenant, timelineKey) => {
    const [mKey, yStr] = timelineKey.split('-');
    const mName = monthsBase.find(m => m.key === mKey)?.name || mKey;
    if (window.confirm(`Reset payment for ${tenant.name} – ${mName} ${yStr}?`)) {
      updatePaymentStatus(tenant.id, timelineKey, undefined);
    }
  };

  const handleOpenEditor = (tenant, timelineKey) => {
    const tenantPayments = ledger[tenant.id] || {};
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const currentData = getPaymentData(tenantPayments, monthKey, year);
    const computedRent = getRentForMonth(tenant, timelineKey);
    const mName = monthsBase.find(m => m.key === monthKey)?.name || monthKey;

    setEditPaymentNode({ tenantId: tenant.id, tenantName: tenant.name, timelineKey, monthName: `${mName} ${year}`, computedRent });
    setCustomRentDue(computedRent.toString());
    const todayStr = new Date().toISOString().split('T')[0];
    const { isCash, account } = getPropertyPaymentConfig(tenant.propertyId);

    if (currentData) {
      if (typeof currentData === 'string') {
        setPaymentStatus(currentData); setPaidAmt(currentData === 'Paid' ? computedRent.toString() : '');
        setRemainingAmt(''); setPaymentDate(todayStr); setPaymentMethod(isCash ? 'Cash' : 'UPI');
        setReceivedBy(account); setPaymentNotes('');
      } else {
        setPaymentStatus(currentData.status || 'Paid');
        setPaidAmt(currentData.paid ? currentData.paid.toString() : (currentData.status === 'Paid' ? computedRent.toString() : ''));
        setRemainingAmt(currentData.remaining ? currentData.remaining.toString() : '');
        setPaymentDate(currentData.datePaid || todayStr);
        setPaymentMethod(currentData.paymentMethod || (isCash ? 'Cash' : 'UPI'));
        setReceivedBy(currentData.receivedBy || account);
        setPaymentNotes(currentData.notes || '');
      }
    } else {
      setPaymentStatus('Unmarked'); setPaidAmt(''); setRemainingAmt('');
      setPaymentDate(todayStr); setPaymentMethod(isCash ? 'Cash' : 'UPI');
      setReceivedBy(account); setPaymentNotes('');
    }
  };

  const handleSavePaymentDetails = (e) => {
    e.preventDefault();
    if (!editPaymentNode) return;
    const finalRentDue = Number(customRentDue) || editPaymentNode.computedRent;
    let details;
    if (paymentStatus === 'Paid') {
      details = { status: 'Paid', rentDue: finalRentDue, paid: Number(paidAmt) || finalRentDue, datePaid: paymentDate || new Date().toISOString().split('T')[0], paymentMethod, receivedBy: receivedBy.trim() || 'Landlord', notes: paymentNotes || '' };
    } else if (paymentStatus === 'Unpaid') {
      details = { status: 'Unpaid', rentDue: finalRentDue, datePaid: '', paymentMethod: '—', receivedBy: receivedBy.trim() || 'Landlord', notes: paymentNotes || '' };
    } else if (paymentStatus === 'Partial') {
      if (!paidAmt || !remainingAmt) { alert('Please fill Paid and Remaining amounts.'); return; }
      details = { status: 'Partial', rentDue: finalRentDue, paid: Number(paidAmt), remaining: Number(remainingAmt), datePaid: paymentDate || new Date().toISOString().split('T')[0], paymentMethod, receivedBy: receivedBy.trim() || 'Landlord', notes: paymentNotes || '' };
    } else {
      details = undefined;
    }
    updatePaymentStatus(editPaymentNode.tenantId, editPaymentNode.timelineKey, details);
    setEditPaymentNode(null);
  };

  const [selMonth, selYear] = selectedTimelineKey.split('-');
  const displayMonthName = `${monthsBase.find(m => m.key === selMonth)?.name} ${selYear}`;

  // Derive status info for a tenant in selected month
  const getTenantMonthInfo = (tenant) => {
    const tenantPayments = ledger[tenant.id] || {};
    const [mKey, yStr] = selectedTimelineKey.split('-');
    const payData = getPaymentData(tenantPayments, mKey, parseInt(yStr, 10));
    const computedRent = getRentForMonth(tenant, selectedTimelineKey);
    const isAvailable = isMonthAvailable(tenant.moveInDate, selectedTimelineKey);

    let statusText  = 'Pending Due';
    let amountStr   = `₹${computedRent}`;
    let dateStr     = '—';
    let methodStr   = '—';
    let receiverStr = '—';
    let notesStr    = '—';
    let statusColor = '#e05c3a';
    let statusBg    = 'rgba(224,92,58,0.09)';
    let statusEmoji = '🔴';

    if (!isAvailable) {
      statusText = 'Prior to Tenancy'; statusColor = '#aaa'; statusBg = 'rgba(0,0,0,0.05)'; statusEmoji = '—';
      amountStr = '—';
    } else if (payData) {
      if (typeof payData === 'string') {
        statusText  = payData;
        statusColor = payData === 'Paid' ? '#3d6a54' : '#e05c3a';
        statusBg    = payData === 'Paid' ? 'rgba(61,106,84,0.09)' : 'rgba(224,92,58,0.09)';
        statusEmoji = payData === 'Paid' ? '🟢' : '🔴';
        amountStr   = payData === 'Paid' ? `₹${computedRent}` : `₹${computedRent}`;
      } else {
        statusText  = payData.status || 'Paid';
        statusColor = payData.status === 'Paid' ? '#3d6a54' : payData.status === 'Partial' ? '#b8860b' : '#e05c3a';
        statusBg    = payData.status === 'Paid' ? 'rgba(61,106,84,0.09)' : payData.status === 'Partial' ? 'rgba(184,134,11,0.09)' : 'rgba(224,92,58,0.09)';
        statusEmoji = payData.status === 'Paid' ? '🟢' : payData.status === 'Partial' ? '🟡' : '🔴';
        if (payData.status === 'Paid')    amountStr = `₹${payData.paid || computedRent}`;
        if (payData.status === 'Partial') amountStr = `₹${payData.paid} paid`;
        dateStr     = payData.datePaid    || '—';
        methodStr   = payData.paymentMethod || '—';
        receiverStr = payData.receivedBy   || '—';
        notesStr    = payData.notes         || '—';
      }
    }

    return { computedRent, isAvailable, payData, statusText, amountStr, dateStr, methodStr, receiverStr, notesStr, statusColor, statusBg, statusEmoji };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '2px' }}>
          Monthly Rents Ledger
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--mobile-muted)' }}>
          Track payments, amounts, dates, and remarks by month.
        </p>
      </div>

      {/* Month selector pills — horizontally scrollable */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px', borderBottom: '1px dashed var(--mobile-border)' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', minWidth: 'max-content' }}>
          {yearsList.map((year, yIdx) => (
            <div key={year} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ fontWeight: '800', fontSize: '0.68rem', padding: '5px 9px', borderRadius: '7px', backgroundColor: 'var(--mobile-card-bg)', border: '1px solid var(--mobile-border)', color: 'var(--mobile-text)', userSelect: 'none' }}>
                {year}
              </div>
              {monthsBase.map(m => {
                const tKey = `${m.key}-${year}`;
                const isActive = tKey === selectedTimelineKey;
                return (
                  <button key={tKey} onClick={() => setSelectedTimelineKey(tKey)} style={{
                    fontWeight: '700', fontSize: '0.7rem', padding: '5px 11px', borderRadius: '7px',
                    border: `1px solid ${isActive ? 'var(--mobile-secondary)' : 'var(--mobile-border)'}`,
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--mobile-secondary)' : 'var(--mobile-card-bg)',
                    color: isActive ? '#fff' : 'var(--mobile-text)',
                    transition: 'all 0.15s ease',
                    minWidth: '40px', textAlign: 'center'
                  }}>{m.key}</button>
                );
              })}
              {yIdx < yearsList.length - 1 && (
                <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--mobile-border)', margin: '0 6px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected month label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <Calendar size={14} style={{ color: 'var(--mobile-primary)' }} />
        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--mobile-primary)' }}>
          {displayMonthName}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--mobile-muted)', marginLeft: '2px' }}>
          — {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty state */}
      {tenants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', backgroundColor: 'var(--mobile-card-bg)', borderRadius: 'var(--mobile-radius)', border: '1px solid var(--mobile-border)' }}>
          <DollarSign size={36} style={{ color: 'var(--mobile-muted)', marginBottom: '10px', display: 'inline-block' }} />
          <h4 style={{ fontWeight: '800', fontSize: '1rem' }}>No Active Agreements</h4>
          <p style={{ fontSize: '0.76rem', color: 'var(--mobile-muted)', marginTop: '4px' }}>
            Rental ledgers generate automatically once tenant agreements are logged.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tenants.map(tenant => {
            const { computedRent, isAvailable, payData, statusText, amountStr, dateStr, methodStr, receiverStr, notesStr, statusColor, statusBg, statusEmoji } = getTenantMonthInfo(tenant);
            const isPaid    = statusText === 'Paid';
            const isPartial = statusText === 'Partial';

            return (
              <div key={tenant.id} style={{
                backgroundColor: 'var(--mobile-card-bg)',
                borderRadius: '14px',
                border: '1px solid var(--mobile-border)',
                borderLeft: `4px solid ${statusColor}`,
                overflow: 'hidden',
                opacity: isAvailable ? 1 : 0.55
              }}>
                {/* Card header — Tenant + Property + Status badge */}
                <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--mobile-border)' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.96rem' }}>{tenant.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--mobile-secondary)', fontWeight: '700', marginTop: '2px' }}>
                      🏠 {getPropertyName(tenant.propertyId)}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800',
                    backgroundColor: statusBg, color: statusColor, whiteSpace: 'nowrap', marginLeft: '8px'
                  }}>
                    {statusEmoji} {statusText}
                  </span>
                </div>

                {/* Data rows grid */}
                <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>

                  {/* Rent Due */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--mobile-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                      💵 Rent Due
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--mobile-primary)' }}>
                      ₹{computedRent}
                    </div>
                  </div>

                  {/* Amount Paid */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--mobile-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                      Amount Paid
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: isPaid ? '800' : '600', color: isPaid ? 'var(--mobile-primary)' : 'var(--mobile-text)' }}>
                      {amountStr}
                    </div>
                    {isPartial && payData && typeof payData === 'object' && payData.remaining && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--mobile-danger)', fontWeight: '700', marginTop: '1px' }}>
                        Balance due: ₹{payData.remaining}
                      </div>
                    )}
                  </div>

                  {/* Payment Date */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--mobile-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                      📅 Payment Date
                    </div>
                    <div style={{ fontSize: '0.83rem', fontWeight: '600', color: 'var(--mobile-text)' }}>
                      {dateStr}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--mobile-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                      Payment Method
                    </div>
                    <div style={{ fontSize: '0.83rem', fontWeight: '600', color: 'var(--mobile-text)' }}>
                      {methodStr}
                    </div>
                  </div>

                  {/* Received By */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--mobile-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                      Received By
                    </div>
                    <div style={{ fontSize: '0.83rem', fontWeight: '600', color: 'var(--mobile-text)' }}>
                      {receiverStr}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--mobile-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                      Remarks
                    </div>
                    <div style={{ fontSize: '0.78rem', color: notesStr !== '—' ? 'var(--mobile-text)' : 'var(--mobile-muted)', fontStyle: notesStr !== '—' ? 'italic' : 'normal' }}>
                      {notesStr}
                    </div>
                  </div>

                </div>

                {/* Action buttons */}
                {isAvailable && (
                  <div style={{ padding: '0 14px 12px', display: 'flex', gap: '8px' }}>
                    {(statusText === 'Pending Due' || statusText === 'Unmarked' || statusText === 'Unpaid') && (
                      <button
                        onClick={() => handleMarkPaid(tenant, selectedTimelineKey)}
                        style={{
                          flex: 1, padding: '9px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                          backgroundColor: 'var(--mobile-primary)', color: '#fff', fontWeight: '800',
                          fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                      >
                        <CheckCircle size={14} /> Mark Paid
                      </button>
                    )}
                    {(isPaid || isPartial) && (
                      <button
                        onClick={() => handleMarkUnpaid(tenant, selectedTimelineKey)}
                        style={{
                          flex: 1, padding: '9px', borderRadius: '9px', fontWeight: '800', fontSize: '0.8rem',
                          background: 'none', border: '1px solid var(--mobile-danger)', color: 'var(--mobile-danger)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                      >
                        <XCircle size={14} /> Mark Unpaid
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditor(tenant, selectedTimelineKey)}
                      style={{
                        padding: '9px 14px', borderRadius: '9px', fontWeight: '700', fontSize: '0.8rem',
                        background: 'var(--mobile-card-bg)', border: '1px solid var(--mobile-border)',
                        color: 'var(--mobile-text)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px'
                      }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT PAYMENT SHEET */}
      {editPaymentNode && (
        <div className="mobile-sheet-overlay" style={{ zIndex: 1260 }} onClick={() => setEditPaymentNode(null)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">💰 Log Payment</h3>
              <button className="mobile-sheet-close" onClick={() => setEditPaymentNode(null)}><X size={18} /></button>
            </div>

            <div style={{ fontSize: '0.82rem', backgroundColor: '#fbfbf9', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--mobile-border)', marginBottom: '4px' }}>
              <div>Resident: <strong>{editPaymentNode.tenantName}</strong></div>
              <div>Month: <strong>{editPaymentNode.monthName}</strong></div>
            </div>

            <form onSubmit={handleSavePaymentDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="mobile-form-group">
                <label className="mobile-form-label">Rent Due (₹)</label>
                <input type="number" className="mobile-form-input" value={customRentDue} onChange={(e) => setCustomRentDue(e.target.value)} min="0" required />
              </div>

              <div className="mobile-form-group">
                <label className="mobile-form-label">Payment Status</label>
                <select className="mobile-form-input" value={paymentStatus} onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  if (e.target.value === 'Paid') { setPaidAmt(customRentDue); setRemainingAmt(''); }
                  else if (e.target.value === 'Unpaid' || e.target.value === 'Unmarked') { setPaidAmt(''); setRemainingAmt(''); }
                }}>
                  <option value="Paid">🟢 Fully Paid</option>
                  <option value="Unpaid">🔴 Unpaid</option>
                  <option value="Partial">🟡 Partial Payment</option>
                  <option value="Unmarked">⚪ Reset / Unmarked</option>
                </select>
              </div>

              {(paymentStatus === 'Paid' || paymentStatus === 'Partial') && (
                <div className="mobile-form-row">
                  <div className="mobile-form-group">
                    <label className="mobile-form-label">Amount Paid (₹)</label>
                    <input type="number" className="mobile-form-input" value={paidAmt} onChange={(e) => {
                      setPaidAmt(e.target.value);
                      if (paymentStatus === 'Partial' && e.target.value) {
                        const diff = (Number(customRentDue) || editPaymentNode.computedRent) - Number(e.target.value);
                        setRemainingAmt(diff > 0 ? diff.toString() : '0');
                      }
                    }} min="0" required />
                  </div>
                  <div className="mobile-form-group">
                    <label className="mobile-form-label">Payment Date</label>
                    <input type="date" className="mobile-form-input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                  </div>
                </div>
              )}

              {paymentStatus === 'Partial' && (
                <div className="mobile-form-group">
                  <label className="mobile-form-label">Balance Remaining (₹)</label>
                  <input type="number" className="mobile-form-input" value={remainingAmt} onChange={(e) => setRemainingAmt(e.target.value)} min="0" required />
                </div>
              )}

              {(paymentStatus === 'Paid' || paymentStatus === 'Partial') && (
                <div className="mobile-form-row">
                  <div className="mobile-form-group">
                    <label className="mobile-form-label">Payment Method</label>
                    <select className="mobile-form-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="UPI">📱 UPI / GPay / PhonePe</option>
                      <option value="Cash">💵 Cash</option>
                      <option value="Bank Transfer">🏦 IMPS / Net Banking</option>
                      <option value="Check">📝 Check</option>
                    </select>
                  </div>
                  <div className="mobile-form-group">
                    <label className="mobile-form-label">Received By</label>
                    <input type="text" className="mobile-form-input" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} required />
                  </div>
                </div>
              )}

              {(paymentStatus === 'Paid' || paymentStatus === 'Partial' || paymentStatus === 'Unpaid') && (
                <div className="mobile-form-group">
                  <label className="mobile-form-label">Remarks / Notes</label>
                  <input type="text" className="mobile-form-input" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="e.g. UPI ref no." />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="mobile-btn" style={{ flex: 1 }} onClick={() => setEditPaymentNode(null)}>Cancel</button>
                <button type="submit" className="mobile-btn mobile-btn-primary" style={{ flex: 1 }}>Save Payment Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

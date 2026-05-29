import React, { useState } from 'react';
import { Check, X, Calendar, TrendingUp, Edit3, Zap, RotateCcw, AlertCircle, FileText, Info } from 'lucide-react';

export default function RentLedger({ 
  tenants, 
  properties, 
  ledger, 
  updatePaymentStatus,
  updateTenantNotes 
}) {
  const monthsBase = [
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

  // Years configured
  const yearsList = [2026, 2027, 2028];

  // Selected timeline state (defaults to current calendar month & year, e.g. May-2026)
  const today = new Date();
  const currentMonthKey = monthsBase[today.getMonth()].key;
  const currentYear = today.getFullYear(); // 2026
  const [selectedTimelineKey, setSelectedTimelineKey] = useState(`${currentMonthKey}-${currentYear}`);

  // Custom Payment Modal Editor States
  const [activeSquare, setActiveSquare] = useState(null); 
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
    return p ? p.name : 'Unknown Property';
  }

  // Look up property payment preference configuration (Cash Preference & Receiving Account)
  const getPropertyPaymentConfig = (propertyId) => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return { isCash: true, account: 'Landlord' };

    const isCash = prop.isCashOnly !== undefined ? prop.isCashOnly : true;
    const account = prop.accountName && prop.accountName !== 'None' && prop.accountName.trim() !== '' ? prop.accountName.trim() : 'Landlord';
    return { isCash, account };
  };

  // Get Payment Data (Backward compatible with old database month formats e.g. "May" mapped to "May-2026")
  const getPaymentData = (tenantPayments, monthKey, year) => {
    const timelineKey = `${monthKey}-${year}`;
    if (tenantPayments[timelineKey] !== undefined) {
      return tenantPayments[timelineKey];
    }
    if (year === 2026 && tenantPayments[monthKey] !== undefined) {
      return tenantPayments[monthKey];
    }
    return undefined;
  };

  // Dynamic Rent Calculation for the selected month using absolute month index formula
  const getRentForMonth = (tenant, timelineKey) => {
    // 1. First check if a manual rent due override is saved in ledger!
    const tenantPayments = ledger[tenant.id] || {};
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const payData = getPaymentData(tenantPayments, monthKey, year);
    if (payData && typeof payData === 'object' && payData.rentDue !== undefined) {
      return payData.rentDue;
    }

    const monthIndex = monthsBase.find(m => m.key === monthKey)?.index || 12;
    const selectedAbsoluteIndex = (year - 2026) * 12 + monthIndex;
    
    if (tenant.scheduledRaiseEffectiveDate) {
      const parts = tenant.scheduledRaiseEffectiveDate.split('-');
      if (parts.length >= 2) {
        const raiseYear = parseInt(parts[0], 10);
        const raiseMonth = parseInt(parts[1], 10);
        const raiseAbsoluteIndex = (raiseYear - 2026) * 12 + raiseMonth;
        
        const baseRent = tenant.rentHistory && tenant.rentHistory[0] ? Number(tenant.rentHistory[0].amount) : Number(tenant.rent);
        
        if (selectedAbsoluteIndex < raiseAbsoluteIndex) {
          // Month prior to scheduled increase
          return baseRent;
        } else {
          // Month on or after scheduled increase
          const raisePercent = Number(tenant.scheduledRaisePercent || 10);
          const raiseAmt = Math.round((baseRent * raisePercent) / 100);
          return baseRent + raiseAmt;
        }
      }
    }
    return tenant.rent;
  };

  // Check if month is available based on move-in date
  const isMonthAvailable = (moveInDateStr, timelineKey) => {
    if (!moveInDateStr) return true;
    const parts = moveInDateStr.split('-');
    if (parts.length < 2) return true;
    
    const moveInYear = parseInt(parts[0], 10);
    const moveInMonth = parseInt(parts[1], 10);
    const moveInAbsoluteIndex = (moveInYear - 2026) * 12 + moveInMonth;
    
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = monthsBase.find(m => m.key === monthKey)?.index || 1;
    const selectedAbsoluteIndex = (year - 2026) * 12 + monthIndex;
    
    return selectedAbsoluteIndex >= moveInAbsoluteIndex;
  };

  const handleOpenSquareEditor = (tenant, timelineKey) => {
    const tenantPayments = ledger[tenant.id] || {};
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    
    const currentData = getPaymentData(tenantPayments, monthKey, year);
    const monthName = monthsBase.find(m => m.key === monthKey)?.name || monthKey;
    const computedRent = getRentForMonth(tenant, timelineKey);
    
    setActiveSquare({
      tenantId: tenant.id,
      tenantName: tenant.name,
      monthKey: timelineKey, // We store the timelineKey directly in database
      monthName: `${monthName} ${year}`,
      monthlyRent: computedRent
    });

    setCustomRentDue(computedRent.toString());
    const todayStr = new Date().toISOString().split('T')[0];
    const { isCash, account } = getPropertyPaymentConfig(tenant.propertyId);

    if (currentData) {
      if (typeof currentData === 'string') {
        setPaymentStatus(currentData);
        setPaidAmt(currentData === 'Paid' ? computedRent.toString() : '');
        setRemainingAmt('');
        setPaymentDate(todayStr);
        setPaymentMethod(isCash ? 'Cash' : 'UPI');
        setReceivedBy(account);
        setPaymentNotes('');
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
      setPaymentStatus('Unmarked');
      setPaidAmt('');
      setRemainingAmt('');
      setPaymentDate(todayStr);
      setPaymentMethod(isCash ? 'Cash' : 'UPI');
      setReceivedBy(account);
      setPaymentNotes('');
    }
  };

  const handleSavePaymentDetails = (e) => {
    e.preventDefault();
    if (!activeSquare) return;

    let details;
    const finalRentDue = Number(customRentDue) || activeSquare.monthlyRent;

    if (paymentStatus === 'Paid') {
      details = { 
        status: 'Paid',
        rentDue: finalRentDue,
        paid: Number(paidAmt) || finalRentDue,
        datePaid: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod,
        receivedBy: receivedBy.trim() || 'Landlord',
        notes: paymentNotes || ''
      };
    } else if (paymentStatus === 'Unpaid') {
      details = { 
        status: 'Unpaid',
        rentDue: finalRentDue,
        datePaid: '',
        paymentMethod: '—',
        receivedBy: receivedBy.trim() || 'Landlord',
        notes: paymentNotes || ''
      };
    } else if (paymentStatus === 'Partial') {
      if (!paidAmt || !remainingAmt) {
        alert('Please fill out both the Paid and Remaining amounts for partial payments.');
        return;
      }
      details = { 
        status: 'Partial', 
        rentDue: finalRentDue,
        paid: Number(paidAmt), 
        remaining: Number(remainingAmt),
        datePaid: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod,
        receivedBy: receivedBy.trim() || 'Landlord',
        notes: paymentNotes || ''
      };
    } else {
      details = {
        status: 'Unmarked',
        rentDue: finalRentDue
      }; 
    }

    updatePaymentStatus(activeSquare.tenantId, activeSquare.monthKey, details);
    setActiveSquare(null);
  };

  // Instant single-click Automated status updates (Paid or Unpaid)
  const handleMarkPaid = (tenant, timelineKey) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const rentAmount = getRentForMonth(tenant, timelineKey);
    const { isCash, account } = getPropertyPaymentConfig(tenant.propertyId);

    const details = {
      status: 'Paid',
      rentDue: rentAmount,
      paid: rentAmount,
      datePaid: todayStr,
      paymentMethod: isCash ? 'Cash' : 'UPI', // Default based on property config
      receivedBy: account, // Default to property account name or "Landlord"
      notes: 'Quick logged as Paid'
    };
    updatePaymentStatus(tenant.id, timelineKey, details);
  };

  const handleMarkUnpaid = (tenant, timelineKey) => {
    const [monthKey, yearStr] = timelineKey.split('-');
    const monthName = monthsBase.find(m => m.key === monthKey)?.name || monthKey;
    
    const doubleCheck = window.confirm(`Reset payment logs for ${tenant.name} - ${monthName} ${yearStr}?`);
    if (doubleCheck) {
      updatePaymentStatus(tenant.id, timelineKey, undefined);
    }
  };

  // Calculate active raises for the selected timeline key
  const getActiveRaisesForSelectedMonth = () => {
    const activeList = [];
    const [selectedMonthKey, selectedYearStr] = selectedTimelineKey.split('-');
    const selectedYear = parseInt(selectedYearStr, 10);
    
    tenants.forEach(t => {
      if (t.scheduledRaiseEffectiveDate) {
        const parts = t.scheduledRaiseEffectiveDate.split('-');
        if (parts.length >= 2) {
          const raiseYear = parseInt(parts[0], 10);
          const raiseMonth = parseInt(parts[1], 10);
          const raiseMonthKey = monthsBase.find(m => m.index === raiseMonth)?.key || '';
          
          if (selectedMonthKey === raiseMonthKey && selectedYear === raiseYear) {
            const baseRent = t.rentHistory && t.rentHistory[0] ? Number(t.rentHistory[0].amount) : Number(t.rent);
            const raisedRent = getRentForMonth(t, selectedTimelineKey);
            activeList.push({
              tenantName: t.name,
              propertyName: getPropertyName(t.propertyId),
              percent: t.scheduledRaisePercent,
              oldRent: baseRent,
              newRent: raisedRent,
              effectiveDate: t.scheduledRaiseEffectiveDate
            });
          }
        }
      }
    });
    return activeList;
  };

  const activeRaises = getActiveRaisesForSelectedMonth();
  const [selMonth, selYear] = selectedTimelineKey.split('-');
  const displayActiveMonthName = `${monthsBase.find(m => m.key === selMonth)?.name} ${selYear}`;

  return (
    <div>
      {/* Page Header */}
      <div className="notebook-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="section-title">Monthly Rent Ledger</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Track monthly rent payments, log payment methods, who collected the rent, and monitor automatic increases.
          </p>
        </div>
      </div>

      {/* Tactile Horizontal Swipable Multi-Year Month Selector Row */}
      <div className="months-horizontal-container" style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '24px',
        alignItems: 'center',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px dashed var(--border-color)'
      }}>
        {yearsList.map((year, yIdx) => (
          <div key={year} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Year Label Tag */}
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: '800',
              fontSize: '0.88rem',
              letterSpacing: '0.5px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              userSelect: 'none'
            }}>
              📅 {year}
            </div>
            
            {/* Month Buttons for this Year */}
            {monthsBase.map(m => {
              const timelineKey = `${m.key}-${year}`;
              const isActive = timelineKey === selectedTimelineKey;
              return (
                <button
                  key={timelineKey}
                  onClick={() => setSelectedTimelineKey(timelineKey)}
                  className={`month-pill-btn ${isActive ? 'active' : ''}`}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--color-secondary)' : 'var(--bg-card)',
                    color: isActive ? '#ffffff' : 'var(--text-main)',
                    boxShadow: isActive ? '0 4px 10px var(--color-secondary-glow)' : 'var(--shadow-sm)',
                    textAlign: 'center',
                    transition: 'var(--transition-normal)',
                    flex: '0 0 auto',
                    minWidth: '56px'
                  }}
                >
                  {m.key}
                </button>
              );
            })}

            {/* Separator between years */}
            {yIdx < yearsList.length - 1 && (
              <div style={{
                width: '1px',
                height: '24px',
                backgroundColor: 'var(--border-color)',
                margin: '0 12px',
                flexShrink: 0
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Active Rent Increase Banners */}
      {activeRaises.map((raise, idx) => (
        <div key={idx} style={{
          backgroundColor: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary)',
          borderLeft: '5px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <TrendingUp size={24} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>
                📈 Rent Increase Active this Month ({displayActiveMonthName})
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                An automatic <strong>{raise.percent}%</strong> raise is now active for <strong style={{
                  color: 'var(--color-secondary)',
                  backgroundColor: 'var(--color-secondary-light)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(204, 90, 55, 0.15)',
                  fontWeight: '800'
                }}>{raise.tenantName}</strong> at <strong>{raise.propertyName}</strong>.
                <br />
                Effective date: {raise.effectiveDate}.
              </div>
            </div>
          </div>

          {/* Highly Visual Rent Rate Badges */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            backgroundColor: '#ffffff', 
            padding: '8px 16px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              ₹{raise.oldRent}
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-primary)' }}>
              ➡️ ₹{raise.newRent}
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              backgroundColor: 'var(--color-primary-light)', 
              color: 'var(--color-primary)', 
              padding: '2px 8px', 
              borderRadius: '4px',
              fontWeight: '800'
            }}>
              +{raise.percent}%
            </span>
          </div>
        </div>
      ))}

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
        <div className="item-card" style={{ borderTop: '4px solid var(--color-primary)', padding: '24px', position: 'relative' }}>
          <div className="card-folder-tab tab-ledger" style={{ top: '-24px', left: '-1px', height: '24px', fontSize: '0.7rem' }}>
            🗓️ {displayActiveMonthName} Sheet
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                  <th style={{ padding: '12px' }}>🏠 Property / Home</th>
                  <th style={{ padding: '12px' }}>👥 Active Tenant</th>
                  <th style={{ padding: '12px' }}>💵 Rent Due</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Amount Paid (₹)</th>
                  <th style={{ padding: '12px' }}>Payment Date</th>
                  <th style={{ padding: '12px' }}>Payment Method</th>
                  <th style={{ padding: '12px' }}>Received By</th>
                  <th style={{ padding: '12px' }}>Remarks / Diary</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => {
                  const tenantPayments = ledger[tenant.id] || {};
                  const isAvailable = isMonthAvailable(tenant.moveInDate, selectedTimelineKey);
                  
                  const [mKey, yStr] = selectedTimelineKey.split('-');
                  const payData = getPaymentData(tenantPayments, mKey, parseInt(yStr, 10));
                  const computedRent = getRentForMonth(tenant, selectedTimelineKey);

                  let statusText = 'Unmarked';
                  let amountStr = '—';
                  let dateStr = '—';
                  let methodStr = '—';
                  let receiverStr = '—';
                  let notesStr = '—';
                  let statusClass = 'status-unmarked';

                  if (!isAvailable) {
                    statusText = 'Prior to Tenancy';
                    statusClass = 'status-prior';
                  } else if (payData) {
                    if (typeof payData === 'string') {
                      statusText = payData;
                      statusClass = payData === 'Paid' ? 'status-paid' : 'status-unpaid';
                      if (payData === 'Paid') amountStr = `₹${computedRent}`;
                    } else {
                      statusText = payData.status || 'Paid';
                      statusClass = payData.status === 'Paid' ? 'status-paid' : payData.status === 'Unpaid' ? 'status-unpaid' : 'status-partial';
                      
                      if (payData.status === 'Paid') {
                        amountStr = `₹${payData.paid || computedRent}`;
                      } else if (payData.status === 'Partial') {
                        amountStr = `₹${payData.paid} (Due: ₹${payData.remaining})`;
                      }
                      
                      dateStr = payData.datePaid || '—';
                      methodStr = payData.paymentMethod || '—';
                      receiverStr = payData.receivedBy || '—';
                      notesStr = payData.notes || '—';
                    }
                  } else {
                    statusText = 'Pending Due';
                    statusClass = 'status-unmarked';
                    amountStr = `₹${computedRent} (Due)`;
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
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--color-primary)' }}>
                        ₹{computedRent}
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
                      <td style={{ padding: '14px 12px', color: 'var(--text-main)', fontWeight: '600' }}>
                        {methodStr}
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-main)' }}>
                        {receiverStr}
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: notesStr !== '—' ? 'italic' : 'normal' }}>
                        {notesStr}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          
                          {/* PAID / NOT PAID Action Buttons */}
                          {isAvailable && (statusText === 'PendingDue' || statusText === 'Pending Due' || statusText === 'Unmarked' || statusText === 'Unpaid') && (
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handleMarkPaid(tenant, selectedTimelineKey)}
                              style={{ padding: '4px 12px', fontSize: '0.78rem', minHeight: '26px', backgroundColor: 'var(--color-primary)' }}
                              title="Mark Paid"
                            >
                              Mark Paid
                            </button>
                          )}

                          {isAvailable && (statusText === 'Paid' || statusText === 'Partial') && (
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleMarkUnpaid(tenant, selectedTimelineKey)}
                              style={{ padding: '4px 12px', fontSize: '0.78rem', minHeight: '26px', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                              title="Mark Unpaid / Reset"
                            >
                              Mark Unpaid
                            </button>
                          )}

                          {/* primary payment editor modal trigger */}
                          {isAvailable && (
                            <button 
                              onClick={() => handleOpenSquareEditor(tenant, selectedTimelineKey)}
                              className="icon-action-btn"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                padding: '6px',
                                display: 'inline-flex',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-card)'
                              }}
                              title="Edit Details & Rent Due"
                            >
                              <Edit3 size={15} />
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

      {/* DETAILED MONTH CHECKLIST STATUS SELECTOR MODAL */}
      {activeSquare && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                💰 Log Payment & Rent Due
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
              <div>🗓️ <strong>Month:</strong> {activeSquare.monthName}</div>
            </div>

            <form onSubmit={handleSavePaymentDetails}>
              {/* Editable Rent Due inside primary payment modal */}
              <div className="form-group">
                <label className="form-label">Rent Due for this Month (₹)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={customRentDue}
                  onChange={(e) => setCustomRentDue(e.target.value)}
                  placeholder="e.g. 8000"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select 
                  className="form-input" 
                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    if (e.target.value === 'Paid') {
                      setPaidAmt(customRentDue);
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
                          const diff = (Number(customRentDue) || activeSquare.monthlyRent) - Number(e.target.value);
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

              {(paymentStatus === 'Paid' || paymentStatus === 'Partial') && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select 
                      className="form-input"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="UPI">📱 UPI / GPay / PhonePe</option>
                      <option value="Cash">💵 Cash</option>
                      <option value="Bank Transfer">🏦 Net Banking / IMPS</option>
                      <option value="Check">📝 Check</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Received By</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="e.g. Landlord, Sanjana"
                      required
                    />
                  </div>
                </div>
              )}

              {(paymentStatus === 'Paid' || paymentStatus === 'Partial' || paymentStatus === 'Unpaid') && (
                <div className="form-group">
                  <label className="form-label">Notes & Remarks</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Enter additional details..."
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

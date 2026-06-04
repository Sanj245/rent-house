import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Calendar, TrendingUp, Edit3, Zap, RotateCcw, AlertCircle, FileText, Info } from 'lucide-react';

export default function RentLedger({ 
  tenants, 
  properties, 
  ledger, 
  updatePaymentStatus,
  updateTenantNotes,
  highlightedTenantId,
  setHighlightedTenantId
}) {
  React.useEffect(() => {
    if (highlightedTenantId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`ledger-row-${highlightedTenantId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const resetTimer = setTimeout(() => {
          if (setHighlightedTenantId) setHighlightedTenantId(null);
        }, 3000);
        return () => clearTimeout(resetTimer);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightedTenantId, setHighlightedTenantId]);
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
  const yearsList = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028];

  // Selected timeline state (defaults to previous calendar month & year, e.g. Apr-2026)
  const today = new Date();
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthKey = monthsBase[prevMonthDate.getMonth()].key;
  const prevYear = prevMonthDate.getFullYear();
  const [selectedTimelineKey, setSelectedTimelineKey] = useState(`${prevMonthKey}-${prevYear}`);

  const activeMonthRef = useRef(null);
  useEffect(() => {
    if (activeMonthRef.current) {
      activeMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, []);

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr === '—') return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    }
    return dateStr;
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Number(val).toLocaleString('en-IN');
  };

  // Custom Payment Modal Editor States
  const [activeSquare, setActiveSquare] = useState(null); 
  const [customRentDue, setCustomRentDue] = useState('');
  const [paidAmt, setPaidAmt] = useState('');
  const [remainingAmt, setRemainingAmt] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [receivedBy, setReceivedBy] = useState('Landlord');
  const [paymentNotes, setPaymentNotes] = useState('None');

  function getPropertyName(id) {
    const p = (properties || []).find(prop => prop.id === id);
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

    const baseRent = tenant.rentHistory && tenant.rentHistory[0] ? Number(tenant.rentHistory[0].amount) : Number(tenant.rent);
    const raisePercent = Number(tenant.scheduledRaisePercent || 5);

    // If no scheduled raise date or move-in date, return current base rent
    if (!tenant.scheduledRaiseEffectiveDate || !tenant.moveInDate) {
      return baseRent;
    }

    // Calculate absolute month index for move-in and selected month
    const moveInParts = tenant.moveInDate.split('-');
    if (moveInParts.length < 2) return baseRent;
    const moveInYear = parseInt(moveInParts[0], 10);
    const moveInMonth = parseInt(moveInParts[1], 10);

    const selectedMonthIndex = monthsBase.find(m => m.key === monthKey)?.index || 12;

    const moveInAbs = moveInYear * 12 + (moveInMonth - 1);
    const selectedAbs = year * 12 + (selectedMonthIndex - 1);

    if (selectedAbs < moveInAbs) {
      return baseRent;
    }

    // Number of 12-month periods elapsed since move-in month
    const monthsElapsed = selectedAbs - moveInAbs;
    const periods = Math.floor(monthsElapsed / 12);

    let currentRent = baseRent;
    for (let i = 0; i < periods; i++) {
      currentRent = currentRent + Math.round((currentRent * raisePercent) / 100);
    }

    return currentRent;
  };

  const isMonthAvailable = (moveInDateStr, timelineKey) => {
    if (!moveInDateStr) return true;
    const parts = moveInDateStr.split('-');
    if (parts.length < 2) return true;
    
    const moveInYear = parseInt(parts[0], 10);
    const moveInMonth = parseInt(parts[1], 10);
    const moveInAbsoluteIndex = (moveInYear - 2020) * 12 + moveInMonth;
    
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = monthsBase.find(m => m.key === monthKey)?.index || 1;
    const selectedAbsoluteIndex = (year - 2020) * 12 + monthIndex;
    
    return selectedAbsoluteIndex >= moveInAbsoluteIndex;
  };

  const getDueDateOfTimelineKey = (timelineKey) => {
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = monthsBase.find(m => m.key === monthKey)?.index;
    if (!monthIndex) return null;
    return new Date(year, monthIndex, 10);
  };

  const getFormattedDueDate = (timelineKey) => {
    const [monthKey, yearStr] = timelineKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = monthsBase.find(m => m.key === monthKey)?.index;
    if (!monthIndex) return '';
    const nextMonthName = monthsBase[monthIndex % 12].name;
    const nextYear = monthIndex === 12 ? year + 1 : year;
    return `10th ${nextMonthName} ${nextYear}`;
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
        setPaidAmt(currentData === 'Paid' ? computedRent.toString() : '');
        setRemainingAmt('');
        setPaymentDate(todayStr);
        setPaymentMethod(isCash ? 'Cash' : 'UPI');
        setReceivedBy(account);
        setPaymentNotes('None');
      } else {
        setPaidAmt(currentData.paid ? currentData.paid.toString() : (currentData.status === 'Paid' ? computedRent.toString() : ''));
        setRemainingAmt(currentData.remaining ? currentData.remaining.toString() : '');
        setPaymentDate(currentData.datePaid || todayStr);
        setPaymentMethod(currentData.paymentMethod || (isCash ? 'Cash' : 'UPI'));
        setReceivedBy(currentData.receivedBy || account);
        setPaymentNotes(currentData.notes || 'None');
      }
    } else {
      setPaidAmt('');
      setRemainingAmt('');
      setPaymentDate(todayStr);
      setPaymentMethod(isCash ? 'Cash' : 'UPI');
      setReceivedBy(account);
      setPaymentNotes('None');
    }
  };

  const handleSavePaymentDetails = (e) => {
    e.preventDefault();
    if (!activeSquare) return;

    let details;
    const finalRentDue = Number(customRentDue) || activeSquare.monthlyRent;
    const finalPaid = Number(paidAmt) || 0;

    if (finalPaid >= finalRentDue) {
      details = { 
        status: 'Paid',
        rentDue: finalRentDue,
        paid: finalPaid,
        datePaid: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod,
        receivedBy: receivedBy.trim() || 'Landlord',
        notes: paymentNotes || 'None'
      };
    } else if (finalPaid > 0 && finalPaid < finalRentDue) {
      details = { 
        status: 'Partial', 
        rentDue: finalRentDue,
        paid: finalPaid,
        remaining: finalRentDue - finalPaid,
        datePaid: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod,
        receivedBy: receivedBy.trim() || 'Landlord',
        notes: paymentNotes || 'None'
      };
    } else {
      details = { 
        status: 'Unpaid',
        rentDue: finalRentDue,
        datePaid: '',
        paymentMethod: '—',
        receivedBy: receivedBy.trim() || 'Landlord',
        notes: paymentNotes || 'None'
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
      notes: 'None'
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
    const selectedMonthIndex = monthsBase.find(m => m.key === selectedMonthKey)?.index || 12;
    
    tenants.forEach(t => {
      if (t.scheduledRaiseEffectiveDate) {
        const parts = t.scheduledRaiseEffectiveDate.split('-');
        if (parts.length >= 2) {
          const raiseYear = parseInt(parts[0], 10);
          const raiseMonth = parseInt(parts[1], 10);
          
          if (selectedMonthKey === (monthsBase.find(m => m.index === raiseMonth)?.key || '') && selectedYear === raiseYear) {
            const raisedRent = getRentForMonth(t, selectedTimelineKey);
            const prevMonthIndex = selectedMonthIndex === 1 ? 12 : selectedMonthIndex - 1;
            const prevYear = selectedMonthIndex === 1 ? selectedYear - 1 : selectedYear;
            const prevMonthKey = monthsBase.find(m => m.index === prevMonthIndex)?.key || '';
            const oldRent = getRentForMonth(t, `${prevMonthKey}-${prevYear}`);
            
            activeList.push({
              tenantName: t.name,
              propertyName: getPropertyName(t.propertyId),
              percent: t.scheduledRaisePercent || 5,
              oldRent,
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

  const getPaymentSortOrder = (tenant) => {
    const tenantPayments = ledger[tenant.id] || {};
    const isAvailable = isMonthAvailable(tenant.moveInDate, selectedTimelineKey);
    
    if (!isAvailable) return 4; // prior to tenancy (show last)
    
    const [mKey, yStr] = selectedTimelineKey.split('-');
    const payData = getPaymentData(tenantPayments, mKey, parseInt(yStr, 10));
    
    if (payData) {
      if (typeof payData === 'string') {
        if (payData === 'Paid') return 3; // Paid
        if (payData === 'Unpaid') return 1; // Unpaid
        return 2; // Partial/Other
      } else {
        if (payData.status === 'Paid') return 3; // Paid
        if (payData.status === 'Partial') return 2; // Partial
        if (payData.status === 'Unpaid') return 1; // Unpaid
      }
    }
    
    // No payData means it's unmarked/pending due, which is "not yet paid" (show first)
    return 1;
  };

  const sortedTenants = [...(tenants || [])]
    .filter(t => t && t.id)
    .sort((a, b) => {
      const orderA = getPaymentSortOrder(a);
      const orderB = getPaymentSortOrder(b);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Secondary sort: alphabetical by property name, then tenant name
      const propA = (getPropertyName(a.propertyId) || '').toLowerCase();
      const propB = (getPropertyName(b.propertyId) || '').toLowerCase();
      if (propA !== propB) return propA.localeCompare(propB);
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

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
                  ref={isActive ? activeMonthRef : null}
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
              ₹{formatCurrency(raise.oldRent)}
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-primary)' }}>
              ➡️ ₹{formatCurrency(raise.newRent)}
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
            Active tenants registered in Tenants tab will automatically populate your ledger sheets.
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
                {sortedTenants.map(tenant => {
                  const tenantPayments = ledger[tenant.id] || {};
                  const isAvailable = isMonthAvailable(tenant.moveInDate, selectedTimelineKey);
                  
                  const [mKey, yStr] = selectedTimelineKey.split('-');
                  const payData = getPaymentData(tenantPayments, mKey, parseInt(yStr, 10));
                  const computedRent = getRentForMonth(tenant, selectedTimelineKey);
                  const dueDate = getDueDateOfTimelineKey(selectedTimelineKey);
                  const isOverdue = dueDate && new Date() >= dueDate;

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
                      if (payData === 'Paid') amountStr = `₹${formatCurrency(computedRent)}`;
                    } else {
                      statusText = payData.status || 'Paid';
                      statusClass = payData.status === 'Paid' ? 'status-paid' : payData.status === 'Partial' ? 'status-partial' : 'status-unpaid';
                      
                      if (payData.status === 'Paid') {
                        amountStr = `₹${formatCurrency(payData.paid || computedRent)}`;
                      } else if (payData.status === 'Partial') {
                        amountStr = `₹${formatCurrency(payData.paid)} (Due: ₹${formatCurrency(payData.remaining)})`;
                      }
                      
                      dateStr = payData.datePaid || '—';
                      methodStr = payData.paymentMethod || '—';
                      receiverStr = payData.receivedBy || '—';
                      notesStr = payData.notes || '—';
                    }
                  } else {
                    statusText = 'Pending Due';
                    statusClass = 'status-unpaid';
                    amountStr = `₹${formatCurrency(computedRent)} (Due)`;
                  }

                  return (
                    <tr 
                      key={tenant.id} 
                      id={`ledger-row-${tenant.id}`}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        fontSize: '0.92rem',
                        opacity: isAvailable ? 1 : 0.5,
                        backgroundColor: tenant.id === highlightedTenantId 
                          ? 'rgba(212, 163, 115, 0.15)' 
                          : (isAvailable && !payData ? 'rgba(214, 73, 51, 0.02)' : 'transparent'),
                        transition: 'all 0.4s ease'
                      }} 
                      className="ruled-row"
                    >
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--text-main)' }}>
                        🏠 {getPropertyName(tenant.propertyId)}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: '600' }}>
                        👤 {tenant.name}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--color-primary)' }}>
                        ₹{formatCurrency(computedRent)}
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
                        {formatDateToDDMMYYYY(dateStr)}
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
                          {isAvailable && (statusText === 'PendingDue' || statusText === 'Pending Due' || statusText === 'Unmarked' || statusText === 'Unpaid' || statusText === 'Overdue' || statusText === 'Awaiting Due') && (
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handleMarkPaid(tenant, selectedTimelineKey)}
                              style={{ padding: '4px 12px', fontSize: '0.78rem', minHeight: '26px', backgroundColor: 'var(--color-primary)' }}
                              title="Mark Paid"
                            >
                              Paid
                            </button>
                          )}

                          {isAvailable && (statusText === 'Paid' || statusText === 'Partial') && (
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleMarkUnpaid(tenant, selectedTimelineKey)}
                              style={{ padding: '4px 12px', fontSize: '0.78rem', minHeight: '26px', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                              title="Mark Unpaid / Reset"
                            >
                              Unpaid
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

              {(() => {
                const rentDueNum = Number(customRentDue) || 0;
                const paidAmtNum = Number(paidAmt) || 0;
                return (
                  <>
                    <div className="form-group">
                      <label className="form-label">Amount Paid (₹)</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={paidAmt}
                        onChange={(e) => setPaidAmt(e.target.value)}
                        placeholder="e.g. 5000"
                        min="0"
                      />
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label">Payment Date</label>
                        <input 
                          type="date" 
                          className="form-input"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          required={paidAmtNum > 0}
                        />
                      </div>

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
                    </div>

                    <div className="form-group">
                      <label className="form-label">Received By</label>
                      <input 
                        type="text" 
                        className="form-input"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        placeholder="e.g. Landlord, Sanjana"
                        required={paidAmtNum > 0}
                      />
                    </div>
                  </>
                );
              })()}

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

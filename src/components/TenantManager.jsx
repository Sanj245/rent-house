import React, { useState } from 'react';
import { Users, Plus, Phone, Calendar, FileText, Upload, Edit3, X, ArrowUpRight, CreditCard, Shield, Image as ImageIcon, AlertTriangle, CheckCircle, DollarSign, Check } from 'lucide-react';
import PdfInlinePreview from './PdfInlinePreview';

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
  if (val === undefined || val === null || val === '—' || isNaN(Number(val))) return '—';
  return Number(val).toLocaleString('en-IN');
};

export default function TenantManager({ 
  tenants, 
  properties, 
  ledger = {},
  addTenant, 
  removeTenant, 
  updateTenantRent,
  editTenant,
  highlightedTenantId,
  setHighlightedTenantId
}) {
  React.useEffect(() => {
    if (highlightedTenantId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`tenant-card-${highlightedTenantId}`);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  
  // Rent Update Modal State
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newRaisePercent, setNewRaisePercent] = useState('5');
  const [effectiveDate, setEffectiveDate] = useState('');

  // Stateful Vacate Modal States
  const [tenantToVacate, setTenantToVacate] = useState(null);
  const [vacateDeductions, setVacateDeductions] = useState(0);
  const [vacateDeductionReason, setVacateDeductionReason] = useState('');
  const [keysReturned, setKeysReturned] = useState(false);
  const [utilitiesCleared, setUtilitiesCleared] = useState(false);
  const [damageInspected, setDamageInspected] = useState(false);

  // Outstanding Rent Dues Calculator
  const getOutstandingDues = (tenant) => {
    if (!tenant || !tenant.moveInDate) return [];
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();
    const monthsKeysList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthsNamesList = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const parts = tenant.moveInDate.split('-');
    const moveInYear = parseInt(parts[0], 10);
    const moveInMonth = parseInt(parts[1], 10); // 1-indexed

    const startAbsolute = (moveInYear - 2020) * 12 + (moveInMonth - 1);
    const currentAbsolute = (currentYear - 2020) * 12 + currentMonthIndex;
    
    const tenantPayments = ledger[tenant.id] || {};
    const outstanding = [];

    for (let abs = startAbsolute; abs <= currentAbsolute; abs++) {
      const y = 2020 + Math.floor(abs / 12);
      const m = abs % 12;
      const monthKey = monthsKeysList[m];
      const monthName = monthsNamesList[m];
      const timelineKey = `${monthKey}-${y}`;

      const payData = tenantPayments[timelineKey] !== undefined
        ? tenantPayments[timelineKey]
        : (y === 2026 ? tenantPayments[monthKey] : undefined);

      let status = 'Unpaid';
      let paidAmt = 0;
      let rentAmt = tenant.rent; // fallback

      if (payData) {
        if (typeof payData === 'string') {
          status = payData;
          paidAmt = payData === 'Paid' ? tenant.rent : 0;
        } else {
          status = payData.status || 'Unpaid';
          paidAmt = payData.paid !== undefined ? Number(payData.paid) : 0;
          rentAmt = payData.rentDue !== undefined ? Number(payData.rentDue) : tenant.rent;
        }
      }

      if (status !== 'Paid') {
        outstanding.push({
          monthName,
          year: y,
          status,
          paidAmount: paidAmt,
          rentDue: rentAmt,
          timelineKey
        });
      }
    }

    return outstanding;
  };

  // Add Tenant Form States
  const [propertyId, setPropertyId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rent, setRent] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [description, setDescription] = useState('');
  const [agreementFile, setAgreementFile] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photo, setPhoto] = useState(null);

  // Image/PDF Document Preview Lightbox State
  const [previewFile, setPreviewFile] = useState(null);

  // Scheduled Raise Form States
  const [scheduledRaisePercent, setScheduledRaisePercent] = useState('5');
  const [scheduledRaiseEffectiveDate, setScheduledRaiseEffectiveDate] = useState('');


  // Get vacant properties dynamically using active tenants check
  const vacantProperties = properties.filter(p => !tenants.some(t => t.propertyId === p.id));

  const handleOpenAdd = () => {
    if (vacantProperties.length === 0) {
      alert('⚠️ No Vacant Properties: Please register a vacant property first before adding a tenant agreement.');
      return;
    }
    setEditingTenant(null);
    setPropertyId(vacantProperties[0].id);
    setName('');
    setPhone('');
    setAltPhone('');
    setSecurityDeposit('10000');
    setRent('8000');
    setDescription('');
    setAgreementFile(null);
    setAadharFile(null);
    setPhoto(null);
    setScheduledRaisePercent('5');

    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setMoveInDate(todayStr);

    // Default raise effective date to exactly 12 months from today
    const twelveMonthsLater = new Date();
    twelveMonthsLater.setMonth(twelveMonthsLater.getMonth() + 12);
    const twelveMonthsLaterStr = twelveMonthsLater.toISOString().split('T')[0];
    setScheduledRaiseEffectiveDate(twelveMonthsLaterStr);

    setIsModalOpen(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    setPropertyId(tenant.propertyId);
    setName(tenant.name);
    setPhone(tenant.phone);
    setAltPhone(tenant.altPhone || '');
    setSecurityDeposit(tenant.securityDeposit.toString());
    setRent(tenant.rent.toString());
    setDescription(tenant.description || '');
    setAgreementFile(tenant.agreementFile || null);
    setAadharFile(tenant.aadharFile || null);
    setPhoto(tenant.photo || null);
    setScheduledRaisePercent(tenant.scheduledRaisePercent !== undefined ? tenant.scheduledRaisePercent.toString() : '5');
    setMoveInDate(tenant.moveInDate || '');
    setScheduledRaiseEffectiveDate(tenant.scheduledRaiseEffectiveDate || '');
    setIsModalOpen(true);
  };

  const handleOpenRentUpdate = (tenant) => {
    setSelectedTenant(tenant);
    setNewRaisePercent('5');
    
    // Default reschedule raise effective date to 12 months from now
    const twelveMonthsLater = new Date();
    twelveMonthsLater.setMonth(twelveMonthsLater.getMonth() + 12);
    const twelveMonthsLaterStr = twelveMonthsLater.toISOString().split('T')[0];
    setEffectiveDate(tenant.scheduledRaiseEffectiveDate || twelveMonthsLaterStr);
    
    setIsRentModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert('❌ File too large:\n\nTo ensure database synchronization, please upload files smaller than 800 KB (e.g., a compressed PDF or image).');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAgreementFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: reader.result 
      });
    };
  };

  const handleAadharFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert('❌ File too large:\n\nTo ensure database synchronization, please upload files smaller than 800 KB.');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAadharFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: reader.result 
      });
    };
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert('❌ Photo file too large:\n\nTo ensure database synchronization, please upload photos smaller than 800 KB.');
      return;
    }


    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setPhoto(reader.result);
    };
  };

  const calculateRentRaiseDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    date.setMonth(date.getMonth() + 12);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !rent || !securityDeposit) {
      alert('Please fill out all required fields.');
      return;
    }

    const tenantData = {
      propertyId,
      name: name.trim(),
      phone: phone.trim(),
      altPhone: altPhone.trim() || 'None',
      description: description.trim() || '',
      securityDeposit: Number(securityDeposit),
      rent: Number(rent),
      moveInDate,
      agreementFile,
      aadharFile,
      photo,
      scheduledRaisePercent: Number(scheduledRaisePercent),
      scheduledRaiseEffectiveDate: calculateRentRaiseDate(moveInDate),
      raiseApplied: editingTenant ? editingTenant.raiseApplied : false,
      rentHistory: editingTenant ? (editingTenant.rentHistory || [{ date: moveInDate, amount: Number(rent), reason: 'Starting Rent' }]) : [
        { date: moveInDate, amount: Number(rent), reason: 'Starting Rent' }
      ]
    };

    if (editingTenant) {
      editTenant(editingTenant.id, tenantData);
    } else {
      addTenant(tenantData);
    }
    setIsModalOpen(false);
  };


  const handleRentUpdateSubmit = (e) => {
    e.preventDefault();
    if (!newRaisePercent || !effectiveDate) {
      alert('Please fill out all fields.');
      return;
    }
    updateTenantRent(selectedTenant.id, Number(newRaisePercent), effectiveDate);
    setIsRentModalOpen(false);
  };

  const handleRemove = (tenant) => {
    setTenantToVacate(tenant);
    setVacateDeductions(0);
    setVacateDeductionReason('');
    setKeysReturned(false);
    setUtilitiesCleared(false);
    setDamageInspected(false);
  };

  function getPropertyName(id) {
    const p = properties.find(prop => prop.id === id);
    return p ? p.name : 'Unknown Property';
  }

  // Pre-calculate upcoming rent amount for previewing
  const getRaisePreview = (currentRent, percent) => {
    const rentNum = Number(currentRent);
    const pctNum = Number(percent);
    const raise = Math.round((rentNum * pctNum) / 100);
    return { raise, newRent: rentNum + raise };
  };

  return (
    <div>
      <div className="notebook-header">
        <div>
          <h2 className="section-title">Tenant Registry</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage active tenants, security deposits, and schedule automatic rent increases.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Tenant
        </button>
      </div>

      {tenants.length === 0 ? (
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          padding: '40px', 
          borderRadius: 'var(--radius-lg)', 
          textAlign: 'center' 
        }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Active Tenants</h3>
          <p style={{ fontSize: '0.95rem', marginBottom: '20px', color: 'var(--text-muted)' }}>
            Register tenant contact details and rent arrangements to start logs.
          </p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            Register First Tenant
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {tenants.map((tenant) => {
            const preview = getRaisePreview(tenant.rent, tenant.scheduledRaisePercent);

            return (
              <div 
                key={tenant.id} 
                id={`tenant-card-${tenant.id}`}
                className="item-card" 
                style={{ 
                  borderLeft: '4px solid var(--color-secondary)',
                  transition: 'all 0.4s ease',
                  ...(tenant.id === highlightedTenantId ? {
                    boxShadow: '0 0 20px var(--color-secondary-glow)',
                    borderColor: 'var(--color-secondary)',
                    transform: 'scale(1.01)',
                    backgroundColor: 'rgba(212, 163, 115, 0.05)'
                  } : {})
                }}
              >
                {/* Visual Notebook Dossier Tab */}
                <div className="card-folder-tab tab-dossier">
                  👥 Dossier
                </div>

                <div>
                  <div className="item-card-header" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {tenant.photo ? (
                        <img 
                          src={tenant.photo} 
                          alt={tenant.name} 
                          onClick={() => setPreviewImage(tenant.photo)}
                          style={{ 
                            width: '46px', 
                            height: '46px', 
                            borderRadius: '50%', 
                            objectFit: 'cover', 
                            border: '2px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                          className="tenant-avatar-hover"
                          title="Click to view full photo"
                        />
                      ) : (
                        <div style={{ 
                          width: '46px', 
                          height: '46px', 
                          borderRadius: '50%', 
                          backgroundColor: 'var(--color-secondary-light)', 
                          color: 'var(--color-secondary)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '1rem',
                          border: '2px solid var(--border-color)'
                        }}>
                          {tenant.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="item-card-title" style={{ fontSize: '1.25rem' }}>{tenant.name}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Registered Tenant</div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenEdit(tenant)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '6px',
                        display: 'inline-flex',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      title="Edit Agreement Details"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-secondary)', marginTop: '2px', marginBottom: '14px' }}>
                    🏠 {getPropertyName(tenant.propertyId)}
                  </div>

                  <div className="item-details-list">
                    <div className="detail-row">
                      <span className="label">📞 Phone Number</span>
                      <span className="value" style={{ fontWeight: '700' }}>{tenant.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">📱 Alt Phone No.</span>
                      <span className="value">{tenant.altPhone || tenant.emergencyContact || 'None'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">💰 Monthly Rent</span>
                      <span className="value" style={{ color: 'var(--color-primary)', fontSize: '1.15rem', fontWeight: '800' }}>
                        ₹{formatCurrency(tenant.rent)}/mo
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">🔐 Security Deposit</span>
                      <span className="value" style={{ color: 'var(--color-purple)', fontWeight: '700' }}>
                        ₹{formatCurrency(tenant.securityDeposit)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">📅 Move-in Date</span>
                      <span className="value" style={{ fontWeight: '700' }}>{formatDateToDDMMYYYY(tenant.moveInDate)}</span>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div style={{ 
                    marginTop: '16px', 
                    paddingTop: '14px', 
                    borderTop: '1px dashed var(--border-color)' 
                  }}>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: '800', 
                      textTransform: 'uppercase', 
                      color: 'var(--text-muted)', 
                      marginBottom: '8px', 
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      📁 Attached Documents
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Aadhar Card Display */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CreditCard size={16} style={{ color: 'var(--color-secondary)' }} />
                          <div style={{ fontSize: '0.88rem', fontWeight: '600' }}>Landlord Aadhar</div>
                        </div>
                        <div>
                          {tenant.aadharFile ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {tenant.aadharFile.data ? (
                                <button 
                                  onClick={() => setPreviewFile(tenant.aadharFile)}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '4px 8px', 
                                    fontSize: '0.75rem', 
                                    minHeight: '24px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <ImageIcon size={12} /> Preview
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  Attached
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Not Provided
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Signed Agreement Display */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                          <div style={{ fontSize: '0.88rem', fontWeight: '600' }}>Signed Agreement</div>
                        </div>
                        <div>
                          {tenant.agreementFile ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {tenant.agreementFile.data ? (
                                <button 
                                  onClick={() => setPreviewFile(tenant.agreementFile)}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '4px 8px', 
                                    fontSize: '0.75rem', 
                                    minHeight: '24px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <FileText size={12} /> Preview
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  Attached
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Not Provided
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Landlord Description Notes */}
                  {tenant.description && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: '800', 
                        textTransform: 'uppercase', 
                        color: 'var(--text-muted)', 
                        marginBottom: '6px', 
                        letterSpacing: '0.5px' 
                      }}>
                        📝 Agreement Description
                      </div>
                      <div className="diary-ruled-sheet" style={{ 
                        whiteSpace: 'pre-wrap', 
                        minHeight: 'auto', 
                        padding: '10px 14px',
                        lineHeight: '1.6',
                        fontSize: '0.88rem'
                      }}>
                        {tenant.description}
                      </div>
                    </div>
                  )}



                  {/* AUTOMATIC SCHEDULED RENT INCREASE BOX */}
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    backgroundColor: tenant.raiseApplied ? 'var(--color-primary-light)' : 'var(--color-secondary-light)', 
                    border: `1px solid ${tenant.raiseApplied ? 'var(--color-primary)' : 'var(--color-secondary)'}`,
                    borderRadius: 'var(--radius-md)' 
                  }}>
                    <h4 style={{ 
                      fontSize: '0.85rem', 
                      color: tenant.raiseApplied ? 'var(--color-primary)' : 'var(--color-secondary)', 
                      fontWeight: '700', 
                      marginBottom: '4px' 
                    }}>
                      {tenant.raiseApplied ? '✅ Rent Raise Applied' : '📈 Scheduled Rent Increase (12 Months):'}
                    </h4>
                    
                    {tenant.raiseApplied ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        Rent raised by <strong>{tenant.scheduledRaisePercent}%</strong> on <strong>{formatDateToDDMMYYYY(tenant.scheduledRaiseEffectiveDate)}</strong>.
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                        Automatic <strong>{tenant.scheduledRaisePercent}%</strong> Rent Increase set for <strong>{formatDateToDDMMYYYY(tenant.scheduledRaiseEffectiveDate)}</strong>.
                        <br />
                        Rent will raise to <strong>₹{formatCurrency(getRaisePreview(tenant.rent, tenant.scheduledRaisePercent).newRent)}</strong>.
                      </div>
                    )}

                    {/* Reschedule Button */}
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleOpenRentUpdate(tenant)}
                      style={{ 
                        width: '100%', 
                        fontSize: '0.8rem', 
                        padding: '4px 8px', 
                        minHeight: '28px',
                        marginTop: tenant.raiseApplied ? '6px' : '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <ArrowUpRight size={14} /> {tenant.raiseApplied ? 'Schedule Next Increase' : 'Edit Scheduled Increase'}
                    </button>
                  </div>

                  {/* AUTOMATIC SCHEDULED DEPOSIT INCREASE REMOVED */}

                </div>

                <div className="item-card-actions" style={{ marginTop: '14px' }}>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleRemove(tenant)}
                    style={{ 
                      width: '100%',
                      padding: '12px 20px',
                      fontSize: '1rem',
                      fontWeight: '800',
                      letterSpacing: '0.2px',
                      minHeight: '48px'
                    }}
                  >
                    🚪 Vacate Property (End Tenancy)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tenant Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTenant ? `Edit Tenant Details for ${editingTenant.name}` : 'Register Tenant'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* 1. Property Name */}
              <div className="form-group">
                <label className="form-label">🏠 Select Rental Property</label>
                <select 
                  className="form-input" 
                  value={propertyId} 
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                  disabled={!!editingTenant}
                  style={{ opacity: editingTenant ? 0.7 : 1, cursor: editingTenant ? 'not-allowed' : 'default' }}
                >
                  {editingTenant ? (
                    <option value={editingTenant.propertyId}>
                      {getPropertyName(editingTenant.propertyId)}
                    </option>
                  ) : (
                    vacantProperties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.address})</option>
                    ))
                  )}
                </select>
              </div>

              {/* 2. Tenant Name & Tenant Photo */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">👥 Tenant Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter tenant full name" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📸 Tenant Photo (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-input"
                    onChange={handlePhotoChange}
                    style={{ cursor: 'pointer', padding: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* 3. Phone Number & Alt Phone No. */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">📞 Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Enter active phone number" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📱 Alt Phone No.</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={altPhone} 
                    onChange={(e) => setAltPhone(e.target.value)} 
                    placeholder="Enter alternative contact number" 
                  />
                </div>
              </div>

              {/* 4. Add Documents Section (Aadhar Card and Signed Agreement side-by-side) */}
              <div style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '14px', 
                backgroundColor: 'rgba(29, 36, 43, 0.01)',
                marginBottom: '16px',
                marginTop: '8px'
              }}>
                <h4 style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📁 Attach Verified Documents
                </h4>
                
                <div className="form-row-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>🪪 Landlord Aadhar Card (Image or PDF)</label>
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      className="form-input"
                      onChange={handleAadharFileChange}
                      style={{ cursor: 'pointer', padding: '6px', fontSize: '0.85rem' }}
                    />
                    {aadharFile && (
                      <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-secondary)', fontWeight: '600' }}>
                        📎 Attached: {aadharFile.name}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>📄 Signed Agreement File (PDF/Word)</label>
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.doc" 
                      className="form-input"
                      onChange={handleFileChange}
                      style={{ cursor: 'pointer', padding: '6px', fontSize: '0.85rem' }}
                    />
                    {agreementFile && (
                      <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                        📎 Attached: {agreementFile.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Custom Description Text Area */}
              <div className="form-group">
                <label className="form-label">📝 Tenant Notes / Description</label>
                <textarea 
                  className="form-input" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Enter notes, special terms, or any details you want to save for this tenant..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* 6. Rent Amount & Security Deposit */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">💰 Monthly Rent Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={rent} 
                    onChange={(e) => setRent(e.target.value)} 
                    min="1" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">🔐 Security Deposit Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={securityDeposit} 
                    onChange={(e) => setSecurityDeposit(e.target.value)} 
                    min="0" 
                    required
                  />
                </div>
              </div>

              {/* 7. Move-in Date */}
              <div className="form-group">
                <label className="form-label">📅 Move-in Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={moveInDate} 
                  onChange={(e) => setMoveInDate(e.target.value)} 
                  required
                />
              </div>

              {/* 8. Rent Increase Scheduled Info */}
              <div style={{ 
                backgroundColor: 'var(--color-secondary-light)', 
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginTop: '16px',
                marginBottom: '16px' 
              }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--color-secondary)', fontWeight: '700', marginBottom: '6px' }}>
                  📈 Schedule Automatic Rent Increase (12 Months)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  The monthly rent will automatically increase by the following percentage exactly **12 months** from move-in:
                </p>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Rent Raise Percentage (%)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={scheduledRaisePercent} 
                    onChange={(e) => setScheduledRaisePercent(e.target.value)} 
                    min="0"
                    max="100"
                    required
                  />
                </div>

                {rent && scheduledRaisePercent && (
                  <div style={{ 
                    marginTop: '10px', 
                    fontSize: '0.85rem', 
                    fontWeight: '700', 
                    color: 'var(--text-main)',
                    textAlign: 'center' 
                  }}>
                    Future Proj: rent raises to{' '}
                    <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>
                      ₹{formatCurrency(getRaisePreview(rent, scheduledRaisePercent).newRent)}
                    </span>{' '}
                    (Increase of +₹{formatCurrency(getRaisePreview(rent, scheduledRaisePercent).raise)} after 12 months)
                  </div>
                )}
              </div>


              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flexGrow: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flexGrow: 1 }}
                >
                  {editingTenant ? 'Save Tenant Details' : 'Register Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule/Reschedule Rent Raise Modal */}
      {isRentModalOpen && selectedTenant && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📈 Schedule Automatic Rent Increase</h3>
              <button 
                onClick={() => setIsRentModalOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRentUpdateSubmit}>
              <div className="form-group">
                <label className="form-label">Current Monthly Rent</label>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  ₹{formatCurrency(selectedTenant.rent)} / month
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Raise Percentage (%)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newRaisePercent} 
                  onChange={(e) => setNewRaisePercent(e.target.value)} 
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Scheduled Effective Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={effectiveDate} 
                  onChange={(e) => setEffectiveDate(e.target.value)} 
                  required
                />
              </div>

              {newRaisePercent && (
                <div style={{ 
                  margin: '12px 0', 
                  fontSize: '0.85rem', 
                  fontWeight: '700', 
                  color: 'var(--text-main)',
                  textAlign: 'center' 
                }}>
                  Projection: Rent becomes{' '}
                  <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>
                    ₹{formatCurrency(getRaisePreview(selectedTenant.rent, newRaisePercent).newRent)}
                  </span>{' '}
                  (+₹{formatCurrency(getRaisePreview(selectedTenant.rent, newRaisePercent).raise)})
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsRentModalOpen(false)}
                  style={{ flexGrow: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flexGrow: 1 }}
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stateful Vacate Checklist & Settlement Modal */}
      {tenantToVacate && (
        <div className="modal-overlay" style={{ zIndex: 2500 }}>
          <div className="modal-content" style={{ maxWidth: '580px', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '1.4rem' }}>
                🚪 Vacate Property Checklist
              </h3>
              <button 
                onClick={() => setTenantToVacate(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>
                Ending Tenancy Cycle for <span style={{ color: 'var(--color-secondary)' }}>{tenantToVacate.name}</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Property: <strong>{getPropertyName(tenantToVacate.propertyId)}</strong>
              </div>
            </div>

            {/* DUES CHECKER PANEL */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💸 Rent Dues Ledger Audit
              </h4>
              
              {(() => {
                const outstanding = getOutstandingDues(tenantToVacate);
                if (outstanding.length === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', fontSize: '0.88rem', fontWeight: '600' }}>
                      <CheckCircle size={18} />
                      All monthly payments are fully cleared in the ledger!
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px dashed #ef4444', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', fontWeight: '700' }}>
                      <AlertTriangle size={18} />
                      Warning: Tenant has {outstanding.length} month(s) with pending rent dues!
                    </div>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-app)', padding: '6px' }}>
                      {outstanding.map((d, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderBottom: index === outstanding.length - 1 ? 'none' : '1px solid var(--border-color)', fontSize: '0.84rem' }}>
                          <span style={{ fontWeight: '700' }}>📅 {d.monthName} {d.year}</span>
                          <span style={{ color: '#ef4444', fontWeight: '700' }}>
                            {d.status === 'Partial' ? `Partial (Paid ₹${formatCurrency(d.paidAmount)} / Due ₹${formatCurrency(d.rentDue)})` : `Unpaid (₹${formatCurrency(d.rentDue)})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECURITY DEPOSIT SETTLEMENT LEDGER */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                🔐 Security Deposit Settlement
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Initial Deposit Received</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-purple)', marginTop: '2px' }}>₹{formatCurrency(tenantToVacate.securityDeposit)}</div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Deductions Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={vacateDeductions}
                    onChange={(e) => setVacateDeductions(Math.max(0, Number(e.target.value)))}
                    style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Deduction Reason / Settlement Notes</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={vacateDeductionReason}
                  onChange={(e) => setVacateDeductionReason(e.target.value)}
                  placeholder="e.g. Cleaning dues, wall painting, kitchen AC repair..."
                  style={{ padding: '8px 10px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Net Refund to Tenant:</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--color-primary)' }}>
                  ₹{formatCurrency(Math.max(0, Number(tenantToVacate.securityDeposit) - Number(vacateDeductions)))}
                </div>
              </div>
            </div>

            {/* CHECKLIST STEPS */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                📝 Physical Move-Out Checklist
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.92rem' }}>
                  <input 
                    type="checkbox" 
                    checked={keysReturned} 
                    onChange={(e) => setKeysReturned(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  🗝️ All sets of keys collected and verified
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.92rem' }}>
                  <input 
                    type="checkbox" 
                    checked={utilitiesCleared} 
                    onChange={(e) => setUtilitiesCleared(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  ⚡ Electricity, water, and utility bills cleared
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.92rem' }}>
                  <input 
                    type="checkbox" 
                    checked={damageInspected} 
                    onChange={(e) => setDamageInspected(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  🛠️ Property inspected thoroughly for damages
                </label>
              </div>
            </div>

            {/* WARNING ALERT */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '24px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Warning:</strong> Vacating this property ends the tenant cycle permanently, frees up the home to "Vacant", and archives these checkout details into your historical logs. This action cannot be undone.
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setTenantToVacate(null)}
                style={{ flexGrow: 1, minHeight: '44px', fontWeight: '700' }}
              >
                Keep Active
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => {
                  const refund = Math.max(0, Number(tenantToVacate.securityDeposit) - Number(vacateDeductions));
                  removeTenant(tenantToVacate.id, tenantToVacate.propertyId, vacateDeductions, refund, vacateDeductionReason);
                  setTenantToVacate(null);
                }}
                style={{ flexGrow: 1, minHeight: '44px', fontWeight: '800' }}
              >
                🚪 Confirm & Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Lightbox Modal */}
      {previewFile && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setPreviewFile(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📄 Preview: {previewFile.name}</h3>
              <button 
                onClick={() => setPreviewFile(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ 
              backgroundColor: '#f5f3f0', 
              padding: '12px', 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '250px'
            }}>
              {previewFile.type && previewFile.type.startsWith('image') ? (
                <img 
                  src={previewFile.data} 
                  alt="Document Preview" 
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }} 
                />
              ) : previewFile.type && previewFile.type.includes('pdf') ? (
                <PdfInlinePreview pdfData={previewFile.data} />
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={48} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
                  <p style={{ fontWeight: '600' }}>Preview not available for this file type.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>File format: {previewFile.type || 'Unknown'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

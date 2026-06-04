import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Phone, 
  X, 
  FileText, 
  ArrowUpRight, 
  CreditCard,
  Search,
  MessageSquare,
  Calendar,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Check,
  Edit3
} from 'lucide-react';
import PdfInlinePreview from '../PdfInlinePreview';

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === '—' || isNaN(Number(val))) return '—';
  return Number(val).toLocaleString('en-IN');
};

const compressImage = (file, maxWidth, maxHeight, quality) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

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

export default function MobileTenantManager({
  tenants,
  properties,
  ledger = {},
  addTenant,
  removeTenant,
  scheduleRentRaise,
  openSheet,
  activeSheet,
  closeSheet,
  isPortal = false,
  editTenant,
  editingTenant,
  setEditingTenant,
  highlightedTenantId,
  setHighlightedTenantId
}) {
  useEffect(() => {
    if (highlightedTenantId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`mobile-tenant-card-${highlightedTenantId}`);
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected tenant details drawer
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Stateful Vacate bottom drawer sheet states
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

  // Rent Raise Update drawer state
  const [isRaiseSheetOpen, setIsRaiseSheetOpen] = useState(false);
  const [targetTenant, setTargetTenant] = useState(null);
  const [raisePercent, setRaisePercent] = useState('5');
  const [raiseEffectiveDate, setRaiseEffectiveDate] = useState('');

  // Add Tenant Form States
  const [propertyId, setPropertyId] = useState(() => {
    const vacant = properties.filter(p => !tenants.some(t => t.propertyId === p.id));
    return vacant.length > 0 ? vacant[0].id : '';
  });
  
  useEffect(() => {
    if (activeSheet === 'edit-tenant') return;
    const vacant = properties.filter(p => !tenants.some(t => t.propertyId === p.id));
    const isCurrentVacant = vacant.some(p => p.id === propertyId);
    if (!isCurrentVacant && vacant.length > 0) {
      setPropertyId(vacant[0].id);
    }
  }, [properties, tenants, propertyId, activeSheet]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('10000');
  const [rent, setRent] = useState('8000');
  const [moveInDate, setMoveInDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [description, setDescription] = useState('');
  
  // Documents attachments
  const [agreementFile, setAgreementFile] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [scheduledRaisePercent, setScheduledRaisePercent] = useState('5');

  useEffect(() => {
    if (activeSheet === 'edit-tenant' && editingTenant) {
      setPropertyId(editingTenant.propertyId);
      setName(editingTenant.name);
      setPhone(editingTenant.phone);
      setAltPhone(editingTenant.altPhone || '');
      setSecurityDeposit(editingTenant.securityDeposit.toString());
      setRent(editingTenant.rent.toString());
      setDescription(editingTenant.description || '');
      setAgreementFile(editingTenant.agreementFile || null);
      setAadharFile(editingTenant.aadharFile || null);
      setPhoto(editingTenant.photo || null);
      setScheduledRaisePercent(editingTenant.scheduledRaisePercent !== undefined ? editingTenant.scheduledRaisePercent.toString() : '5');
      setMoveInDate(editingTenant.moveInDate || '');
    } else if (activeSheet === 'add-tenant') {
      const vacant = properties.filter(p => !tenants.some(t => t.propertyId === p.id));
      setPropertyId(vacant.length > 0 ? vacant[0].id : '');
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
      setMoveInDate(new Date().toISOString().split('T')[0]);
    }
  }, [activeSheet, editingTenant, properties, tenants]);

  const [previewFile, setPreviewFile] = useState(null); // image/PDF preview object

  const vacantProperties = properties.filter(p => !tenants.some(t => t.propertyId === p.id));

  const handleOpenAdd = () => {
    if (vacantProperties.length === 0) {
      alert('⚠️ No Vacant Properties: Please register a vacant property first before adding a tenant agreement.');
      return;
    }
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
    
    const todayStr = new Date().toISOString().split('T')[0];
    setMoveInDate(todayStr);

    openSheet('add-tenant');
  };

  const handleOpenRaiseUpdate = (tenant, e) => {
    e.stopPropagation(); // Stop opening main details sheet
    setTargetTenant(tenant);
    setRaisePercent(tenant.scheduledRaisePercent?.toString() || '5');
    
    const twelveMonthsLater = new Date();
    twelveMonthsLater.setMonth(twelveMonthsLater.getMonth() + 12);
    const twelveMonthsLaterStr = twelveMonthsLater.toISOString().split('T')[0];
    setRaiseEffectiveDate(tenant.scheduledRaiseEffectiveDate || twelveMonthsLaterStr);
    
    setIsRaiseSheetOpen(true);
  };

  const handleAadharFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressedData = await compressImage(file, 900, 900, 0.75);
        setAadharFile({
          name: file.name,
          size: Math.round(compressedData.length * 0.75),
          type: 'image/jpeg',
          data: compressedData
        });
      } catch (err) {
        console.error(err);
        alert('⚠️ Failed to process image.');
      }
    } else {
      if (file.size > 300 * 1024) {
        alert('⚠️ PDF File Too Large:\n\nTo ensure reliable synchronization, please upload PDFs smaller than 300 KB. Try compressing your PDF file or uploading a compressed JPG photo instead.');
        e.target.value = '';
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
    }
  };

  const handleAgreementFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressedData = await compressImage(file, 900, 900, 0.75);
        setAgreementFile({
          name: file.name,
          size: Math.round(compressedData.length * 0.75),
          type: 'image/jpeg',
          data: compressedData
        });
      } catch (err) {
        console.error(err);
        alert('⚠️ Failed to process image.');
      }
    } else {
      if (file.size > 300 * 1024) {
        alert('⚠️ PDF File Too Large:\n\nTo ensure reliable synchronization, please upload PDFs smaller than 300 KB. Try compressing your PDF file or uploading a compressed JPG photo instead.');
        e.target.value = '';
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
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedData = await compressImage(file, 400, 400, 0.7);
      setPhoto(compressedData);
    } catch (err) {
      console.error(err);
      alert('⚠️ Failed to process photo.');
    }
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
      scheduledRaiseEffectiveDate: (activeSheet === 'edit-tenant' && editingTenant) ? (editingTenant.scheduledRaiseEffectiveDate || calculateRentRaiseDate(moveInDate)) : calculateRentRaiseDate(moveInDate),
      raiseApplied: activeSheet === 'edit-tenant' && editingTenant ? editingTenant.raiseApplied : false,
      rentHistory: activeSheet === 'edit-tenant' && editingTenant ? (editingTenant.rentHistory || [{ date: moveInDate, amount: Number(rent), reason: 'Starting Rent' }]) : [
        { date: moveInDate, amount: Number(rent), reason: 'Starting Rent' }
      ]
    };

    if (activeSheet === 'edit-tenant' && editingTenant) {
      editTenant(editingTenant.id, tenantData);
      if (setEditingTenant) setEditingTenant(null);
    } else {
      addTenant(tenantData);
    }
    closeSheet();
  };

  const handleRaiseSubmit = (e) => {
    e.preventDefault();
    if (!raisePercent || !raiseEffectiveDate) {
      alert('Please fill out all fields.');
      return;
    }
    scheduleRentRaise(targetTenant.id, Number(raisePercent), raiseEffectiveDate);
    setIsRaiseSheetOpen(false);
    setSelectedTenant(null); // Close main detail sheet too if open
  };

  const handleRemove = (tenant, e) => {
    e.stopPropagation();
    setTenantToVacate(tenant);
    setVacateDeductions(0);
    setVacateDeductionReason('');
    setKeysReturned(false);
    setUtilitiesCleared(false);
    setDamageInspected(false);
  };

  function getPropertyName(id) {
    const p = properties.find(prop => prop.id === id);
    return p ? p.name : 'Unknown';
  }

  const getRaisePreview = (currentRent, percent) => {
    const rentNum = Number(currentRent);
    const pctNum = Number(percent);
    const raise = Math.round((rentNum * pctNum) / 100);
    return { raise, newRent: rentNum + raise };
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    getPropertyName(t.propertyId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {!isPortal && (
        <>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '2px' }}>
              Tenants Dossiers
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--mobile-muted)' }}>
              Track resident contact cards, verified files, and custom rental scheduled raises.
            </p>
          </div>

          {/* Search bar */}
          <div className="mobile-search-wrapper">
            <Search size={18} className="mobile-search-icon" />
            <input 
              type="text" 
              className="mobile-search-input" 
              placeholder="Search by tenant or home name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tenant agreement card list */}
          {filteredTenants.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 16px', 
              backgroundColor: 'var(--mobile-card-bg)', 
              borderRadius: 'var(--mobile-radius)',
              border: '1px solid var(--mobile-border)'
            }}>
              <Users size={36} style={{ color: 'var(--mobile-muted)', marginBottom: '10px', display: 'inline-block' }} />
              <h4 style={{ fontWeight: '800', fontSize: '1rem' }}>No Active Tenants</h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--mobile-muted)', marginTop: '4px' }}>
                Tap the Floating action button (+) or click below to register a new tenant dossier:
              </p>
              <button 
                className="mobile-btn mobile-btn-primary" 
                onClick={handleOpenAdd}
                style={{ marginTop: '16px', width: '100%' }}
              >
                Register Tenant
              </button>
            </div>
          ) : (
            <div className="mobile-feed-container">
              {filteredTenants.map(t => {
                const preview = getRaisePreview(t.rent, t.scheduledRaisePercent || 10);
                return (
                  <div 
                    key={t.id} 
                    id={`mobile-tenant-card-${t.id}`}
                    className="mobile-card"
                    onClick={() => setSelectedTenant(t)}
                    style={{ 
                      borderLeft: '4px solid var(--mobile-secondary)', 
                      cursor: 'pointer',
                      transition: 'all 0.4s ease',
                      ...(t.id === highlightedTenantId ? {
                        boxShadow: '0 0 15px rgba(212, 163, 115, 0.4)',
                        borderColor: 'var(--mobile-secondary)',
                        backgroundColor: 'rgba(212, 163, 115, 0.05)'
                      } : {})
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {t.photo ? (
                        <img 
                          src={t.photo} 
                          alt={t.name} 
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          backgroundColor: 'rgba(204, 90, 55, 0.08)',
                          color: 'var(--mobile-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '0.9rem'
                        }}>
                          {t.name ? t.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                      )}
                      
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: '800' }}>{t.name}</h4>
                        <p style={{ fontSize: '0.76rem', color: 'var(--mobile-secondary)', fontWeight: '700', marginTop: '1px' }}>
                          🏠 {getPropertyName(t.propertyId)}
                        </p>
                      </div>
                    </div>

                    <div className="mobile-detail-row">
                      <span className="mobile-detail-label">Monthly Rent Amount</span>
                      <span className="mobile-detail-value" style={{ color: 'var(--mobile-primary)', fontWeight: '800' }}>
                        ₹{formatCurrency(t.rent)}/mo
                      </span>
                    </div>

                    <div className="mobile-detail-row">
                      <span className="mobile-detail-label">Security Deposit</span>
                      <span className="mobile-detail-value">₹{formatCurrency(t.securityDeposit)}</span>
                    </div>

                    {/* Direct Contact Buttons Bar */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
                      <a 
                        className="mobile-btn mobile-btn-call" 
                        href={`tel:${t.phone}`}
                        style={{ flex: 1, textDecoration: 'none' }}
                      >
                        <Phone size={14} /> Call
                      </a>
                      <a 
                        className="mobile-btn" 
                        href={`sms:${t.phone}`}
                        style={{ flex: 1, textDecoration: 'none' }}
                      >
                        <MessageSquare size={14} /> Message
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SELECTED TENANT DOSSIER DETAILS SHEET DRAWER */}
      {selectedTenant && !isPortal && (
        <div className="mobile-sheet-overlay" onClick={() => setSelectedTenant(null)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">👥 Tenant Dossier Sheet</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="mobile-sheet-close" 
                  onClick={() => {
                    setEditingTenant(selectedTenant);
                    openSheet('edit-tenant');
                    setSelectedTenant(null);
                  }}
                  style={{ color: 'var(--mobile-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Edit Agreement Details"
                >
                  <Edit3 size={18} />
                </button>
                <button className="mobile-sheet-close" onClick={() => setSelectedTenant(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {selectedTenant.photo ? (
                <img 
                  src={selectedTenant.photo} 
                  alt={selectedTenant.name} 
                  style={{ width: '50px', height: '50px', borderRadius: '25px', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '25px', 
                  backgroundColor: 'rgba(204, 90, 55, 0.08)',
                  color: 'var(--mobile-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.1rem'
                }}>
                  {selectedTenant.name ? selectedTenant.name.charAt(0).toUpperCase() : 'T'}
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{selectedTenant.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--mobile-secondary)', fontWeight: '700' }}>
                  🏠 {getPropertyName(selectedTenant.propertyId)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">📞 Primary Phone</span>
                <span className="mobile-detail-value">{selectedTenant.phone}</span>
              </div>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">📱 Backup Phone</span>
                <span className="mobile-detail-value">{selectedTenant.altPhone || 'None'}</span>
              </div>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">💰 Monthly Rent</span>
                <span className="mobile-detail-value" style={{ color: 'var(--mobile-primary)', fontWeight: '800' }}>
                  ₹{formatCurrency(selectedTenant.rent)}/mo
                </span>
              </div>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">🔐 Security Deposit</span>
                <span className="mobile-detail-value">₹{formatCurrency(selectedTenant.securityDeposit)}</span>
              </div>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">📅 Move-in Date</span>
                <span className="mobile-detail-value">{formatDateToDDMMYYYY(selectedTenant.moveInDate)}</span>
              </div>
            </div>

            {/* Document downloads */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--mobile-muted)', marginBottom: '8px' }}>
                📁 Verified Documents
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#fbfbf9',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--mobile-border)',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={14} style={{ color: 'var(--mobile-secondary)' }} />
                    Tenant Aadhar Card
                  </span>
                  
                  {selectedTenant.aadharFile ? (
                    <button 
                      onClick={() => setPreviewFile(selectedTenant.aadharFile)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--mobile-primary)', 
                        fontWeight: '800', 
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Preview
                    </button>
                  ) : (
                    <span style={{ color: 'var(--mobile-muted)', fontStyle: 'italic' }}>Not Provided</span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#fbfbf9',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--mobile-border)',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} style={{ color: 'var(--mobile-primary)' }} />
                    Signed Lease Agreement
                  </span>
                  
                  {selectedTenant.agreementFile ? (
                    <button 
                      onClick={() => setPreviewFile(selectedTenant.agreementFile)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--mobile-primary)', 
                        fontWeight: '800', 
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Preview
                    </button>
                  ) : (
                    <span style={{ color: 'var(--mobile-muted)', fontStyle: 'italic' }}>Not Provided</span>
                  )}
                </div>

              </div>
            </div>

            {/* AUTOMATIC SCHEDULED RENT INCREASE BOX */}
            <div style={{
              backgroundColor: selectedTenant.raiseApplied ? 'rgba(61, 106, 84, 0.05)' : 'rgba(204, 90, 55, 0.05)',
              border: `1px solid ${selectedTenant.raiseApplied ? 'var(--mobile-primary)' : 'var(--mobile-secondary)'}`,
              borderRadius: '14px',
              padding: '12px',
              fontSize: '0.78rem',
              marginTop: '12px'
            }}>
              <h4 style={{ 
                fontWeight: '800', 
                color: selectedTenant.raiseApplied ? 'var(--mobile-primary)' : 'var(--mobile-secondary)',
                marginBottom: '4px' 
              }}>
                {selectedTenant.raiseApplied ? '✅ Rent Raise Applied' : '📈 Scheduled Rent Increase (12 Months):'}
              </h4>
              
              {selectedTenant.raiseApplied ? (
                <div>Rent raised by {selectedTenant.scheduledRaisePercent}% on {formatDateToDDMMYYYY(selectedTenant.scheduledRaiseEffectiveDate)}.</div>
              ) : (
                <div>
                  Automatic {selectedTenant.scheduledRaisePercent}% Rent Increase on {formatDateToDDMMYYYY(selectedTenant.scheduledRaiseEffectiveDate)}.
                  <br />Rent will raise to <strong>₹{formatCurrency(getRaisePreview(selectedTenant.rent, selectedTenant.scheduledRaisePercent).newRent)}</strong>.
                </div>
              )}

              <button 
                className="mobile-btn" 
                onClick={(e) => handleOpenRaiseUpdate(selectedTenant, e)}
                style={{ width: '100%', height: '30px', fontSize: '0.75rem', marginTop: '8px' }}
              >
                <ArrowUpRight size={12} /> Reschedule Rent Raise
              </button>
            </div>

            {/* notes */}
            {selectedTenant.description && (
              <div style={{
                backgroundColor: '#fbfbf7',
                borderLeft: '3px solid var(--mobile-warning)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontStyle: 'italic'
              }}>
                {selectedTenant.description}
              </div>
            )}

            {/* vacate button */}
            <button 
              className="mobile-btn mobile-btn-danger" 
              onClick={(e) => handleRemove(selectedTenant, e)}
              style={{ 
                width: '100%',
                padding: '14px 20px',
                fontSize: '1rem',
                fontWeight: '800',
                minHeight: '52px',
                letterSpacing: '0.2px'
              }}
            >
              🚪 Vacate Property (End Tenancy)
            </button>

          </div>
        </div>
      )}

      {/* SCHEDULE RENT RAISE SHEET DRAWER */}
      {isRaiseSheetOpen && (
        <div className="mobile-sheet-overlay" style={{ zIndex: 1250 }} onClick={() => setIsRaiseSheetOpen(false)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">📈 Schedule Rent Increase</h3>
              <button className="mobile-sheet-close" onClick={() => setIsRaiseSheetOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--mobile-muted)' }}>
                Scheduling automatic Rent Increase for <strong>{targetTenant?.name}</strong>.
              </div>

              {/* quick chips */}
              <div className="mobile-form-group">
                <label className="mobile-form-label">Rent Raise Percentage (%)</label>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  {['5', '10', '15'].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      className={`mobile-pill-btn ${raisePercent === pct ? 'active' : ''}`}
                      onClick={() => setRaisePercent(pct)}
                      style={{ flex: 1, height: '36px', padding: 0 }}
                    >
                      {pct}% Raise
                    </button>
                  ))}
                </div>

                <input 
                  type="number" 
                  className="mobile-form-input" 
                  value={raisePercent}
                  onChange={(e) => setRaisePercent(e.target.value)}
                  placeholder="Custom percent"
                  required
                />
              </div>

              <div className="mobile-form-group">
                <label className="mobile-form-label">Effective Date</label>
                <input 
                  type="date" 
                  className="mobile-form-input" 
                  value={raiseEffectiveDate}
                  onChange={(e) => setRaiseEffectiveDate(e.target.value)}
                  required
                />
              </div>

              {targetTenant && raisePercent && (
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  color: 'var(--mobile-primary)',
                  backgroundColor: 'rgba(61, 106, 84, 0.04)',
                  padding: '8px',
                  borderRadius: '8px'
                }}>
                  Future Proj: rent raises to ₹{formatCurrency(getRaisePreview(targetTenant.rent, raisePercent).newRent)}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="mobile-btn" style={{ flex: 1 }} onClick={() => setIsRaiseSheetOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="mobile-btn mobile-btn-primary" style={{ flex: 1 }}>
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT NEW TENANT AGREEMENT PORTAL DRAWER */}
      {(activeSheet === 'add-tenant' || activeSheet === 'edit-tenant') && (
        <div className="mobile-sheet-overlay" onClick={closeSheet}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">
                {activeSheet === 'edit-tenant' ? '👥 Edit Tenant Agreement' : '👥 Add Tenant Agreement'}
              </h3>
              <button className="mobile-sheet-close" onClick={closeSheet}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div className="mobile-form-group">
                <label className="mobile-form-label">🏠 Select Rental Property</label>
                <select 
                  className="mobile-form-input" 
                  value={propertyId} 
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                  disabled={activeSheet === 'edit-tenant'}
                  style={{ opacity: activeSheet === 'edit-tenant' ? 0.7 : 1 }}
                >
                  {activeSheet === 'edit-tenant' && editingTenant ? (
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

              <div className="mobile-form-group">
                <label className="mobile-form-label">👥 Tenant Full Name</label>
                <input 
                  type="text" 
                  className="mobile-form-input" 
                  placeholder="Enter tenant name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                />
              </div>

              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="mobile-form-label">📞 Phone Number</label>
                  <input 
                    type="tel" 
                    className="mobile-form-input" 
                    placeholder="Mobile number" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    required
                  />
                </div>

                <div className="mobile-form-group">
                  <label className="mobile-form-label">📱 Backup Phone</label>
                  <input 
                    type="tel" 
                    className="mobile-form-input" 
                    placeholder="Alternative" 
                    value={altPhone} 
                    onChange={(e) => setAltPhone(e.target.value)} 
                  />
                </div>
              </div>

              <div className="mobile-form-group">
                <label className="mobile-form-label">📸 Tenant Photo (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange}
                  style={{ fontSize: '0.74rem' }}
                />
              </div>

              {/* upload verified documents */}
              <div style={{ borderTop: '1px solid var(--mobile-border)', paddingTop: '10px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--mobile-text)', marginBottom: '8px' }}>
                  📁 Attach Documents
                </h4>
                
                <div className="mobile-form-group">
                  <label className="mobile-form-label" style={{ fontSize: '0.72rem' }}>🪪 Landlord Aadhar Card (Photo/PDF)</label>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={handleAadharFileChange}
                    style={{ fontSize: '0.72rem' }}
                  />
                </div>

                <div className="mobile-form-group" style={{ marginTop: '10px' }}>
                  <label className="mobile-form-label" style={{ fontSize: '0.72rem' }}>📄 Signed Agreement File (PDF/Image)</label>
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.doc,image/*" 
                    onChange={handleAgreementFileChange}
                    style={{ fontSize: '0.72rem' }}
                  />
                </div>
              </div>

              {/* financial details */}
              <div style={{ borderTop: '1px solid var(--mobile-border)', paddingTop: '10px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--mobile-text)', marginBottom: '8px' }}>
                  💰 Rent Dues
                </h4>

                <div className="mobile-form-row">
                  <div className="mobile-form-group">
                    <label className="mobile-form-label">Monthly Rent Amount (₹)</label>
                    <input 
                      type="number" 
                      className="mobile-form-input" 
                      value={rent} 
                      onChange={(e) => setRent(e.target.value)} 
                      min="1" 
                      required
                    />
                  </div>

                  <div className="mobile-form-group">
                    <label className="mobile-form-label">Security Deposit (₹)</label>
                    <input 
                      type="number" 
                      className="mobile-form-input" 
                      value={securityDeposit} 
                      onChange={(e) => setSecurityDeposit(e.target.value)} 
                      min="0" 
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mobile-form-group">
                <label className="mobile-form-label">📅 Move-in Date</label>
                <input 
                  type="date" 
                  className="mobile-form-input" 
                  value={moveInDate} 
                  onChange={(e) => setMoveInDate(e.target.value)} 
                  required
                />
              </div>

              <div className="mobile-form-group">
                <label className="mobile-form-label">📝 Special Terms / Notes</label>
                <textarea 
                  className="mobile-form-input" 
                  placeholder="Enter custom agreement notes..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={2}
                />
              </div>

              {/* automatic rent raise percentage */}
              <div className="mobile-form-group">
                <label className="mobile-form-label">📈 Rent Raise Percentage (%)</label>
                <input 
                  type="number" 
                  className="mobile-form-input" 
                  value={scheduledRaisePercent} 
                  onChange={(e) => setScheduledRaisePercent(e.target.value)} 
                  min="0"
                  max="100"
                  required
                />
                {rent && scheduledRaisePercent && (
                  <div style={{ 
                    marginTop: '6px', 
                    fontSize: '0.72rem', 
                    fontWeight: '700', 
                    color: 'var(--mobile-muted)' 
                  }}>
                    Future Rent: ₹{formatCurrency(Math.round(Number(rent) + (Number(rent) * Number(scheduledRaisePercent)) / 100))} (after 12 months)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="mobile-btn" style={{ flex: 1 }} onClick={closeSheet}>
                  Cancel
                </button>
                <button type="submit" className="mobile-btn mobile-btn-primary" style={{ flex: 1 }}>
                  {activeSheet === 'edit-tenant' ? 'Save Changes' : 'Confirm Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATEFUL VACATE DRAWER FOR MOBILE */}
      {tenantToVacate && (
        <div className="mobile-sheet-overlay" style={{ zIndex: 1250 }} onClick={() => setTenantToVacate(null)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header" style={{ borderBottom: '1px solid var(--mobile-border)', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 className="mobile-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '1.15rem' }}>
                🚪 Vacate Property Checklist
              </h3>
              <button className="mobile-sheet-close" onClick={() => setTenantToVacate(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: '800' }}>
                Ending Tenancy for <span style={{ color: 'var(--mobile-secondary)' }}>{tenantToVacate.name}</span>
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--mobile-muted)', marginTop: '2px' }}>
                Property: <strong>{getPropertyName(tenantToVacate.propertyId)}</strong>
              </p>
            </div>

            {/* DUES AUDIT CHECKER */}
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ fontSize: '0.74rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--mobile-muted)', letterSpacing: '0.5px', marginBottom: '6px' }}>
                💸 Rent Dues Ledger Audit
              </h5>
              
              {(() => {
                const outstanding = getOutstandingDues(tenantToVacate);
                if (outstanding.length === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'rgba(61, 106, 84, 0.05)', border: '1px solid var(--mobile-primary)', borderRadius: '10px', color: 'var(--mobile-primary)', fontSize: '0.76rem', fontWeight: '600' }}>
                      <CheckCircle size={15} />
                      All monthly payments are fully cleared in the ledger!
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px dashed #ef4444', borderRadius: '10px', color: '#ef4444', fontSize: '0.74rem', fontWeight: '700' }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      Warning: Tenant has {outstanding.length} month(s) with pending rent dues!
                    </div>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid var(--mobile-border)', borderRadius: '10px', backgroundColor: '#faf9f6', padding: '4px' }}>
                      {outstanding.map((d, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderBottom: idx === outstanding.length - 1 ? 'none' : '1px solid var(--mobile-border)', fontSize: '0.72rem' }}>
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

            {/* SECURITY DEPOSIT SETTLEMENT */}
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#faf9f6', border: '1px solid var(--mobile-border)', borderRadius: '12px' }}>
              <h5 style={{ fontSize: '0.74rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--mobile-muted)', letterSpacing: '0.5px', marginBottom: '8px' }}>
                🔐 Security Deposit Settlement
              </h5>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--mobile-muted)', fontWeight: '600' }}>Deposit Received</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--mobile-secondary)', marginTop: '2px' }}>₹{formatCurrency(tenantToVacate.securityDeposit)}</div>
                </div>
                <div>
                  <label className="mobile-form-label" style={{ fontSize: '0.65rem', marginBottom: '2px' }}>Deductions (₹)</label>
                  <input 
                    type="number" 
                    className="mobile-form-input" 
                    value={vacateDeductions}
                    onChange={(e) => setVacateDeductions(Math.max(0, Number(e.target.value)))}
                    style={{ height: '32px', fontSize: '0.8rem', padding: '4px 8px' }}
                    min="0"
                  />
                </div>
              </div>

              <div className="mobile-form-group" style={{ marginBottom: '10px' }}>
                <label className="mobile-form-label" style={{ fontSize: '0.65rem', marginBottom: '2px' }}>Deduction Reason / Notes</label>
                <input 
                  type="text" 
                  className="mobile-form-input" 
                  value={vacateDeductionReason}
                  onChange={(e) => setVacateDeductionReason(e.target.value)}
                  placeholder="e.g. damages, cleaning charges..."
                  style={{ height: '32px', fontSize: '0.78rem', padding: '4px 8px' }}
                />
              </div>

              <div style={{ borderTop: '1px dashed var(--mobile-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '0.78rem' }}>Net Refund to Tenant:</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--mobile-primary)' }}>
                   ₹{formatCurrency(Math.max(0, Number(tenantToVacate.securityDeposit) - Number(vacateDeductions)))}
                </div>
              </div>
            </div>

            {/* PHYSICAL CHECKOUT CHECKLIST */}
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ fontSize: '0.74rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--mobile-muted)', letterSpacing: '0.5px', marginBottom: '8px' }}>
                📝 Physical Move-Out Checklist
              </h5>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <input 
                    type="checkbox" 
                    checked={keysReturned} 
                    onChange={(e) => setKeysReturned(e.target.checked)}
                    style={{ width: '15px', height: '15px' }}
                  />
                  🗝️ All sets of keys collected
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <input 
                    type="checkbox" 
                    checked={utilitiesCleared} 
                    onChange={(e) => setUtilitiesCleared(e.target.checked)}
                    style={{ width: '15px', height: '15px' }}
                  />
                  ⚡ Electricity & utility bills cleared
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <input 
                    type="checkbox" 
                    checked={damageInspected} 
                    onChange={(e) => setDamageInspected(e.target.checked)}
                    style={{ width: '15px', height: '15px' }}
                  />
                  🛠️ Property checked for damages
                </label>
              </div>
            </div>

            {/* WARNING ALERT */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: '#ef4444', fontSize: '0.72rem', lineHeight: '1.3', marginBottom: '16px' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                 Vacating ends this tenant cycle permanently and archives checkout settlement records. This action is irreversible.
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="mobile-btn" 
                onClick={() => setTenantToVacate(null)}
                style={{ flex: 1 }}
              >
                Keep Active
              </button>
              <button 
                type="button" 
                className="mobile-btn mobile-btn-danger" 
                onClick={() => {
                  const refund = Math.max(0, Number(tenantToVacate.securityDeposit) - Number(vacateDeductions));
                  removeTenant(tenantToVacate.id, tenantToVacate.propertyId, vacateDeductions, refund, vacateDeductionReason);
                  setTenantToVacate(null);
                  setSelectedTenant(null); // also close details sheet if open
                }}
                style={{ flex: 1, fontWeight: '800' }}
              >
                🚪 Confirm & Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="mobile-sheet-overlay" style={{ zIndex: 1300 }} onClick={() => setPreviewFile(null)}>
          <div className="mobile-sheet-content" style={{ maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title" style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>📄 Preview: {previewFile.name}</h3>
              <button className="mobile-sheet-close" onClick={() => setPreviewFile(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ 
              backgroundColor: '#fbfbf9', 
              padding: '8px', 
              borderRadius: '12px',
              border: '1px solid var(--mobile-border)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px',
              marginTop: '10px'
            }}>
              {previewFile.type && previewFile.type.startsWith('image') ? (
                <img 
                  src={previewFile.data} 
                  alt="Document Preview" 
                  style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} 
                />
              ) : previewFile.type && previewFile.type.includes('pdf') ? (
                <PdfInlinePreview pdfData={previewFile.data} />
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--mobile-muted)' }}>
                  <FileText size={40} style={{ color: 'var(--mobile-primary)', marginBottom: '8px', display: 'inline-block' }} />
                  <p style={{ fontWeight: '700', fontSize: '0.8rem' }}>Preview not available for this file type.</p>
                  <p style={{ fontSize: '0.72rem', marginTop: '4px' }}>File format: {previewFile.type || 'Unknown'}</p>
                </div>
              )}
            </div>
            
            <button 
              className="mobile-btn mobile-btn-primary" 
              onClick={() => setPreviewFile(null)}
              style={{ width: '100%', marginTop: '14px' }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

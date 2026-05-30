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
  Info
} from 'lucide-react';
import PdfInlinePreview from '../PdfInlinePreview';

export default function MobileTenantManager({
  tenants,
  properties,
  addTenant,
  removeTenant,
  scheduleRentRaise,
  openSheet,
  activeSheet,
  closeSheet,
  isPortal = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected tenant details drawer
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Rent Raise Update drawer state
  const [isRaiseSheetOpen, setIsRaiseSheetOpen] = useState(false);
  const [targetTenant, setTargetTenant] = useState(null);
  const [raisePercent, setRaisePercent] = useState('10');
  const [raiseEffectiveDate, setRaiseEffectiveDate] = useState('');

  // Add Tenant Form States
  const [propertyId, setPropertyId] = useState(() => {
    const vacant = properties.filter(p => !tenants.some(t => t.propertyId === p.id));
    return vacant.length > 0 ? vacant[0].id : '';
  });
  
  useEffect(() => {
    if (properties.length > 0 && !propertyId) {
      const vacant = properties.filter(p => !tenants.some(t => t.propertyId === p.id));
      if (vacant.length > 0) {
        setPropertyId(vacant[0].id);
      }
    }
  }, [properties, propertyId, tenants]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('10000');
  const [rent, setRent] = useState('8000');
  const [moveInDate, setMoveInDate] = useState('');
  const [description, setDescription] = useState('');
  
  // Documents attachments
  const [agreementFile, setAgreementFile] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [scheduledRaisePercent, setScheduledRaisePercent] = useState('10');

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
    setScheduledRaisePercent('10');
    
    const todayStr = new Date().toISOString().split('T')[0];
    setMoveInDate(todayStr);

    openSheet('add-tenant');
  };

  const handleOpenRaiseUpdate = (tenant, e) => {
    e.stopPropagation(); // Stop opening main details sheet
    setTargetTenant(tenant);
    setRaisePercent(tenant.scheduledRaisePercent?.toString() || '10');
    
    const elevenMonthsLater = new Date();
    elevenMonthsLater.setMonth(elevenMonthsLater.getMonth() + 11);
    const elevenMonthsLaterStr = elevenMonthsLater.toISOString().split('T')[0];
    setRaiseEffectiveDate(tenant.scheduledRaiseEffectiveDate || elevenMonthsLaterStr);
    
    setIsRaiseSheetOpen(true);
  };

  const handleAadharFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15.0 * 1024 * 1024) {
      alert('⚠️ Document too large: Please upload documents smaller than 15.0MB.');
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

  const handleAgreementFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15.0 * 1024 * 1024) {
      alert('⚠️ Document too large: Please upload agreements smaller than 15.0MB.');
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15.0 * 1024 * 1024) {
      alert('⚠️ Photo too large: Please upload photos smaller than 15.0MB.');
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
    date.setMonth(date.getMonth() + 11);
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
      raiseApplied: false,
      rentHistory: [
        { date: moveInDate, amount: Number(rent), reason: 'Starting Rent' }
      ]
    };

    addTenant(tenantData);
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
    const propName = getPropertyName(tenant.propertyId);
    const doubleCheck = window.confirm(
      `⚠️ End Tenancy: Vacate tenant "${tenant.name}" from "${propName}"?\n\nRemember to return their security deposit (₹${tenant.securityDeposit}).`
    );
    if (doubleCheck) {
      removeTenant(tenant.id, tenant.propertyId);
      setSelectedTenant(null);
    }
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
              Agreements Dossiers
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
              <h4 style={{ fontWeight: '800', fontSize: '1rem' }}>No Active Agreements</h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--mobile-muted)', marginTop: '4px' }}>
                Tap the Floating action button (+) or click below to register a new tenant dossier:
              </p>
              <button 
                className="mobile-btn mobile-btn-primary" 
                onClick={handleOpenAdd}
                style={{ marginTop: '16px', width: '100%' }}
              >
                Create Tenant Agreement
              </button>
            </div>
          ) : (
            <div className="mobile-feed-container">
              {filteredTenants.map(t => {
                const preview = getRaisePreview(t.rent, t.scheduledRaisePercent || 10);
                return (
                  <div 
                    key={t.id} 
                    className="mobile-card"
                    onClick={() => setSelectedTenant(t)}
                    style={{ borderLeft: '4px solid var(--mobile-secondary)', cursor: 'pointer' }}
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
                        ₹{t.rent}/mo
                      </span>
                    </div>

                    <div className="mobile-detail-row">
                      <span className="mobile-detail-label">Security Deposit</span>
                      <span className="mobile-detail-value">₹{t.securityDeposit}</span>
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
              <h3 className="mobile-sheet-title">👥 Agreement Dossier Sheet</h3>
              <button className="mobile-sheet-close" onClick={() => setSelectedTenant(null)}>
                <X size={18} />
              </button>
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
                  ₹{selectedTenant.rent}/mo
                </span>
              </div>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">🔐 Security Deposit</span>
                <span className="mobile-detail-value">₹{selectedTenant.securityDeposit}</span>
              </div>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">📅 Move-in Date</span>
                <span className="mobile-detail-value">{selectedTenant.moveInDate}</span>
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
                {selectedTenant.raiseApplied ? '✅ Rent Raise Applied' : '📈 Scheduled Rent Increase (11 Months):'}
              </h4>
              
              {selectedTenant.raiseApplied ? (
                <div>Rent raised by {selectedTenant.scheduledRaisePercent}% on {selectedTenant.scheduledRaiseEffectiveDate}.</div>
              ) : (
                <div>
                  Automatic {selectedTenant.scheduledRaisePercent}% Rent Increase on {selectedTenant.scheduledRaiseEffectiveDate}.
                  <br />Rent will raise to <strong>₹{getRaisePreview(selectedTenant.rent, selectedTenant.scheduledRaisePercent).newRent}</strong>.
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
                  Future Proj: rent raises to ₹{getRaisePreview(targetTenant.rent, raisePercent).newRent}
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

      {/* ADD NEW TENANT AGREEMENT PORTAL DRAWER */}
      {activeSheet === 'add-tenant' && (
        <div className="mobile-sheet-overlay" onClick={closeSheet}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">👥 Add Tenant Agreement</h3>
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
                >
                  {vacantProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.address})</option>
                  ))}
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
                    Future Rent: ₹{Math.round(Number(rent) + (Number(rent) * Number(scheduledRaisePercent)) / 100)} (after 11 months)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="mobile-btn" style={{ flex: 1 }} onClick={closeSheet}>
                  Cancel
                </button>
                <button type="submit" className="mobile-btn mobile-btn-primary" style={{ flex: 1 }}>
                  Confirm Agreement
                </button>
              </div>
            </form>
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

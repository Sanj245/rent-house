import React, { useState } from 'react';
import { Users, Plus, Phone, Calendar, FileText, Upload, Edit3, X, ArrowUpRight, CreditCard, Shield, Image as ImageIcon } from 'lucide-react';
import PdfInlinePreview from './PdfInlinePreview';

export default function TenantManager({ 
  tenants, 
  properties, 
  addTenant, 
  removeTenant, 
  updateTenantRent 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Rent Update Modal State
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newRaisePercent, setNewRaisePercent] = useState('10');
  const [effectiveDate, setEffectiveDate] = useState('');

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
  const [scheduledRaisePercent, setScheduledRaisePercent] = useState('10');
  const [scheduledRaiseEffectiveDate, setScheduledRaiseEffectiveDate] = useState('');


  // Get vacant properties dynamically using active tenants check
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

    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setMoveInDate(todayStr);

    // Default raise effective date to exactly 11 months from today
    const elevenMonthsLater = new Date();
    elevenMonthsLater.setMonth(elevenMonthsLater.getMonth() + 11);
    const elevenMonthsLaterStr = elevenMonthsLater.toISOString().split('T')[0];
    setScheduledRaiseEffectiveDate(elevenMonthsLaterStr);

    setIsModalOpen(true);
  };

  const handleOpenRentUpdate = (tenant) => {
    setSelectedTenant(tenant);
    setNewRaisePercent('10');
    
    // Default reschedule raise effective date to 11 months from now
    const elevenMonthsLater = new Date();
    elevenMonthsLater.setMonth(elevenMonthsLater.getMonth() + 11);
    const elevenMonthsLaterStr = elevenMonthsLater.toISOString().split('T')[0];
    setEffectiveDate(elevenMonthsLaterStr);
    
    setIsRentModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15.0 * 1024 * 1024) {
      alert('⚠️ Document file size is too large:\n\nTo preserve local storage space, please upload signed agreements smaller than 15.0 Megabytes. For larger documents, we will record the file name, but recommend keeping the PDF on your computer!');
      setAgreementFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: '' 
      });
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

    if (file.size > 15.0 * 1024 * 1024) {
      alert('⚠️ Aadhar file size is too large:\n\nTo preserve local storage space, please upload documents smaller than 15.0 Megabytes. For larger files, we will save the file name, but recommend reducing the size for complete local backup.');
      setAadharFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: '' 
      });
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

    if (file.size > 15.0 * 1024 * 1024) {
      alert('⚠️ Photo file size is too large:\n\nTo preserve local storage space, please upload photos smaller than 15.0 Megabytes.');
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
    const propName = getPropertyName(tenant.propertyId);
    const doubleCheck = window.confirm(
      `⚠️ End Tenancy: Vacate tenant "${tenant.name}" from "${propName}"?\n\nRemember to return their security deposit (₹${tenant.securityDeposit}).`
    );
    if (doubleCheck) {
      removeTenant(tenant.id, tenant.propertyId);
    }
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
          <h2 className="section-title">Tenants Agreements Registry</h2>
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
              <div key={tenant.id} className="item-card" style={{ borderLeft: '4px solid var(--color-secondary)' }}>
                {/* Visual Notebook Dossier Tab */}
                <div className="card-folder-tab tab-dossier">
                  👥 Dossier
                </div>

                <div>
                  <div className="item-card-header" style={{ marginTop: '4px', alignItems: 'center', gap: '12px' }}>
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
                        ₹{tenant.rent}/mo
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">🔐 Security Deposit</span>
                      <span className="value" style={{ color: 'var(--color-purple)', fontWeight: '700' }}>
                        ₹{tenant.securityDeposit}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">📅 Move-in Date</span>
                      <span className="value" style={{ fontWeight: '700' }}>{tenant.moveInDate}</span>
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
                      {tenant.raiseApplied ? '✅ Rent Raise Applied' : '📈 Scheduled Rent Increase (11 Months):'}
                    </h4>
                    
                    {tenant.raiseApplied ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        Rent raised by <strong>{tenant.scheduledRaisePercent}%</strong> on <strong>{tenant.scheduledRaiseEffectiveDate}</strong>.
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                        Automatic <strong>{tenant.scheduledRaisePercent}%</strong> Rent Increase set for <strong>{tenant.scheduledRaiseEffectiveDate}</strong>.
                        <br />
                        Rent will raise to <strong>₹{getRaisePreview(tenant.rent, tenant.scheduledRaisePercent).newRent}</strong>.
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
              <h3 className="modal-title">Register Tenant & Agreement</h3>
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
                >
                  {vacantProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.address})</option>
                  ))}
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
                <label className="form-label">📝 Agreement Description / Notes</label>
                <textarea 
                  className="form-input" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Enter a description, special terms, or any notes you want to save for this agreement..."
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
                  📈 Schedule Automatic Rent Increase (11 Months)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  The monthly rent will automatically increase by the following percentage exactly **11 months** from move-in:
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
                      ₹{getRaisePreview(rent, scheduledRaisePercent).newRent}
                    </span>{' '}
                    (Increase of +₹{getRaisePreview(rent, scheduledRaisePercent).raise} after 11 months)
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
                  Register Agreement
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
                  ₹{selectedTenant.rent} / month
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
                    ₹{getRaisePreview(selectedTenant.rent, newRaisePercent).newRent}
                  </span>{' '}
                  (+₹{getRaisePreview(selectedTenant.rent, newRaisePercent).raise})
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

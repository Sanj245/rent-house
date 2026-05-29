import React, { useState } from 'react';
import { Users, Plus, Phone, Calendar, FileText, Upload, Edit3, X, ArrowUpRight } from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rent, setRent] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [agreementFile, setAgreementFile] = useState(null);

  // Scheduled Raise Form States
  const [scheduledRaisePercent, setScheduledRaisePercent] = useState('10');
  const [scheduledRaiseEffectiveDate, setScheduledRaiseEffectiveDate] = useState('');

  // Get vacant properties
  const vacantProperties = properties.filter(p => p.status === 'Vacant');

  const handleOpenAdd = () => {
    if (vacantProperties.length === 0) {
      alert('⚠️ No Vacant Properties: Please register a vacant property first before adding a tenant agreement.');
      return;
    }
    setPropertyId(vacantProperties[0].id);
    setName('');
    setPhone('');
    setEmail('');
    setEmergencyContact('');
    setSecurityDeposit('10000');
    setRent('8000');
    setAgreementFile(null);
    setScheduledRaisePercent('10');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setMoveInDate(todayStr);

    // Default raise effective date to exactly 1 year from today
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const oneYearLaterStr = oneYearLater.toISOString().split('T')[0];
    setScheduledRaiseEffectiveDate(oneYearLaterStr);

    setIsModalOpen(true);
  };

  const handleOpenRentUpdate = (tenant) => {
    setSelectedTenant(tenant);
    setNewRaisePercent('10');
    
    // Default reschedule raise effective date to 1 year from now
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const oneYearLaterStr = oneYearLater.toISOString().split('T')[0];
    setEffectiveDate(oneYearLaterStr);
    
    setIsRentModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert('⚠️ Document file size is too large:\n\nTo preserve local storage space, please upload signed agreements smaller than 1.5 Megabytes. For larger documents, we will record the file name, but recommend keeping the PDF on your computer!');
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
      email: email.trim() || 'No Email',
      emergencyContact: emergencyContact.trim() || 'None',
      securityDeposit: Number(securityDeposit),
      rent: Number(rent),
      moveInDate,
      agreementFile,
      scheduledRaisePercent: Number(scheduledRaisePercent),
      scheduledRaiseEffectiveDate,
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
                  <div className="item-card-header" style={{ marginTop: '4px' }}>
                    <div className="item-card-title">{tenant.name}</div>
                    <span className="status-badge occupied">
                      Active
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-secondary)', marginTop: '2px', marginBottom: '14px' }}>
                    🏠 {getPropertyName(tenant.propertyId)}
                  </div>

                  <div className="item-details-list">
                    <div className="detail-row">
                      <span className="label">Phone</span>
                      <span className="value">{tenant.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Email</span>
                      <span className="value" style={{ fontSize: '0.85rem' }}>{tenant.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Emergency Contact</span>
                      <span className="value" style={{ fontSize: '0.85rem' }}>{tenant.emergencyContact}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Current Rent</span>
                      <span className="value" style={{ color: 'var(--color-primary)', fontSize: '1.1rem', fontWeight: '700' }}>
                        ₹{tenant.rent}/mo
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Security Deposit</span>
                      <span className="value" style={{ color: 'var(--color-purple)' }}>
                        ₹{tenant.securityDeposit}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Move-in Date</span>
                      <span className="value">{tenant.moveInDate}</span>
                    </div>

                    {/* Signed Agreement Document display */}
                    {tenant.agreementFile && (
                      <div className="detail-row" style={{ borderBottom: 'none', marginTop: '6px', alignItems: 'center' }}>
                        <span className="label">📄 Agreement File</span>
                        <span className="value">
                          {tenant.agreementFile.data ? (
                            <a 
                              href={tenant.agreementFile.data} 
                              download={tenant.agreementFile.name}
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                color: 'var(--color-secondary)', 
                                fontWeight: '700', 
                                textDecoration: 'underline' 
                              }}
                            >
                              <FileText size={14} /> Download File
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              📁 {tenant.agreementFile.name} (Large)
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Active Official Wax Seal */}
                    <div className="wax-seal-container" style={{ justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ✍️ Registry status:
                        <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>Verified Offline</div>
                      </div>
                      <div className="wax-seal-badge" title="Verified Agreement Seal" />
                    </div>
                  </div>

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
                      {tenant.raiseApplied ? '✅ Rent Raise Applied' : '📈 Scheduled Rent Increase:'}
                    </h4>
                    
                    {tenant.raiseApplied ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        Rent raised by <strong>{tenant.scheduledRaisePercent}%</strong> on <strong>{tenant.scheduledRaiseEffectiveDate}</strong>.
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                        Automatic <strong>{tenant.scheduledRaisePercent}%</strong> increase set for <strong>{tenant.scheduledRaiseEffectiveDate}</strong>.
                        <br />
                        Rent will raise to <strong>₹{preview.newRent}</strong> (+₹{preview.raise}).
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
                </div>

                <div className="item-card-actions" style={{ marginTop: '14px' }}>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleRemove(tenant)}
                    style={{ width: '100%' }}
                  >
                    Vacate Property (End Tenancy)
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
              <h3 className="modal-title">Register Tenant Details</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Rental Property</label>
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

              <div className="form-group">
                <label className="form-label">Tenant Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Enter tenant name" 
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Enter phone number" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="tenant@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Emergency / Secondary Contact (e.g. Local Guardian)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={emergencyContact} 
                  onChange={(e) => setEmergencyContact(e.target.value)} 
                  placeholder="Name, Relationship & Phone number"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Monthly Rent Amount (₹)</label>
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
                  <label className="form-label">Security Deposit Paid (₹)</label>
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

              <div className="form-group">
                <label className="form-label">Move-in Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={moveInDate} 
                  onChange={(e) => setMoveInDate(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">📂 Upload Signed Agreement (PDF or Word DOCX)</label>
                <input 
                  type="file" 
                  accept=".pdf,.docx,.doc" 
                  className="form-input"
                  onChange={handleFileChange}
                  style={{ cursor: 'pointer', padding: '8px' }}
                />
                {agreementFile && (
                  <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                    📎 Ready to attach: {agreementFile.name} ({(agreementFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* AUTOMATIC SCHEDULED RENT INCREASE IN REGISTRATION */}
              <div style={{ 
                backgroundColor: 'var(--color-secondary-light)', 
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginTop: '16px',
                marginBottom: '16px' 
              }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--color-secondary)', fontWeight: '700', marginBottom: '6px' }}>
                  📈 Schedule Automatic Rent Increase
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Set a percentage raise that will automatically apply to the ledger on its effective date:
                </p>

                <div className="form-row-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Raise Percentage (%)</label>
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

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Effective Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={scheduledRaiseEffectiveDate} 
                      onChange={(e) => setScheduledRaiseEffectiveDate(e.target.value)} 
                      required
                    />
                  </div>
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
                    (Increase of +₹{getRaisePreview(rent, scheduledRaisePercent).raise})
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
                  Add Tenant
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
    </div>
  );
}

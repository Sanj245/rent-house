import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Plus, 
  Trash2, 
  X, 
  Camera, 
  Eye, 
  User, 
  FileText,
  Search,
  DollarSign
} from 'lucide-react';

export default function MobilePropertyManager({
  properties,
  tenants,
  addProperty,
  editProperty,
  deleteProperty,
  openSheet,
  activeSheet,
  closeSheet,
  isPortal = false,
  editingProp,
  setEditingProp
}) {
  
  // Tab/Search filters
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Card Detail sheet drawer
  const [selectedProp, setSelectedProp] = useState(null);

  // Form States
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState('2');
  const [isCashOnly, setIsCashOnly] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [images, setImages] = useState([]); // Array of { id, name, data }
  
  useEffect(() => {
    if (editingProp) {
      setName(editingProp.name || '');
      setAddress(editingProp.address || '');
      setRooms(editingProp.rooms !== undefined && editingProp.rooms !== null ? editingProp.rooms.toString() : '2');
      setImages(editingProp.images || []);
      setIsCashOnly(editingProp.isCashOnly !== undefined ? editingProp.isCashOnly : true);
      setAccountName(editingProp.accountName || '');
    } else {
      setName('');
      setAddress('');
      setRooms('2');
      setImages([]);
      setIsCashOnly(true);
      setAccountName('');
    }
  }, [editingProp]);
  
  // Appliance Image inputs
  const [applianceName, setApplianceName] = useState('');
  const [applianceFile, setApplianceFile] = useState(null);
  const [uploadingState, setUploadingState] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const handleOpenAdd = () => {
    setEditingProp(null);
    setName('');
    setAddress('');
    setRooms('2');
    setImages([]);
    setApplianceName('');
    setApplianceFile(null);
    setUploadingState(false);
    setIsCashOnly(true);
    setAccountName('');
    openSheet('add-property');
  };

  const handleOpenEdit = (prop, e) => {
    e.stopPropagation(); // Avoid opening details sheet
    setEditingProp(prop);
    setName(prop.name);
    setAddress(prop.address);
    setRooms(prop.rooms !== undefined && prop.rooms !== null ? prop.rooms.toString() : '2');
    setImages(prop.images || []);
    setApplianceName('');
    setApplianceFile(null);
    setUploadingState(false);
    setIsCashOnly(prop.isCashOnly !== undefined ? prop.isCashOnly : true);
    setAccountName(prop.accountName || '');
    openSheet('add-property');
  };

  const handleApplianceImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('⚠️ Image size too large:\n\nTo preserve local storage space, please upload appliance images smaller than 15.0 MB.');
      e.target.value = null; 
      return;
    }

    setApplianceFile(file);
  };

  const handleAttachApplianceImage = () => {
    if (!applianceName.trim()) {
      alert('Please enter an Appliance Name.');
      return;
    }
    if (!applianceFile) {
      alert('Please select an image file first.');
      return;
    }

    setUploadingState(true);
    const reader = new FileReader();
    reader.readAsDataURL(applianceFile);
    reader.onload = () => {
      const newImage = {
        id: `img-${Date.now()}`,
        name: applianceName.trim(),
        data: reader.result
      };

      setImages(prev => [...prev, newImage]);
      setApplianceName('');
      setApplianceFile(null);
      setUploadingState(false);
      
      const fileInput = document.getElementById('mobile-appliance-image-input');
      if (fileInput) fileInput.value = '';
    };
  };

  const handleRemoveImage = (imgId) => {
    setImages(prev => prev.filter(img => img.id !== imgId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !String(rooms).trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const hasTenant = tenants.some(t => t.propertyId === (editingProp ? editingProp.id : ''));
    const propStatus = hasTenant ? 'Occupied' : 'Vacant';

    const propData = {
      name: name.trim(),
      address: address.trim(),
      rooms: String(rooms).trim(),
      status: propStatus,
      images,
      isCashOnly,
      accountName: isCashOnly ? 'None' : (accountName.trim() || 'None')
    };

    if (editingProp) {
      editProperty(editingProp.id, propData);
    } else {
      addProperty(propData);
    }
    closeSheet();
  };

  const handleDelete = (id, propName, e) => {
    e.stopPropagation();
    const doubleCheck = window.confirm(
      `⚠️ Delete Property: Are you sure you want to remove "${propName}"?\n\nThis removes all linked agreement logs. This action cannot be undone.`
    );
    if (doubleCheck) {
      deleteProperty(id);
      setSelectedProp(null);
    }
  };

  // Filter calculations
  const filteredProps = properties.filter(prop => {
    // 1. Search Query
    const matchesSearch = prop.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prop.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Category Pill
    if (filter === 'Occupied') return matchesSearch && prop.status === 'Occupied';
    if (filter === 'Vacant') return matchesSearch && prop.status === 'Vacant';
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Root manager page (not loaded as sliding portal) */}
      {!isPortal && (
        <>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '2px' }}>
              Properties Registry
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--mobile-muted)' }}>
              Manage rental houses, attach appliance specs, and audit inventory checklists.
            </p>
          </div>

          {/* Search Wrapper */}
          <div className="mobile-search-wrapper">
            <Search size={18} className="mobile-search-icon" />
            <input 
              type="text" 
              className="mobile-search-input" 
              placeholder="Search by home or address..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Horizontal category pill selector */}
          <div className="mobile-pills-row">
            <button className={`mobile-pill-btn ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>
              All ({properties.length})
            </button>
            <button className={`mobile-pill-btn ${filter === 'Occupied' ? 'active' : ''}`} onClick={() => setFilter('Occupied')}>
              🟢 Occupied ({properties.filter(p => p.status === 'Occupied').length})
            </button>
            <button className={`mobile-pill-btn ${filter === 'Vacant' ? 'active' : ''}`} onClick={() => setFilter('Vacant')} style={{ fontWeight: '900' }}>
              ⚪ Vacant ({properties.filter(p => p.status === 'Vacant').length})
            </button>
          </div>

          {/* Card Grid Feed */}
          {filteredProps.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 16px', 
              backgroundColor: 'var(--mobile-card-bg)', 
              borderRadius: 'var(--mobile-radius)',
              border: '1px solid var(--mobile-border)'
            }}>
              <Home size={36} style={{ color: 'var(--mobile-muted)', marginBottom: '10px', display: 'inline-block' }} />
              <h4 style={{ fontWeight: '800', fontSize: '1rem' }}>No Houses Listed</h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--mobile-muted)', marginTop: '4px' }}>
                Tap the Floating action button (+) or click below to register your first home:
              </p>
              <button 
                className="mobile-btn mobile-btn-primary" 
                onClick={handleOpenAdd}
                style={{ marginTop: '16px', width: '100%' }}
              >
                Register a Property
              </button>
            </div>
          ) : (
            <div className="mobile-feed-container">
              {filteredProps.map(prop => {
                const tenant = tenants.find(t => t.propertyId === prop.id);
                return (
                  <div 
                    key={prop.id} 
                    className="mobile-card" 
                    onClick={() => setSelectedProp(prop)}
                    style={{ 
                      cursor: 'pointer',
                      borderLeft: `4px solid ${tenant ? 'var(--mobile-primary)' : 'var(--mobile-warning)'}` 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: '800' }}>{prop.name}</h4>
                        <p style={{ fontSize: '0.74rem', color: 'var(--mobile-muted)', marginTop: '2px' }}>📍 {prop.address}</p>
                      </div>
                      <span className={`mobile-badge ${tenant ? 'occupied' : 'vacant'}`}>
                        {tenant ? 'Occupied' : 'Vacant'}
                      </span>
                    </div>

                    <div className="mobile-detail-row">
                      <span className="mobile-detail-label">House Dimensions</span>
                      <span className="mobile-detail-value">{prop.rooms} BHK / Rooms</span>
                    </div>

                    <div className="mobile-detail-row">
                      <span className="mobile-detail-label">Rent Preference</span>
                      <span className="mobile-detail-value">
                        {prop.isCashOnly ? '💵 Cash Default' : '🏦 Account Transfer'}
                      </span>
                    </div>

                    {tenant && (
                      <div style={{
                        backgroundColor: 'rgba(61, 106, 84, 0.04)',
                        border: '1px solid rgba(61, 106, 84, 0.12)',
                        borderRadius: '12px',
                        padding: '10px',
                        fontSize: '0.74rem'
                      }}>
                        <div style={{ fontWeight: '800', color: 'var(--mobile-primary)', marginBottom: '4px' }}>👤 Current Resident:</div>
                        <div>Name: <strong>{tenant.name}</strong> • Rent: <strong>₹{tenant.rent}/mo</strong></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SELECTED PROPERTY VIEW DETAILS BOTTOM SHEET DRAWER */}
      {selectedProp && !isPortal && (
        <div className="mobile-sheet-overlay" onClick={() => setSelectedProp(null)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">🏠 House Dossier Details</h3>
              <button className="mobile-sheet-close" onClick={() => setSelectedProp(null)}>
                <X size={18} />
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '800' }}>{selectedProp.name}</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--mobile-muted)', marginTop: '2px' }}>📍 {selectedProp.address}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">Layout Configuration</span>
                <span className="mobile-detail-value">{selectedProp.rooms} BHK / Rooms</span>
              </div>
              
              <div className="mobile-detail-row">
                <span className="mobile-detail-label">Settlement Channel</span>
                <span className="mobile-detail-value">
                  {selectedProp.isCashOnly ? '💵 Cash Default' : `🏦 Account: ${selectedProp.accountName || 'None'}`}
                </span>
              </div>
            </div>

            {/* Occupant Card */}
            {tenants.find(t => t.propertyId === selectedProp.id) ? (() => {
              const resident = tenants.find(t => t.propertyId === selectedProp.id);
              return (
                <div style={{
                  backgroundColor: 'rgba(61, 106, 84, 0.06)',
                  border: '1px solid rgba(61, 106, 84, 0.15)',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <h4 style={{ fontWeight: '800', color: 'var(--mobile-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={14} /> Active Lease Details:
                  </h4>
                  <div>Tenant: <strong>{resident.name}</strong></div>
                  <div>Phone: <strong>{resident.phone}</strong></div>
                  <div>Current Rent: <strong>₹{resident.rent}/mo</strong></div>
                  
                  {resident.agreementFile && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(61, 106, 84, 0.2)' }}>
                      <a 
                        href={resident.agreementFile.data} 
                        download={resident.agreementFile.name}
                        style={{ color: 'var(--mobile-secondary)', fontWeight: '700', textDecoration: 'underline' }}
                      >
                        📄 Download Signed Lease Agreement
                      </a>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                backgroundColor: 'rgba(212, 163, 115, 0.05)',
                border: '1px solid rgba(212, 163, 115, 0.15)',
                borderRadius: '12px',
                fontSize: '0.75rem',
                color: 'var(--mobile-warning)'
              }}>
                ⚪ This property is vacant. Log a new Agreement tab to populate tenant records.
              </div>
            )}

            {/* Appliance Images Attachment in detail drawer */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={14} style={{ color: 'var(--mobile-secondary)' }} />
                Appliance / Asset Checklist:
              </h4>

              {(selectedProp.images || []).length === 0 ? (
                <p style={{ fontSize: '0.74rem', color: 'var(--mobile-muted)' }}>No appliance images uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(selectedProp.images || []).map(img => (
                    <div key={img.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#fbfbf9',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--mobile-border)',
                      fontSize: '0.78rem'
                    }}>
                      <span style={{ fontWeight: '600' }}>📷 {img.name}</span>
                      <button
                        onClick={() => setPreviewImage(img)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--mobile-secondary)',
                          cursor: 'pointer',
                          fontWeight: '800',
                          textDecoration: 'underline'
                        }}
                      >
                        View Photo
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Management Buttons */}
            <div className="mobile-card-actions">
              <button 
                className="mobile-btn" 
                onClick={(e) => { setSelectedProp(null); handleOpenEdit(selectedProp, e); }}
              >
                ✏️ Edit Details
              </button>
              <button 
                className="mobile-btn mobile-btn-danger" 
                onClick={(e) => handleDelete(selectedProp.id, selectedProp.name, e)}
              >
                🗑️ Delete Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT PROPERTY BOTTOM DRAWER WIZARD */}
      {activeSheet === 'add-property' && (
        <div className="mobile-sheet-overlay" onClick={closeSheet}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">
                {editingProp ? '✏️ Edit Home Details' : '🏠 Register a New Home'}
              </h3>
              <button className="mobile-sheet-close" onClick={closeSheet}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mobile-form-group">
                <label className="mobile-form-label">Property Name / Nickname</label>
                <input 
                  type="text" 
                  className="mobile-form-input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Flat 301, Emerald Heights" 
                  required
                />
              </div>

              <div className="mobile-form-group">
                <label className="mobile-form-label">Property Address</label>
                <input 
                  type="text" 
                  className="mobile-form-input" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="e.g. 3rd Block, Jayanagar, Bengaluru" 
                  required
                />
              </div>

              <div className="mobile-form-group">
                <label className="mobile-form-label">Rooms / layout Configuration</label>
                <input 
                  type="number" 
                  className="mobile-form-input" 
                  value={rooms} 
                  onChange={(e) => setRooms(e.target.value)} 
                  min="1"
                  placeholder="e.g. 2, 3" 
                  required
                />
              </div>

              {/* Payment configs */}
              <div style={{ borderTop: '1px solid var(--mobile-border)', paddingTop: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <DollarSign size={14} style={{ color: 'var(--mobile-secondary)' }} />
                  Rent Payment Channels
                </h4>

                <div className="mobile-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isCashOnly} 
                      onChange={(e) => {
                        setIsCashOnly(e.target.checked);
                        if (e.target.checked) setAccountName('');
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--mobile-secondary)' }}
                    />
                    <span>Will this tenant prefer cash payments?</span>
                  </label>
                </div>

                {!isCashOnly && (
                  <div className="mobile-form-group" style={{ marginTop: '10px' }}>
                    <label className="mobile-form-label">Default Receiver Bank Account Name</label>
                    <input 
                      type="text" 
                      className="mobile-form-input" 
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. SBI - Landlord Account"
                      required={!isCashOnly}
                    />
                  </div>
                )}
              </div>

              {/* Upload appliances base64 images */}
              <div style={{ borderTop: '1px solid var(--mobile-border)', paddingTop: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Camera size={14} style={{ color: 'var(--mobile-secondary)' }} />
                  Upload Appliance Photos
                </h4>

                <div style={{
                  backgroundColor: '#fbfbf9',
                  border: '1px solid var(--mobile-border)',
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="mobile-form-input" 
                      placeholder="Appliance name (e.g. AC)"
                      value={applianceName}
                      onChange={(e) => setApplianceName(e.target.value)}
                      style={{ flex: 1, height: '36px', fontSize: '0.8rem' }}
                    />
                    <input 
                      id="mobile-appliance-image-input"
                      type="file" 
                      accept="image/*"
                      onChange={handleApplianceImageChange}
                      style={{ flex: 1, fontSize: '0.72rem', border: 'none', background: 'none' }}
                    />
                  </div>
                  <button
                    type="button"
                    className="mobile-btn mobile-btn-primary"
                    onClick={handleAttachApplianceImage}
                    disabled={uploadingState}
                    style={{ height: '32px', alignSelf: 'flex-end', padding: '0 12px' }}
                  >
                    {uploadingState ? 'Uploading...' : '📷 Attach Image'}
                  </button>
                </div>

                {/* list attached assets */}
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {images.map(img => (
                    <div key={img.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f8f8f6',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--mobile-border)',
                      fontSize: '0.74rem'
                    }}>
                      <span>📷 {img.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={img.data} alt={img.name} style={{ width: '22px', height: '22px', objectFit: 'cover', borderRadius: '4px' }} />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveImage(img.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--mobile-danger)', fontWeight: '800' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit triggers */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="mobile-btn" style={{ flex: 1 }} onClick={closeSheet}>
                  Cancel
                </button>
                <button type="submit" className="mobile-btn mobile-btn-primary" style={{ flex: 1 }}>
                  Save Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSETS PREVIEW MODAL */}
      {previewImage && (
        <div className="mobile-sheet-overlay" style={{ zIndex: 1300 }} onClick={() => setPreviewImage(null)}>
          <div className="mobile-sheet-content" style={{ maxHeight: '70vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">📷 Photo: {previewImage.name}</h3>
              <button className="mobile-sheet-close" onClick={() => setPreviewImage(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#fcfbfa',
              borderRadius: '16px',
              padding: '10px',
              border: '1px solid var(--mobile-border)'
            }}>
              <img 
                src={previewImage.data} 
                alt={previewImage.name} 
                style={{ maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain', borderRadius: '12px' }}
              />
            </div>

            <button className="mobile-btn" onClick={() => setPreviewImage(null)} style={{ width: '100%' }}>
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

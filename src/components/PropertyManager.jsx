import React, { useState } from 'react';
import { Home, Plus, Edit3, Trash2, AlertTriangle, X, FileText, User, Camera, Eye } from 'lucide-react';

export default function PropertyManager({ 
  properties, 
  tenants,
  addProperty, 
  editProperty, 
  deleteProperty 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  
  // Form States
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState('');
  const [status, setStatus] = useState('Vacant');
  
  // Appliance Images List State
  const [images, setImages] = useState([]); // Array of { id, name, data }
  const [applianceName, setApplianceName] = useState('');
  const [applianceFile, setApplianceFile] = useState(null);
  const [uploadingState, setUploadingState] = useState(false);

  // Full Screen Lightbox Preview State
  const [previewImage, setPreviewImage] = useState(null);

  const handleOpenAdd = () => {
    setEditingProp(null);
    setName('');
    setAddress('');
    setRooms('');
    setStatus('Vacant');
    setImages([]);
    setApplianceName('');
    setApplianceFile(null);
    setUploadingState(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prop) => {
    setEditingProp(prop);
    setName(prop.name);
    setAddress(prop.address);
    setRooms(prop.rooms !== undefined && prop.rooms !== null ? prop.rooms.toString() : '');
    setStatus(prop.status);
    setImages(prop.images || []);
    setApplianceName('');
    setApplianceFile(null);
    setUploadingState(false);
    setIsModalOpen(true);
  };

  // Convert uploaded image to base64 data URL
  const handleApplianceImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('⚠️ Image size too large:\n\nTo preserve local storage space, please upload appliance images smaller than 1.0 MB.');
      e.target.value = null; // Clear input
      return;
    }

    setApplianceFile(file);
  };

  const handleAttachApplianceImage = () => {
    if (!applianceName.trim()) {
      alert('Please enter an Appliance / Asset Name (e.g. Refrigerator, Air Conditioner).');
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
      
      // Clear file input manually
      const fileInput = document.getElementById('appliance-image-input');
      if (fileInput) fileInput.value = '';
    };
  };

  const handleRemoveImage = (imgId) => {
    setImages(prev => prev.filter(img => img.id !== imgId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !String(rooms).trim()) {
      alert('Please fill out all required fields: Name, Address, and Room/Flat Number.');
      return;
    }

    const propData = {
      name: name.trim(),
      address: address.trim(),
      rooms: String(rooms).trim(),
      status,
      images
    };

    if (editingProp) {
      editProperty(editingProp.id, propData);
    } else {
      addProperty(propData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id, propName) => {
    const doubleCheck = window.confirm(
      `⚠️ Delete Property: Are you sure you want to remove "${propName}"?\n\nThis removes all linked agreement logs. This action cannot be undone.`
    );
    if (doubleCheck) {
      deleteProperty(id);
    }
  };

  return (
    <div>
      {/* Header section with top-right float add property */}
      <div className="notebook-header">
        <div>
          <h2 className="section-title">Properties Registry</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Register your active rental properties, attach appliance images, and review linked agreements.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          padding: '40px', 
          borderRadius: 'var(--radius-lg)', 
          textAlign: 'center' 
        }}>
          <Home size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Properties Registered</h3>
          <p style={{ fontSize: '0.95rem', marginBottom: '20px', color: 'var(--text-muted)' }}>
            Get started by registering your first rental property.
          </p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {properties.map((prop) => {
            const tenant = tenants.find(t => t.propertyId === prop.id);
            const propImages = prop.images || [];

            return (
              <div key={prop.id} className="item-card" style={{ borderLeft: `4px solid ${tenant ? 'var(--color-primary)' : 'var(--color-warning)'}` }}>
                {/* Visual Notebook Filing Folder Tab */}
                <div className={`card-folder-tab ${tenant ? 'tab-occupied' : 'tab-property'}`}>
                  🚪 Flat / Room {prop.rooms}
                </div>

                <div>
                  <div className="item-card-header" style={{ marginTop: '4px' }}>
                    <div className="item-card-title">{prop.name}</div>
                    <span className={`status-badge ${prop.status.toLowerCase()}`}>
                      {prop.status}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '12px' }}>
                    📍 {prop.address}
                  </p>

                  <div className="item-details-list">
                    <div className="detail-row">
                      <span className="label">Room / Flat Number</span>
                      <span className="value" style={{ fontWeight: '700' }}>{prop.rooms}</span>
                    </div>
                  </div>

                  {/* INTEGRATED OCCUPYING TENANT DETAILS */}
                  {tenant && (
                    <div style={{ 
                      marginTop: '16px', 
                      backgroundColor: 'var(--color-primary-light)', 
                      border: '1px solid var(--color-primary)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '12px' 
                    }}>
                      <h4 style={{ 
                        fontSize: '0.9rem', 
                        color: 'var(--color-primary-hover)', 
                        fontWeight: '700', 
                        marginBottom: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}>
                        <User size={16} /> Occupying Tenant Details:
                      </h4>
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-main)' }}>
                        <div>👤 <strong>Name:</strong> {tenant.name}</div>
                        <div>📞 <strong>Phone:</strong> {tenant.phone}</div>
                        <div>📅 <strong>Move-in Date:</strong> {tenant.moveInDate}</div>
                        <div>₹ <strong>Current Rent:</strong> ₹{tenant.rent}/mo</div>
                        
                        {tenant.agreementFile && (
                          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(16, 185, 129, 0.4)' }}>
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
                              <FileText size={14} /> View Signed Agreement
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Appliance Images preview list */}
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Camera size={15} style={{ color: 'var(--color-secondary)' }} />
                      Registered Appliance Images:
                    </h4>
                    {propImages.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No appliance images uploaded yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {propImages.map((img) => (
                          <div key={img.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            fontSize: '0.88rem',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-app)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)'
                          }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>📷 {img.name}</span>
                            <button
                              onClick={() => setPreviewImage(img)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-secondary)',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.82rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                textDecoration: 'underline'
                              }}
                              title={`Preview ${img.name}`}
                            >
                              <Eye size={12} /> View Image Preview
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                <div className="item-card-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleOpenEdit(prop)}
                    style={{ flexGrow: 1 }}
                  >
                    ✏️ Edit Property
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(prop.id, prop.name)}
                    style={{ padding: '8px 12px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Property Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProp ? `Edit details for ${name}` : 'Register a New Property'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Property Name / Nickname</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Flat 301, Emerald Heights" 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="Street, Area, City, PIN" 
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Room / Flat Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={rooms} 
                    onChange={(e) => setRooms(e.target.value)} 
                    placeholder="e.g. Flat 301, Room 4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input" 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Vacant">🟢 Vacant</option>
                    <option value="Occupied">🔴 Occupied</option>
                  </select>
                </div>
              </div>

              {/* APPLIANCE IMAGES ATTACHMENT SECTION IN FORM */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Camera size={18} style={{ color: 'var(--color-secondary)' }} />
                  Attach Appliance & Asset Images
                </h4>
                
                {/* Upload Appliance Form inputs */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px', 
                  marginBottom: '12px', 
                  backgroundColor: 'var(--bg-app)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Refrigerator, Washing Machine"
                      value={applianceName}
                      onChange={(e) => setApplianceName(e.target.value)}
                      style={{ flexGrow: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                    <input 
                      id="appliance-image-input"
                      type="file" 
                      accept="image/*"
                      className="form-input"
                      onChange={handleApplianceImageChange}
                      style={{ flexGrow: 1, padding: '4px 8px', fontSize: '0.85rem', cursor: 'pointer' }}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleAttachApplianceImage}
                    disabled={uploadingState}
                    style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: 'auto', alignSelf: 'flex-end' }}
                  >
                    {uploadingState ? 'Uploading...' : '➕ Attach Asset Image'}
                  </button>
                </div>

                {/* List of currently attached assets in form */}
                <div className="inventory-list">
                  {images.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                      No appliance images currently attached. Attach above if desired.
                    </p>
                  ) : (
                    images.map((img) => (
                      <div key={img.id} className="inventory-item-row">
                        <span className="inventory-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📷 {img.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Mini Thumbnail */}
                          <img 
                            src={img.data} 
                            alt={img.name} 
                            style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                          />
                          <button 
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleRemoveImage(img.id)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto', borderRadius: '4px' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                  Save Property Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL SCREEN LIGHTBOX PREVIEW OVERLAY MODAL */}
      {previewImage && (
        <div className="modal-overlay" style={{ zIndex: 2500, backgroundColor: 'rgba(29, 36, 43, 0.85)' }} onClick={() => setPreviewImage(null)}>
          <div className="modal-content" style={{
            maxWidth: '90vw',
            width: '480px',
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: '800' }}>
                📷 Asset Preview: {previewImage.name}
              </h3>
              <button 
                onClick={() => setPreviewImage(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              backgroundColor: '#fbfaf7', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px', 
              border: '1px solid var(--border-color)',
              minHeight: '200px'
            }}>
              <img 
                src={previewImage.data} 
                alt={previewImage.name} 
                style={{ maxWidth: '100%', maxHeight: '45vh', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={() => setPreviewImage(null)}
              style={{ width: '100%', marginTop: '20px', fontWeight: '700' }}
            >
              Close Asset Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

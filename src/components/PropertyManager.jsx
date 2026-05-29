import React, { useState } from 'react';
import { Home, Plus, Edit3, Trash2, AlertTriangle, X, FileText, User } from 'lucide-react';

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
  const [type, setType] = useState('Apartment');
  const [rooms, setRooms] = useState('2');
  const [status, setStatus] = useState('Vacant');
  
  // Dynamic Inventory Items State
  const [items, setItems] = useState({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemCondition, setNewItemCondition] = useState('Perfect Condition');

  const handleOpenAdd = () => {
    setEditingProp(null);
    setName('');
    setAddress('');
    setType('Apartment');
    setRooms('2');
    setStatus('Vacant');
    setItems({
      'Refrigerator': 'Perfect Condition',
      'Washing Machine': 'Perfect Condition',
      'Air Conditioner': 'Perfect Condition'
    });
    setNewItemName('');
    setNewItemCondition('Perfect Condition');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prop) => {
    setEditingProp(prop);
    setName(prop.name);
    setAddress(prop.address);
    setType(prop.type);
    setRooms(prop.rooms);
    setStatus(prop.status);
    setItems(prop.items || {});
    setNewItemName('');
    setNewItemCondition('Perfect Condition');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      alert('Please enter a Property Name and Street Address.');
      return;
    }

    const propData = {
      name: name.trim(),
      address: address.trim(),
      type,
      rooms: Number(rooms),
      status,
      items
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
      `⚠️ Delete Property: Are you sure you want to remove "${propName}"?\n\nThis removes all linked logs. This action cannot be undone.`
    );
    if (doubleCheck) {
      deleteProperty(id);
    }
  };

  const addCustomItem = () => {
    if (!newItemName.trim()) {
      alert('Please enter an item name.');
      return;
    }
    const nameKey = newItemName.trim();
    setItems(prev => ({
      ...prev,
      [nameKey]: newItemCondition
    }));
    setNewItemName('');
  };

  const removeCustomItem = (itemName) => {
    setItems(prev => {
      const copy = { ...prev };
      delete copy[itemName];
      return copy;
    });
  };

  const handleItemConditionChange = (itemName, condition) => {
    setItems(prev => ({
      ...prev,
      [itemName]: condition
    }));
  };

  return (
    <div>
      <div className="notebook-header">
        <div>
          <h2 className="section-title">Properties Registry</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Register rental units, track dynamic inventory items, and review occupied tenant cards.
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
            Get started by registering your first rental home property.
          </p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {properties.map((prop) => {
            const tenant = tenants.find(t => t.propertyId === prop.id);

            return (
              <div key={prop.id} className="item-card" style={{ borderLeft: `4px solid ${tenant ? 'var(--color-primary)' : 'var(--color-warning)'}` }}>
                {/* Visual Notebook Filing Folder Tab */}
                <div className={`card-folder-tab ${tenant ? 'tab-occupied' : 'tab-property'}`}>
                  📂 {prop.type} unit
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
                      <span className="label">Type</span>
                      <span className="value">{prop.type}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Rooms</span>
                      <span className="value">{prop.rooms}</span>
                    </div>
                  </div>

                  {/* INTEGRATED TENANT DETAILS LOGBOOK */}
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
                        <div>✉️ <strong>Email:</strong> {tenant.email}</div>
                        <div>📅 <strong>Move-in Date:</strong> {tenant.moveInDate}</div>
                        <div>₹ <strong>Current Rent:</strong> ₹{tenant.rent}/mo</div>
                        
                        {/* Download Agreement File inside property card */}
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

                  {/* Dynamic Items Inventory Checklist */}
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '8px' }}>
                      🏠 Appliance & Furniture Check:
                    </h4>
                    {Object.keys(prop.items || {}).length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No inventory items logged. Edit to add appliances.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.entries(prop.items || {}).map(([item, condition]) => {
                          const isRepair = condition === 'Needs Repair';
                          const isWear = condition === 'Slight Wear';
                          return (
                            <div key={item} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              fontSize: '0.85rem',
                              alignItems: 'center' 
                            }}>
                              <span>{item}</span>
                              <span style={{ 
                                fontWeight: '600',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: isRepair ? 'var(--color-danger-light)' : isWear ? 'var(--color-warning-light)' : 'var(--color-primary-light)',
                                color: isRepair ? 'var(--color-danger)' : isWear ? 'var(--color-warning)' : 'var(--color-primary)',
                              }}>
                                {condition}
                              </span>
                            </div>
                          );
                        })}
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
                    ✏️ Edit Property & Items
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
                  <label className="form-label">Home Type</label>
                  <select 
                    className="form-input" 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="Apartment">🏢 Apartment</option>
                    <option value="Single House">🏡 House / Villa</option>
                    <option value="Room">🛏️ PG / Room</option>
                    <option value="Duplex">🏠 Duplex</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Number of Rooms</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={rooms} 
                    onChange={(e) => setRooms(e.target.value)} 
                    min="1" 
                    required
                  />
                </div>
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

              {/* DYNAMIC HOUSE ITEMS CHECKLIST IN FORM */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px' }}>
                  🛠️ Household Inventory Checklist
                </h4>
                
                {/* Add Custom Item Inputs */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginBottom: '12px', 
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-app)',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Add Custom Item (e.g. Geyser, Fan)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    style={{ flexGrow: 2, padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                  <select 
                    className="form-input"
                    value={newItemCondition}
                    onChange={(e) => setNewItemCondition(e.target.value)}
                    style={{ flexGrow: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                  >
                    <option value="Perfect Condition">Perfect</option>
                    <option value="Slight Wear">Slight Wear</option>
                    <option value="Needs Repair">Needs Repair</option>
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={addCustomItem}
                    style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: 'auto' }}
                  >
                    ➕ Add
                  </button>
                </div>

                {/* Checklist Log List */}
                <div className="inventory-list">
                  {Object.keys(items).length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                      No inventory items currently logged. Type above to add one.
                    </p>
                  ) : (
                    Object.keys(items).map((itemName) => (
                      <div key={itemName} className="inventory-item-row">
                        <span className="inventory-name">{itemName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select 
                            className="inventory-select" 
                            value={items[itemName]} 
                            onChange={(e) => handleItemConditionChange(itemName, e.target.value)}
                          >
                            <option value="Perfect Condition">Perfect</option>
                            <option value="Slight Wear">Slight Wear</option>
                            <option value="Needs Repair">Needs Repair</option>
                          </select>
                          <button 
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removeCustomItem(itemName)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto', borderRadius: '4px' }}
                          >
                            ❌ Remove
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
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

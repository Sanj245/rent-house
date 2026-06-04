import React, { useState, useEffect, useRef } from 'react';
import { Home, Users, DollarSign, Settings, Download, Bell, Info, AlertTriangle, CheckCircle, X, History } from 'lucide-react';

import PropertyManager from './components/PropertyManager';
import TenantManager from './components/TenantManager';
import RentLedger from './components/RentLedger';
import TenancyHistory from './components/TenancyHistory';
import MobileApp from './components/mobile/MobileApp';
import HouseCodeScreen from './components/HouseCodeScreen';
import './mobile.css';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { subscribeToHouse, saveHouseData, readLegacyLocalData, clearLegacyLocalData } from './db';

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

export default function App() {
  const [loading, setLoading]       = useState(true);
  const [properties, setProperties] = useState([]);
  const [pastTenants, setPastTenants] = useState([]);
  const [tenants, setTenants]       = useState([]);
  const [ledger, setLedger]         = useState({});
  const [syncStatus, setSyncStatus] = useState('connecting'); // 'live' | 'offline' | 'connecting'
  const [highlightedTenantId, setHighlightedTenantId] = useState(null);

  // Always-current ref — avoids stale closures in action functions
  const stateRef = useRef({ properties: [], tenants: [], ledger: {}, pastTenants: [] });
  const lastSyncedDataRef = useRef({ properties: [], tenants: [], ledger: {}, pastTenants: [] });
  useEffect(() => {
    stateRef.current = { properties, tenants, ledger, pastTenants };
  }, [properties, tenants, ledger, pastTenants]);

  const houseCode = localStorage.getItem('rentarc_house_code') || '';
  const [showHouseSetup, setShowHouseSetup] = useState(!houseCode);

  // ─── 12-Month Raise Engine (Recurring) ────────────────────────────────────
  const checkTenantsRaise = (initialTenants) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let updated = false;
    const checkedTenants = initialTenants.map((t) => {
      let temp = { ...t };
      let changed = false;

      // Transition legacy one-time raise to recurring raise schedule
      if (temp.raiseApplied) {
        if (temp.scheduledRaiseEffectiveDate) {
          const currentDate = new Date(temp.scheduledRaiseEffectiveDate);
          currentDate.setMonth(currentDate.getMonth() + 12);
          temp.scheduledRaiseEffectiveDate = currentDate.toISOString().split('T')[0];
        }
        temp.raiseApplied = false;
        changed = true;
      }

      // Automatically apply recurring rent raises if their scheduled dates are in the past/today
      while (
        temp.scheduledRaiseEffectiveDate &&
        todayStr >= temp.scheduledRaiseEffectiveDate
      ) {
        const raisePercent = Number(temp.scheduledRaisePercent || 5);
        const raiseAmt = Math.round((Number(temp.rent) * raisePercent) / 100);
        const newRent  = Number(temp.rent) + raiseAmt;
        const history  = temp.rentHistory || [{ date: temp.moveInDate, amount: temp.rent, reason: 'Starting Rent' }];
        
        temp.rent = newRent;
        temp.rentHistory = [
          ...history,
          { date: temp.scheduledRaiseEffectiveDate, amount: newRent, reason: `Automatic ${raisePercent}% Raise Applied` }
        ];

        // Advance to next 12-month raise cycle
        const currentDate = new Date(temp.scheduledRaiseEffectiveDate);
        currentDate.setMonth(currentDate.getMonth() + 12);
        temp.scheduledRaiseEffectiveDate = currentDate.toISOString().split('T')[0];
        
        changed = true;
      }

      if (changed) updated = true;
      return temp;
    });
    return { tenants: checkedTenants, updated };
  };

  // ─── Firebase Subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!houseCode) { setLoading(false); return; }
    setSyncStatus('connecting');
    let firstLoad = true;

    const unsubscribe = subscribeToHouse(houseCode, async ({ exists, data, fromCache, error }) => {
      if (error) {
        setSyncStatus('offline');
        if (firstLoad) { setLoading(false); firstLoad = false; }
        return;
      }

      setSyncStatus(fromCache ? 'offline' : 'live');

      if (!exists) {
        // Brand-new house — migrate legacy data if available
        const legacy  = readLegacyLocalData();
        const initial = legacy || { properties: [], tenants: [], ledger: {}, pastTenants: [] };
        await saveHouseData(houseCode, initial);
        if (legacy) clearLegacyLocalData();
        setProperties(initial.properties);
        setTenants(initial.tenants);
        setLedger(initial.ledger);
        setPastTenants(initial.pastTenants);
        stateRef.current = initial;
        lastSyncedDataRef.current = initial;
        if (firstLoad) { setLoading(false); firstLoad = false; }
        return;
      }

      const props       = (data.properties  || []).filter(p => p && p.id);
      const rawTenants  = (data.tenants     || []).filter(t => t && t.id);
      const ledg        = data.ledger      || {};
      const past        = (data.pastTenants || []).filter(pt => pt && pt.id);
      const { tenants: checked, updated } = checkTenantsRaise(rawTenants);

      setProperties(props);
      setTenants(checked);
      setLedger(ledg);
      setPastTenants(past);
      stateRef.current = { properties: props, tenants: checked, ledger: ledg, pastTenants: past };
      lastSyncedDataRef.current = { properties: props, tenants: checked, ledger: ledg, pastTenants: past };

      // Save back only if raises were auto-applied
      if (updated) {
        await saveHouseData(houseCode, { properties: props, tenants: checked, ledger: ledg, pastTenants: past });
      }
      if (firstLoad) { setLoading(false); firstLoad = false; }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseCode]);

  // ─── Firestore Save Helper ────────────────────────────────────────────────
  const saveToFirestore = async (overrides = {}) => {
    const code = localStorage.getItem('rentarc_house_code');
    if (!code) return;
    const data = {
      properties:  overrides.properties  !== undefined ? overrides.properties  : stateRef.current.properties,
      tenants:     overrides.tenants     !== undefined ? overrides.tenants     : stateRef.current.tenants,
      ledger:      overrides.ledger      !== undefined ? overrides.ledger      : stateRef.current.ledger,
      pastTenants: overrides.pastTenants !== undefined ? overrides.pastTenants : stateRef.current.pastTenants,
    };
    try {
      await saveHouseData(code, data);
      setSyncStatus('live');
      lastSyncedDataRef.current = data;
    } catch (err) {
      console.error('Firestore save error:', err);
      setSyncStatus('offline');
      let errorMsg = err.message || String(err);
      let detail = "";
      if (errorMsg.toLowerCase().includes("large") || errorMsg.toLowerCase().includes("size") || errorMsg.toLowerCase().includes("exceed") || errorMsg.toLowerCase().includes("resource-exhausted")) {
        detail = "\n\nThis usually happens if you attached a large image or PDF document. Please try using a smaller file (under 500KB) to stay within database limits.";
      }
      alert(`⚠️ Cloud Save Failed!\n\nYour changes could not be saved to the database. Error: ${errorMsg}${detail}`);
      if (lastSyncedDataRef.current) {
        setProperties(lastSyncedDataRef.current.properties);
        setTenants(lastSyncedDataRef.current.tenants);
        setLedger(lastSyncedDataRef.current.ledger);
        setPastTenants(lastSyncedDataRef.current.pastTenants);
        stateRef.current = { ...lastSyncedDataRef.current };
      }
    }
  };
  // ─── Native / Web System Notification Engine ─────────────────────────────
  const requestNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          return await LocalNotifications.requestPermissions();
        }
        return perm;
      } catch (err) {
        console.error('Error requesting local notifications permission:', err);
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return await Notification.requestPermission();
      }
    }
  };

  const triggerSystemNotification = async (id, title, body) => {
    // Only send notifications if signed in (houseCode is present)
    const code = localStorage.getItem('rentarc_house_code');
    if (!code) return;

    const storageKey = `sys-notif-${id}`;
    if (localStorage.getItem(storageKey)) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'granted') {
          // Generate a unique 32-bit integer ID for the local notification
          let intId = 0;
          for (let i = 0; i < id.length; i++) {
            intId = (intId << 5) - intId + id.charCodeAt(i);
            intId |= 0;
          }
          intId = Math.abs(intId);

          await LocalNotifications.schedule({
            notifications: [
              {
                title: title,
                body: body,
                id: intId,
                schedule: { at: new Date(Date.now() + 100) }, // schedule almost immediately
                sound: 'default',
                channelId: 'rentarc-alerts' // Use high-priority lock-screen channel
              }
            ]
          });
          localStorage.setItem(storageKey, 'triggered');
        }
      } catch (err) {
        console.error('Failed to trigger Capacitor local notification:', err);
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const options = {
              body: body,
              icon: './favicon.svg',
              tag: id,
              requireInteraction: true // Keep notification pinned on desktop lock/home system trays
            };

            // Try Service Worker registration first (standard for mobile PWAs/browsers to show system alerts)
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, options);
              }).catch(() => {
                new Notification(title, options);
              });
            } else {
              new Notification(title, options);
            }
            localStorage.setItem(storageKey, 'triggered');
          } catch (err) {
            console.error('Failed to trigger native notification:', err);
          }
        }
      }
    }
  };

  useEffect(() => {
    const initPermissions = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display === 'default') {
            await LocalNotifications.requestPermissions();
          }
          // Create high-priority lock-screen visible notification channel
          await LocalNotifications.createChannel({
            id: 'rentarc-alerts',
            name: 'RentArc Alerts',
            description: 'High priority alerts for rent raises and overdue payments',
            importance: 5, // max priority for heads-up alert
            visibility: 1, // public visibility (visible on lockscreen)
            sound: 'default',
            vibration: true,
            lights: true
          });
        } catch (err) {
          console.error('Error checking local notification permissions/creating channel:', err);
        }
      } else {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            Notification.requestPermission();
          }
        }
      }
    };
    initPermissions();
  }, []);

  const getPropName = (propertyId) => {
    const p = properties.find(prop => prop.id === propertyId);
    return p ? p.name : 'Rental Property';
  };

  useEffect(() => {
    const code = localStorage.getItem('rentarc_house_code');
    if (!code || tenants.length === 0) return;

    const today = new Date();
    const monthsKeysList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthsNamesList = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const startYear = 2020;
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();

    const m = currentMonthIndex;
    const y = currentYear;
    const monthKey = monthsKeysList[m];
    const monthName = monthsNamesList[m];
    const timelineKey = `${monthKey}-${y}`;

    // 1. Rent Increase Notification (On first day of the increase month)
    const firstOfDay = new Date(y, m, 1);
    if (today >= firstOfDay) {
      const raisedTenantsForMonth = [];
      tenants.forEach((t) => {
        if (t.scheduledRaiseEffectiveDate) {
          const parts = t.scheduledRaiseEffectiveDate.split('-');
          const raiseYear = parseInt(parts[0], 10);
          const raiseMonth = parseInt(parts[1], 10);
          if (raiseYear === y && raiseMonth - 1 === m) {
            raisedTenantsForMonth.push(t.name);
          }
        }
      });

      if (raisedTenantsForMonth.length > 0) {
        const msg = raisedTenantsForMonth.length === 1
          ? `${raisedTenantsForMonth[0]}'s rent has been increased for this month`
          : `${raisedTenantsForMonth.join(', ')}'s rents have been increased for this month`;

        triggerSystemNotification(
          `raise-group-${timelineKey}`,
          `📈 Rent Increase | ${monthName} ${y}`,
          msg
        );
      }
    }

    // 2. Unpaid Rent Notification (Check previous month's unpaid status if today is on or after 11th of current month)
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
    const prevYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;

    const eleventhOfDay = new Date(currentYear, currentMonthIndex, 11);
    if (today >= eleventhOfDay) {
      const prevMonthKey = monthsKeysList[prevMonthIndex];
      const prevMonthName = monthsNamesList[prevMonthIndex];
      const prevTimelineKey = `${prevMonthKey}-${prevYear}`;

      const unpaidTenantsForMonth = [];
      tenants.forEach((t) => {
        if (t.moveInDate) {
          const parts = t.moveInDate.split('-');
          const moveInYear = parseInt(parts[0], 10);
          const moveInMonth = parseInt(parts[1], 10);
          const moveInAbs = (moveInYear - startYear) * 12 + (moveInMonth - 1);
          const prevMonthAbs = (prevYear - startYear) * 12 + prevMonthIndex;
          if (moveInAbs > prevMonthAbs) return;
        }

        const tenantPayments = ledger[t.id] || {};
        const payData = tenantPayments[prevTimelineKey] !== undefined
          ? tenantPayments[prevTimelineKey]
          : (prevYear === 2026 ? tenantPayments[prevMonthKey] : undefined);

        let isUnpaid = !payData;
        if (payData) {
          isUnpaid = typeof payData === 'string'
            ? payData !== 'Paid'
            : payData.status !== 'Paid';
        }

        if (isUnpaid) {
          unpaidTenantsForMonth.push(t.name);
        }
      });

      if (unpaidTenantsForMonth.length > 0) {
        triggerSystemNotification(
          `unpaid-group-${prevTimelineKey}`,
          `🚨 Unpaid Rent | ${prevMonthName} ${prevYear}`,
          `tenants not paid: ${unpaidTenantsForMonth.join(', ')}`
        );
      }
    }
  }, [tenants, ledger, properties]);
  // ─── Navigation ───────────────────────────────────────────────────────────
  const [currentTab, setCurrentTab]           = useState('ledger');
  const [showNotifications, setShowNotifications] = useState(false);

  // ─── Notifications ────────────────────────────────────────────────────────
  const getNotifications = () => {
    const list      = [];
    const today     = new Date();
    const todayStr  = today.toISOString().split('T')[0];
    const monthsKeysList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthsNamesList = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const startYear = 2020;
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();

    const startAbsolute = 0;
    const currentAbsolute = (currentYear - startYear) * 12 + currentMonthIndex;

    // 1. Grouped Unpaid Rent Alerts by Month: Check only previous month's unpaid status on or after 11th of current month
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
    const prevYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;

    const eleventhOfDay = new Date(currentYear, currentMonthIndex, 11);
    if (today >= eleventhOfDay) {
      const prevMonthKey = monthsKeysList[prevMonthIndex];
      const prevMonthName = monthsNamesList[prevMonthIndex];
      const prevTimelineKey = `${prevMonthKey}-${prevYear}`;

      const unpaidTenantsForMonth = [];
      tenants.forEach((t) => {
        if (t.moveInDate) {
          const parts = t.moveInDate.split('-');
          const moveInYear = parseInt(parts[0], 10);
          const moveInMonth = parseInt(parts[1], 10);
          const moveInAbs = (moveInYear - startYear) * 12 + (moveInMonth - 1);
          const prevMonthAbs = (prevYear - startYear) * 12 + prevMonthIndex;
          if (moveInAbs > prevMonthAbs) return;
        }

        const tenantPayments = ledger[t.id] || {};
        const payData = tenantPayments[prevTimelineKey] !== undefined
          ? tenantPayments[prevTimelineKey]
          : (prevYear === 2026 ? tenantPayments[prevMonthKey] : undefined);

        let isUnpaid = !payData;
        if (payData) {
          isUnpaid = typeof payData === 'string'
            ? payData !== 'Paid'
            : payData.status !== 'Paid';
        }

        if (isUnpaid) {
          unpaidTenantsForMonth.push(t.name);
        }
      });

      if (unpaidTenantsForMonth.length > 0) {
        list.push({
          id: `unpaid-group-${prevTimelineKey}`,
          title: `🚨 Unpaid Rent | ${prevMonthName} ${prevYear}`,
          message: `tenants not paid: ${unpaidTenantsForMonth.join(', ')}`,
          type: 'due',
          date: `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-11`
        });
      }
    }

    // 2. Grouped Rent Increase Alerts by Month (On/after 1st of month)
    for (let abs = startAbsolute; abs <= currentAbsolute; abs++) {
      const y = startYear + Math.floor(abs / 12);
      const m = abs % 12;
      const monthKey = monthsKeysList[m];
      const monthName = monthsNamesList[m];
      const timelineKey = `${monthKey}-${y}`;

      const firstOfDay = new Date(y, m, 1);
      if (today < firstOfDay) continue;

      const raisedTenantsForMonth = [];
      tenants.forEach((t) => {
        if (t.scheduledRaiseEffectiveDate) {
          const parts = t.scheduledRaiseEffectiveDate.split('-');
          const raiseYear = parseInt(parts[0], 10);
          const raiseMonth = parseInt(parts[1], 10);
          if (raiseYear === y && raiseMonth - 1 === m) {
            raisedTenantsForMonth.push(t.name);
          }
        }
      });

      if (raisedTenantsForMonth.length > 0) {
        const msg = raisedTenantsForMonth.length === 1
          ? `${raisedTenantsForMonth[0]}'s rent has been increased for this month`
          : `${raisedTenantsForMonth.join(', ')}'s rents have been increased for this month`;

        list.push({
          id: `raise-group-${timelineKey}`,
          title: `📈 Rent Increase | ${monthName} ${y}`,
          message: msg,
          type: 'upcoming-raise',
          date: `${y}-${String(m + 1).padStart(2, '0')}-01`
        });
      }
    }

    return list;
  };


  const notifications = getNotifications();

  // ─── Action Functions ─────────────────────────────────────────────────────
  const addProperty = (newProp) => {
    const propId       = `prop-${Date.now()}`;
    const newProperties = [...stateRef.current.properties, { ...newProp, id: propId }];
    setProperties(newProperties);
    saveToFirestore({ properties: newProperties });
    setCurrentTab('properties');
  };

  const editProperty = (id, updatedProp) => {
    const newProperties = stateRef.current.properties.map((p) => p.id === id ? { ...p, ...updatedProp } : p);
    setProperties(newProperties);
    saveToFirestore({ properties: newProperties });
    setCurrentTab('properties');
  };

  const deleteProperty = (id) => {
    const newProperties        = stateRef.current.properties.filter((p) => p.id !== id);
    const associatedTenant     = stateRef.current.tenants.find((t) => t.propertyId === id);
    let newTenants             = stateRef.current.tenants;
    let newLedger              = stateRef.current.ledger;
    let newPastTenants         = stateRef.current.pastTenants;

    if (associatedTenant) {
      const tenantPayments = stateRef.current.ledger[associatedTenant.id] || {};
      let totalRentCollected = 0;
      Object.values(tenantPayments).forEach((pay) => {
        if (!pay) return;
        if (typeof pay === 'string' && pay === 'Paid') totalRentCollected += Number(associatedTenant.rent);
        else if (typeof pay === 'object') {
          if (pay.status === 'Paid')    totalRentCollected += Number(pay.paid || pay.rentDue || associatedTenant.rent);
          if (pay.status === 'Partial') totalRentCollected += Number(pay.paid || 0);
        }
      });
      const pastRecord = {
        id: `${associatedTenant.id}-past-${Date.now()}`,
        name: associatedTenant.name, phone: associatedTenant.phone,
        propertyId: associatedTenant.propertyId,
        propertyName: stateRef.current.properties.find((p) => p.id === associatedTenant.propertyId)?.name || 'Unknown',
        moveInDate: associatedTenant.moveInDate, moveOutDate: new Date().toISOString().split('T')[0],
        totalRentCollected, securityDeposit: associatedTenant.securityDeposit, rent: associatedTenant.rent,
      };
      newPastTenants = [...stateRef.current.pastTenants, pastRecord];
      newTenants     = stateRef.current.tenants.filter((t) => t.id !== associatedTenant.id);
      newLedger      = { ...stateRef.current.ledger };
      delete newLedger[associatedTenant.id];
    }

    setProperties(newProperties);
    setTenants(newTenants);
    setLedger(newLedger);
    setPastTenants(newPastTenants);
    saveToFirestore({ properties: newProperties, tenants: newTenants, ledger: newLedger, pastTenants: newPastTenants });
    setCurrentTab('properties');
  };

  const addTenant = (newTenant) => {
    const tenantId  = `tenant-${Date.now()}`;
    const todayStr  = new Date().toISOString().split('T')[0];
    let processed   = { ...newTenant, id: tenantId };

    if (processed.scheduledRaiseEffectiveDate && todayStr >= processed.scheduledRaiseEffectiveDate && !processed.raiseApplied) {
      const raiseAmt = Math.round((Number(processed.rent) * Number(processed.scheduledRaisePercent)) / 100);
      const newRent  = Number(processed.rent) + raiseAmt;
      const history  = processed.rentHistory || [{ date: processed.moveInDate, amount: processed.rent, reason: 'Starting Rent' }];
      processed = { ...processed, rent: newRent, raiseApplied: true, rentHistory: [...history, { date: processed.scheduledRaiseEffectiveDate, amount: newRent, reason: `Automatic ${processed.scheduledRaisePercent}% Rent Raise Applied` }] };
    }

    const newTenants    = [...stateRef.current.tenants, processed];
    const newProperties = stateRef.current.properties.map((p) => p.id === newTenant.propertyId ? { ...p, status: 'Occupied' } : p);
    const newLedger     = { ...stateRef.current.ledger, [tenantId]: {} };

    setTenants(newTenants);
    setProperties(newProperties);
    setLedger(newLedger);
    saveToFirestore({ tenants: newTenants, properties: newProperties, ledger: newLedger });
    setHighlightedTenantId(tenantId);
    setCurrentTab('tenants');
  };

  const removeTenant = (tenantId, propertyId, deductions = 0, refundAmount = null, vacateNotes = '') => {
    const tenant       = stateRef.current.tenants.find((t) => t.id === tenantId);
    let newPastTenants = stateRef.current.pastTenants;

    if (tenant) {
      const tenantPayments = stateRef.current.ledger[tenantId] || {};
      let totalRentCollected = 0;
      Object.values(tenantPayments).forEach((pay) => {
        if (!pay) return;
        if (typeof pay === 'string' && pay === 'Paid') totalRentCollected += Number(tenant.rent);
        else if (typeof pay === 'object') {
          if (pay.status === 'Paid')    totalRentCollected += Number(pay.paid || pay.rentDue || tenant.rent);
          if (pay.status === 'Partial') totalRentCollected += Number(pay.paid || 0);
        }
      });
      const pastRecord = {
        id: `${tenant.id}-past-${Date.now()}`,
        name: tenant.name, phone: tenant.phone,
        propertyId: tenant.propertyId,
        propertyName: stateRef.current.properties.find((p) => p.id === tenant.propertyId)?.name || 'Unknown',
        moveInDate: tenant.moveInDate, moveOutDate: new Date().toISOString().split('T')[0],
        totalRentCollected, 
        securityDeposit: Number(tenant.securityDeposit), 
        rent: Number(tenant.rent),
        deductions: Number(deductions),
        refundAmount: refundAmount !== null ? Number(refundAmount) : (Number(tenant.securityDeposit) - Number(deductions)),
        vacateNotes: vacateNotes || ''
      };
      newPastTenants = [...stateRef.current.pastTenants, pastRecord];
    }

    const newTenants    = stateRef.current.tenants.filter((t) => t.id !== tenantId);
    const newProperties = stateRef.current.properties.map((p) => p.id === propertyId ? { ...p, status: 'Vacant' } : p);
    const newLedger     = { ...stateRef.current.ledger };
    delete newLedger[tenantId];

    setTenants(newTenants);
    setProperties(newProperties);
    setLedger(newLedger);
    setPastTenants(newPastTenants);
    saveToFirestore({ tenants: newTenants, properties: newProperties, ledger: newLedger, pastTenants: newPastTenants });
    setCurrentTab('tenants');
  };

  const scheduleRentRaise = (tenantId, percent, effectiveDate) => {
    const todayStr  = new Date().toISOString().split('T')[0];
    const newTenants = stateRef.current.tenants.map((t) => {
      if (t.id !== tenantId) return t;
      let updated = { ...t, scheduledRaisePercent: Number(percent), scheduledRaiseEffectiveDate: effectiveDate, raiseApplied: false };
      if (effectiveDate && todayStr >= effectiveDate) {
        const raiseAmt = Math.round((Number(updated.rent) * Number(percent)) / 100);
        const newRent  = Number(updated.rent) + raiseAmt;
        const history  = updated.rentHistory || [{ date: updated.moveInDate, amount: updated.rent, reason: 'Starting Rent' }];
        updated = { ...updated, rent: newRent, raiseApplied: true, rentHistory: [...history, { date: effectiveDate, amount: newRent, reason: `Automatic ${percent}% Raise Applied` }] };
        alert(`🎉 Raise Applied Immediately!\n\nThe effective date is in the past/today, so rent was increased to ₹${newRent}.`);
      } else {
        alert(`📅 Raise Scheduled Successfully!\n\nAn automatic ${percent}% raise is scheduled for ${effectiveDate}.`);
      }
      return updated;
    });
    setTenants(newTenants);
    saveToFirestore({ tenants: newTenants });
    setHighlightedTenantId(tenantId);
    setCurrentTab('tenants');
  };

  const updatePaymentStatus = (tenantId, monthKey, statusDetails) => {
    const tenantLedger = { ...(stateRef.current.ledger[tenantId] || {}) };
    if (statusDetails === undefined || statusDetails === null) {
      delete tenantLedger[monthKey];
    } else {
      tenantLedger[monthKey] = statusDetails;
    }
    const newLedger = {
      ...stateRef.current.ledger,
      [tenantId]: tenantLedger,
    };
    setLedger(newLedger);
    saveToFirestore({ ledger: newLedger });
    setHighlightedTenantId(tenantId);
    setCurrentTab('ledger');
  };

  const updateTenantNotes = (tenantId, notes) => {
    const newTenants = stateRef.current.tenants.map((t) => t.id === tenantId ? { ...t, notes } : t);
    setTenants(newTenants);
    saveToFirestore({ tenants: newTenants });
    setCurrentTab('tenants');
  };

  const editTenant = (tenantId, updatedTenant) => {
    const newTenants = stateRef.current.tenants.map((t) => t.id === tenantId ? { ...t, ...updatedTenant } : t);
    setTenants(newTenants);
    saveToFirestore({ tenants: newTenants });
    setHighlightedTenantId(tenantId);
    setCurrentTab('tenants');
  };

  const handleExportData = () => {
    const dataStr  = JSON.stringify({ properties, tenants, ledger }, null, 2);
    const dataUri  = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link     = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'RentArc-Backup.json');
    link.click();
  };



  // ─── Mobile Detection ─────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ─── House Setup Gate ─────────────────────────────────────────────────────
  if (showHouseSetup || !houseCode) {
    return (
      <HouseCodeScreen
        onComplete={(code) => {
          localStorage.setItem('rentarc_house_code', code.toUpperCase().trim());
          window.location.reload();
        }}
      />
    );
  }

  // ─── Loading Screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'radial-gradient(circle at top right, #3d6a54, #1a2c22, #0d1510)', color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
        <div className="loader-spinner" style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#d4a373', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <h3 style={{ fontWeight: '500', fontSize: '1.2rem', letterSpacing: '0.5px' }}>RentArc Dossiers</h3>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Connecting to your house data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Mobile Layout ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileApp
        activeTab={currentTab}
        setActiveTab={setCurrentTab}
        properties={properties}       setProperties={setProperties}
        tenants={tenants}             setTenants={setTenants}
        ledger={ledger}               setLedger={setLedger}
        pastTenants={pastTenants}     setPastTenants={setPastTenants}
        notifications={notifications}
        addProperty={addProperty}     editProperty={editProperty}   deleteProperty={deleteProperty}
        addTenant={addTenant}         removeTenant={removeTenant}   editTenant={editTenant}
        scheduleRentRaise={scheduleRentRaise}
        updatePaymentStatus={updatePaymentStatus}
        updateTenantNotes={updateTenantNotes}
        handleExportData={handleExportData}
        requestNotificationPermission={requestNotificationPermission}
        highlightedTenantId={highlightedTenantId}
        setHighlightedTenantId={setHighlightedTenantId}
      />
    );
  }

  // ─── Sync Status Badge ────────────────────────────────────────────────────
  const SyncBadge = () => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: '600', color: syncStatus === 'live' ? '#4ade80' : syncStatus === 'offline' ? '#f97316' : '#a1a1aa', padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${syncStatus === 'live' ? 'rgba(74,222,128,0.25)' : syncStatus === 'offline' ? 'rgba(249,115,22,0.25)' : 'rgba(161,161,170,0.2)'}` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: syncStatus === 'live' ? '#4ade80' : syncStatus === 'offline' ? '#f97316' : '#a1a1aa', boxShadow: syncStatus === 'live' ? '0 0 6px #4ade80' : 'none', animation: syncStatus === 'live' ? 'syncPulse 2s infinite' : 'none' }} />
      {syncStatus === 'live' ? '🔴 Live' : syncStatus === 'offline' ? 'Offline' : 'Connecting...'}
    </div>
  );

  // ─── Desktop Layout ───────────────────────────────────────────────────────
  return (
    <div id="app-root" className="app-layout">

      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="#" className="app-logo" onClick={() => setCurrentTab('ledger')}>
              🏠 Rent<span className="app-logo-span">Arc</span>
            </a>
            <button className="notification-bell-btn" onClick={async () => {
              await requestNotificationPermission();
              setShowNotifications(true);
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', color: 'var(--text-main)', transition: 'var(--transition-normal)', borderRadius: '50%' }} title="Open Alerts Center">
              <Bell size={22} />
              {notifications.length > 0 && (
                <span className="bell-badge-pulse" style={{ position: 'absolute', top: '2px', right: '2px', width: '9px', height: '9px', backgroundColor: 'var(--color-secondary)', borderRadius: '50%' }} />
              )}
            </button>
          </div>

          {/* Sync badge */}
          <div style={{ marginTop: '10px' }}><SyncBadge /></div>

          <nav className="nav-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
            <button className={`nav-link ${currentTab === 'properties' ? 'active' : ''}`} onClick={() => setCurrentTab('properties')}>🏠 Properties</button>
            <button className={`nav-link ${currentTab === 'tenants'    ? 'active' : ''}`} onClick={() => setCurrentTab('tenants')}>👥 Tenants</button>
            <button className={`nav-link ${currentTab === 'ledger'     ? 'active' : ''}`} onClick={() => setCurrentTab('ledger')}>📅 Rents</button>
            <button className={`nav-link ${currentTab === 'history'    ? 'active' : ''}`} onClick={() => setCurrentTab('history')}>📖 History Logs</button>
            <button className={`nav-link ${currentTab === 'settings'   ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>⚙️ Settings</button>
          </nav>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            🏠 House: <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-main)' }}>{houseCode}</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Sign out of this house?\n\nYou can re-enter the house code anytime to get back in.')) {
                localStorage.removeItem('rentarc_house_code');
                window.location.reload();
              }
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE TOP HEADER */}
      <header className="main-header">
        <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <a href="#" className="app-logo" onClick={() => setCurrentTab('ledger')}>
            🏠 Rent<span className="app-logo-span">Arc</span>
          </a>
          <button className="notification-bell-btn" onClick={async () => {
            await requestNotificationPermission();
            setShowNotifications(true);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', color: 'var(--text-main)' }} title="Open Alerts Center">
            <Bell size={22} />
            {notifications.length > 0 && (
              <span className="bell-badge-pulse" style={{ position: 'absolute', top: '2px', right: '2px', width: '9px', height: '9px', backgroundColor: 'var(--color-secondary)', borderRadius: '50%' }} />
            )}
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="nav-container nav-mobile-bar" style={{ display: 'none' }}>
        <button className={`nav-link ${currentTab === 'properties' ? 'active' : ''}`} onClick={() => setCurrentTab('properties')}><Home size={20} />Properties</button>
        <button className={`nav-link ${currentTab === 'tenants'    ? 'active' : ''}`} onClick={() => setCurrentTab('tenants')}><Users size={20} />Tenants</button>
        <button className={`nav-link ${currentTab === 'ledger'     ? 'active' : ''}`} onClick={() => setCurrentTab('ledger')}><DollarSign size={20} />Rents</button>
        <button className={`nav-link ${currentTab === 'history'    ? 'active' : ''}`} onClick={() => setCurrentTab('history')}><History size={20} />Logs</button>
        <button className={`nav-link ${currentTab === 'settings'   ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}><Settings size={20} />Settings</button>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <main className="app-container" style={{ maxWidth: '100%', padding: 0 }}>

          {currentTab === 'properties' && (
            <PropertyManager properties={properties} tenants={tenants} addProperty={addProperty} editProperty={editProperty} deleteProperty={deleteProperty} />
          )}
          {currentTab === 'tenants' && (
            <TenantManager tenants={tenants} properties={properties} ledger={ledger} addTenant={addTenant} removeTenant={removeTenant} updateTenantRent={scheduleRentRaise} editTenant={editTenant} highlightedTenantId={highlightedTenantId} setHighlightedTenantId={setHighlightedTenantId} />
          )}
          {currentTab === 'ledger' && (
            <RentLedger tenants={tenants} properties={properties} ledger={ledger} updatePaymentStatus={updatePaymentStatus} updateTenantNotes={updateTenantNotes} highlightedTenantId={highlightedTenantId} setHighlightedTenantId={setHighlightedTenantId} />
          )}
          {currentTab === 'history' && (
            <TenancyHistory properties={properties} tenants={tenants} pastTenants={pastTenants} ledger={ledger} />
          )}
          {currentTab === 'settings' && (
            <div className="settings-box">
              <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
                ⚙️ Settings & Data Backups
              </h2>

              {/* House Code Info */}
              <div className="settings-group">
                <h3 className="settings-title">🏠 Your House Code</h3>
                <p className="settings-description">
                  Your current house code is{' '}
                  <strong style={{ fontFamily: 'monospace', background: 'var(--bg-app)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {houseCode}
                  </strong>.
                  {' '}Share this code with trusted family members — they enter it on their devices to sync the same live data.
                </p>
                <button className="btn btn-secondary" onClick={() => {
                  if (window.confirm('Sign out of this house? You can re-enter the code anytime.')) {
                    localStorage.removeItem('rentarc_house_code');
                    window.location.reload();
                  }
                }}>
                  🔄 Change House Code
                </button>
              </div>



              {/* Backup */}
              <div className="settings-group" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <h3 className="settings-title">
                  <Download size={18} style={{ color: 'var(--color-secondary)' }} />
                  Save My Data (Download Backup File)
                </h3>
                <p className="settings-description">
                  To save a safe physical backup copy of your properties, tenants, and monthly payment records directly on your computer, click the download button below:
                </p>
                <button className="btn btn-primary" onClick={handleExportData}>
                  💾 Click to Save Data
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* NOTIFICATIONS MODAL */}
      {showNotifications && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '440px', borderRadius: 'var(--radius-lg)' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔔 Notifications Center
              </h3>
              <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                <X size={20} />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <CheckCircle size={36} style={{ color: 'var(--color-primary)', marginBottom: '10px', display: 'inline-block' }} />
                <p style={{ fontWeight: '600' }}>You're all caught up!</p>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>No pending alerts, repair items, or upcoming rent adjustments.</p>
              </div>
            ) : (
              <div className="notification-list-scrollable" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                {notifications.map((n) => (
                  <div key={n.id} style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', borderLeft: `4px solid ${n.type === 'repair' ? 'var(--color-warning)' : n.type === 'due' ? 'var(--color-danger)' : 'var(--color-primary)'}`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px' }}>
                      {n.type === 'repair' || n.type === 'due'
                        ? <AlertTriangle size={16} style={{ color: n.type === 'repair' ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                        : <Info size={16} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{n.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{n.message}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '500' }}>📅 Date: {formatDateToDDMMYYYY(n.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-secondary" onClick={() => setShowNotifications(false)} style={{ width: '100%', marginTop: '20px' }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes syncPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

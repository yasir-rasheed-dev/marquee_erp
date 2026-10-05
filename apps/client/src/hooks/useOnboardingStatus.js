// src/hooks/useOnboardingStatus.js
// Live state & readiness tracker for Marquee ERP setup

import { useState, useEffect, useCallback } from 'react';
import hallApi from '../services/hallApi';
import accountApi from '../services/accountApi';
import eventApi from '../services/eventApi';
import unitApi from '../services/unitApi';
import inventoryApi from '../services/inventoryApi';
import itemApi from '../services/itemApi';
import recipeApi from '../services/recipeApi';
import serviceApi from '../services/serviceApi';
import packageApi from '../services/packageApi';
import bookingApi from '../services/bookingApi';
import { useBranch } from '../context/BranchContext';

const extractCount = (res) => {
  if (!res) return 0;
  const d = res.data !== undefined ? res.data : res;
  if (Array.isArray(d)) return d.length;
  if (Array.isArray(d?.data)) return d.data.length;
  if (Array.isArray(d?.items)) return d.items.length;
  if (typeof d?.count === 'number') return d.count;
  if (typeof d?.total === 'number') return d.total;
  return 0;
};

export const ONBOARDING_STAGES = [
  { id: 'all', label: 'All Steps' },
  { id: 'foundation', label: '1. Core Foundation' },
  { id: 'kitchen', label: '2. Kitchen & Menu' },
  { id: 'packages', label: '3. Services & Packages' },
  { id: 'execution', label: '4. Operations & Booking' },
];

export const useOnboardingStatus = () => {
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    halls: 0,
    accounts: 0,
    events: 0,
    units: 0,
    rawMaterials: 0,
    menuItems: 0,
    recipes: 0,
    services: 0,
    packages: 0,
    bookings: 0,
  });

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        hallApi.getAll(),
        accountApi.getAll(),
        eventApi.getAll(),
        unitApi.getAll(),
        inventoryApi.getAll(),
        itemApi.getAll(),
        recipeApi.getIngredients(),
        serviceApi.getAll(),
        packageApi.getAll(),
        bookingApi.getAll(),
      ]);

      const [
        hallsRes,
        accountsRes,
        eventsRes,
        unitsRes,
        rawMatRes,
        menuItemsRes,
        recipesRes,
        servicesRes,
        packagesRes,
        bookingsRes
      ] = results;

      setCounts({
        halls: hallsRes.status === 'fulfilled' ? extractCount(hallsRes.value) : 0,
        accounts: accountsRes.status === 'fulfilled' ? extractCount(accountsRes.value) : 0,
        events: eventsRes.status === 'fulfilled' ? extractCount(eventsRes.value) : 0,
        units: unitsRes.status === 'fulfilled' ? extractCount(unitsRes.value) : 0,
        rawMaterials: rawMatRes.status === 'fulfilled' ? extractCount(rawMatRes.value) : 0,
        menuItems: menuItemsRes.status === 'fulfilled' ? extractCount(menuItemsRes.value) : 0,
        recipes: recipesRes.status === 'fulfilled' ? extractCount(recipesRes.value) : 0,
        services: servicesRes.status === 'fulfilled' ? extractCount(servicesRes.value) : 0,
        packages: packagesRes.status === 'fulfilled' ? extractCount(packagesRes.value) : 0,
        bookings: bookingsRes.status === 'fulfilled' ? extractCount(bookingsRes.value) : 0,
      });
    } catch (err) {
      console.error('Error fetching onboarding status:', err);
    } finally {
      setLoading(false);
    }
  }, [currentBranch]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Construct structured steps list with clear priorities & routes
  const steps = [
    {
      id: 'halls',
      order: 1,
      stage: 'foundation',
      title: 'Halls & Sessions Setup',
      route: '/settings/halls',
      count: counts.halls,
      isCompleted: counts.halls > 0,
      isCritical: true,
      timeEst: '2 mins',
      whyNeeded: 'Booking form cannot proceed without selecting a designated banquet hall and session timing.',
      emptyTip: 'Add at least 1 Hall (e.g. Royal Hall, Grand Ballroom) with guest capacity and session slots.',
      countLabel: counts.halls === 1 ? '1 Hall configured' : `${counts.halls} Halls configured`,
    },
    {
      id: 'accounts',
      order: 2,
      stage: 'foundation',
      title: 'Cash & Bank Payment Accounts',
      route: '/Accounts',
      count: counts.accounts,
      isCompleted: counts.accounts > 0,
      isCritical: true,
      timeEst: '2 mins',
      whyNeeded: 'Required to receive advance booking deposits, manage cash drawer, and post double-entry ledgers.',
      emptyTip: 'Set up your Cash-in-Hand or Bank account (e.g. Meezan Bank, HBL) for advance collections.',
      countLabel: counts.accounts === 1 ? '1 Account active' : `${counts.accounts} Accounts active`,
    },
    {
      id: 'events',
      order: 3,
      stage: 'foundation',
      title: 'Event Types & Categories',
      route: '/events/add',
      count: counts.events,
      isCompleted: counts.events > 0,
      isCritical: false,
      timeEst: '1 min',
      whyNeeded: 'Categorizes bookings into specific functions (Barat, Walima, Mehendi, Corporate Gala, Birthday).',
      emptyTip: 'Define event categories so calendars and booking contracts show proper event classifications.',
      countLabel: counts.events === 1 ? '1 Event Type' : `${counts.events} Event Types`,
    },
    {
      id: 'units',
      order: 4,
      stage: 'kitchen',
      title: 'Units of Measurement (UOM)',
      route: '/menus/units',
      count: counts.units,
      isCompleted: counts.units > 0,
      isCritical: true,
      timeEst: '2 mins',
      whyNeeded: 'Foundational for all inventory raw materials and kitchen recipes (Kg, Gram, Liter, Piece, Plate).',
      emptyTip: 'Add standard units so kitchen recipes and inventory items can be weighed and measured.',
      countLabel: counts.units === 1 ? '1 Unit defined' : `${counts.units} Units defined`,
    },
    {
      id: 'rawMaterials',
      order: 5,
      stage: 'kitchen',
      title: 'Raw Materials & Item Master',
      route: '/inventory/item-master',
      count: counts.rawMaterials,
      isCompleted: counts.rawMaterials > 0,
      isCritical: false,
      timeEst: '4 mins',
      whyNeeded: 'Raw ingredients (Chicken, Basmati Rice, Oil, Spices) used by kitchen to prepare banquet dishes.',
      emptyTip: 'Add raw ingredients with purchase units to track inventory deduction and recipe food costs.',
      countLabel: counts.rawMaterials === 1 ? '1 Raw material' : `${counts.rawMaterials} Raw materials`,
    },
    {
      id: 'menuItems',
      order: 6,
      stage: 'kitchen',
      title: 'Menu Categories & Dishes',
      route: '/menus/items',
      count: counts.menuItems,
      isCompleted: counts.menuItems > 0,
      isCritical: true,
      timeEst: '3 mins',
      whyNeeded: 'Prepared dishes and beverages (e.g. Mutton Biryani, Chicken Qorma, Kheer) offered to customers.',
      emptyTip: 'Create the dishes that will be bundled into packages or selected individually by guests.',
      countLabel: counts.menuItems === 1 ? '1 Menu item' : `${counts.menuItems} Menu items`,
    },
    {
      id: 'recipes',
      order: 7,
      stage: 'kitchen',
      title: 'Recipe Manager & Food Costing',
      route: '/kitchen/recipe-manager',
      count: counts.recipes,
      isCompleted: counts.recipes > 0,
      isCritical: false,
      timeEst: '5 mins',
      whyNeeded: 'Connects menu items to raw materials for automatic per-head food cost and kitchen production sheets.',
      emptyTip: 'Map raw materials to dish quantities to enable live food cost tracking and store deductions.',
      countLabel: counts.recipes === 1 ? '1 Recipe linked' : `${counts.recipes} Recipes linked`,
    },
    {
      id: 'services',
      order: 8,
      stage: 'packages',
      title: 'Event Services & Add-ons',
      route: '/serviceslist',
      count: counts.services,
      isCompleted: counts.services > 0,
      isCritical: false,
      timeEst: '2 mins',
      whyNeeded: 'Extra facilities (DJ/Sound, Stage Decor, AC/Heating, Projector, Bridal Room, Floral Entry).',
      emptyTip: 'Add standard or customized services with fixed or hourly rates to upsell with bookings.',
      countLabel: counts.services === 1 ? '1 Service defined' : `${counts.services} Services defined`,
    },
    {
      id: 'packages',
      order: 9,
      stage: 'packages',
      title: 'Banquet Packages (Per-Head Deals)',
      route: '/menus/packages',
      count: counts.packages,
      isCompleted: counts.packages > 0,
      isCritical: true,
      timeEst: '3 mins',
      whyNeeded: 'Pre-bundled packages (Gold / Silver / Diamond) allowing 1-click booking with menu items & services.',
      emptyTip: 'Bundle your menu items into convenient per-head packages for quick booking quotation.',
      countLabel: counts.packages === 1 ? '1 Package configured' : `${counts.packages} Packages configured`,
    },
    {
      id: 'bookings',
      order: 10,
      stage: 'execution',
      title: 'Create Your First Booking',
      route: '/bookings/create',
      count: counts.bookings,
      isCompleted: counts.bookings > 0,
      isCritical: false,
      timeEst: '3 mins',
      whyNeeded: 'The ultimate operational goal! Select customer, hall, package, record advance payment, and print receipt.',
      emptyTip: 'Ready for business! Start booking events, issuing invoices, and generating kitchen production sheets.',
      countLabel: counts.bookings === 1 ? '1 Booking recorded' : `${counts.bookings} Bookings recorded`,
    },
  ];

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const criticalSteps = steps.filter(s => s.isCritical);
  const completedCritical = criticalSteps.filter(s => s.isCompleted).length;
  const percentage = Math.round((completedSteps / totalSteps) * 100);
  const isReadyForBooking = counts.halls > 0 && counts.accounts > 0 && (counts.menuItems > 0 || counts.packages > 0);

  return {
    loading,
    counts,
    steps,
    totalSteps,
    completedSteps,
    criticalStepsCount: criticalSteps.length,
    completedCriticalCount: completedCritical,
    percentage,
    isReadyForBooking,
    refreshStatus: fetchStatus,
  };
};

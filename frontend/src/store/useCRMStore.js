import { create } from 'zustand';

/**
 * CRM Store for SwiftQuote Application
 * Manages authentication state and CRM entities
 */
const useCRMStore = create((set, get) => ({
  // ===== AUTHENTICATION STATE =====
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authError: null,

  // ===== CRM ENTITIES =====
  contacts: [],
  properties: [],
  leads: [],
  projects: [],
  quotes: [],
  leadStages: [],
  activities: [],

  // ===== UI STATE =====
  selectedContact: null,
  selectedProperty: null,
  selectedProject: null,
  selectedLead: null,
  showLoginModal: false,
  showRegisterModal: false,

  // ===== PENDING MEASUREMENT STATE =====
  pendingMeasurement: null,

  // ===== AUTHENTICATION ACTIONS =====

  /**
   * Set user and authentication status
   */
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    authError: null
  }),

  /**
   * Clear user and authentication state
   */
  clearUser: () => set({
    user: null,
    isAuthenticated: false,
    authError: null,
    // Clear CRM data when user logs out
    contacts: [],
    properties: [],
    leads: [],
    projects: [],
    quotes: [],
    activities: [],
    selectedContact: null,
    selectedProperty: null,
    selectedProject: null,
    selectedLead: null
  }),

  /**
   * Set authentication loading state
   */
  setAuthLoading: (isLoading) => set({ isLoading }),

  /**
   * Set authentication error
   */
  setAuthError: (error) => set({ authError: error }),

  /**
   * Login with email and password
   */
  login: async (email, password) => {
    set({ isLoading: true, authError: null });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        showLoginModal: false
      });

      return { success: true, user: data.user };

    } catch (error) {
      console.error('Login error:', error);
      set({
        isLoading: false,
        authError: error.message,
        user: null,
        isAuthenticated: false
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Register new user account
   */
  register: async (userData) => {
    set({ isLoading: true, authError: null });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        showRegisterModal: false
      });

      return { success: true, user: data.user };

    } catch (error) {
      console.error('Registration error:', error);
      set({
        isLoading: false,
        authError: error.message,
        user: null,
        isAuthenticated: false
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      get().clearUser();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Clear user state even if API call fails
      get().clearUser();
      return { success: false, error: error.message };
    }
  },

  /**
   * Check authentication status on app load
   */
  checkAuth: async () => {
    set({ isLoading: true });

    try {
      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          authError: null
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null
      });
    }
  },

  // ===== CONTACT MANAGEMENT =====

  // Contact loading state
  contactsLoading: false,
  contactsError: null,

  /**
   * Set contacts list
   */
  setContacts: (contacts) => set({ contacts }),

  /**
   * Set contact loading state
   */
  setContactsLoading: (loading) => set({ contactsLoading: loading }),

  /**
   * Set contact error state
   */
  setContactsError: (error) => set({ contactsError: error }),

  /**
   * Fetch contacts from API
   */
  fetchContacts: async (search = '', limit = 50, offset = 0) => {
    set({ contactsLoading: true, contactsError: null });

    try {
      const params = new URLSearchParams({
        search,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`/api/contacts?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contacts');
      }

      set({
        contacts: data.contacts,
        contactsLoading: false,
        contactsError: null
      });

      return {
        success: true,
        contacts: data.contacts,
        total: data.total
      };

    } catch (error) {
      console.error('Fetch contacts error:', error);
      set({
        contactsLoading: false,
        contactsError: error.message
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Create new contact via API
   */
  createContact: async (contactData) => {
    set({ contactsLoading: true, contactsError: null });

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create contact');
      }

      // Add contact to store
      set((state) => ({
        contacts: [data.contact, ...state.contacts],
        contactsLoading: false,
        contactsError: null
      }));

      return { success: true, contact: data.contact };

    } catch (error) {
      console.error('Create contact error:', error);
      set({
        contactsLoading: false,
        contactsError: error.message
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Update existing contact via API
   */
  updateContactAPI: async (id, updates) => {
    set({ contactsLoading: true, contactsError: null });

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update contact');
      }

      // Update contact in store
      set((state) => ({
        contacts: state.contacts.map(contact =>
          contact.id === id ? data.contact : contact
        ),
        selectedContact: state.selectedContact?.id === id ? data.contact : state.selectedContact,
        contactsLoading: false,
        contactsError: null
      }));

      return { success: true, contact: data.contact };

    } catch (error) {
      console.error('Update contact error:', error);
      set({
        contactsLoading: false,
        contactsError: error.message
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete contact via API
   */
  deleteContactAPI: async (id) => {
    set({ contactsLoading: true, contactsError: null });

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete contact');
      }

      // Remove contact from store
      set((state) => ({
        contacts: state.contacts.filter(contact => contact.id !== id),
        selectedContact: state.selectedContact?.id === id ? null : state.selectedContact,
        contactsLoading: false,
        contactsError: null
      }));

      return { success: true, message: data.message };

    } catch (error) {
      console.error('Delete contact error:', error);
      set({
        contactsLoading: false,
        contactsError: error.message
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Add new contact (local state only)
   */
  addContact: (contact) => set((state) => ({
    contacts: [...state.contacts, { ...contact, id: contact.id || Date.now() }]
  })),

  /**
   * Update existing contact (local state only)
   */
  updateContact: (id, updates) => set((state) => ({
    contacts: state.contacts.map(contact =>
      contact.id === id ? { ...contact, ...updates, updated_at: new Date().toISOString() } : contact
    )
  })),

  /**
   * Delete contact (local state only)
   */
  deleteContact: (id) => set((state) => ({
    contacts: state.contacts.filter(contact => contact.id !== id),
    selectedContact: state.selectedContact?.id === id ? null : state.selectedContact
  })),

  /**
   * Select contact for detailed view
   */
  setSelectedContact: (contact) => set({ selectedContact: contact }),

  // ===== PROPERTY MANAGEMENT =====

  /**
   * Set properties list
   */
  setProperties: (properties) => set({ properties }),

  /**
   * Add new property
   */
  addProperty: (property) => set((state) => ({
    properties: [...state.properties, { ...property, id: property.id || Date.now() }]
  })),

  /**
   * Update existing property
   */
  updateProperty: (id, updates) => set((state) => ({
    properties: state.properties.map(property =>
      property.id === id ? { ...property, ...updates, updated_at: new Date().toISOString() } : property
    )
  })),

  /**
   * Delete property
   */
  deleteProperty: (id) => set((state) => ({
    properties: state.properties.filter(property => property.id !== id),
    selectedProperty: state.selectedProperty?.id === id ? null : state.selectedProperty
  })),

  /**
   * Select property for measurement context
   */
  setSelectedProperty: (property) => set({ selectedProperty: property }),

  // ===== PROJECT MANAGEMENT =====

  /**
   * Set projects list
   */
  setProjects: (projects) => set({ projects }),

  /**
   * Add new project
   */
  addProject: (project) => set((state) => ({
    projects: [...state.projects, { ...project, id: project.id || Date.now() }]
  })),

  /**
   * Update existing project
   */
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(project =>
      project.id === id ? { ...project, ...updates, updated_at: new Date().toISOString() } : project
    )
  })),

  /**
   * Link project to property and contact (called after measurement)
   */
  linkProjectToProperty: (projectId, propertyId, contactId) => set((state) => ({
    projects: state.projects.map(project =>
      project.id === projectId
        ? { ...project, property_id: propertyId, contact_id: contactId }
        : project
    )
  })),

  /**
   * Create project from measurement data
   */
  createProjectFromMeasurement: async (measurementData) => {
    const { selectedProperty } = get();

    if (!selectedProperty) {
      throw new Error('No property selected for measurement');
    }

    const project = {
      name: `Measurement - ${selectedProperty.address}`,
      property_id: selectedProperty.id,
      contact_id: selectedProperty.contact_id,
      total_area_sqft: measurementData.totalArea,
      polygon_data: measurementData.polygons,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    get().addProject(project);
    return project;
  },

  // ===== LEAD MANAGEMENT =====

  /**
   * Set leads list
   */
  setLeads: (leads) => set({ leads }),

  /**
   * Set lead stages
   */
  setLeadStages: (stages) => set({ leadStages: stages }),

  /**
   * Add new lead
   */
  addLead: (lead) => set((state) => ({
    leads: [...state.leads, { ...lead, id: lead.id || Date.now() }]
  })),

  /**
   * Update lead (including stage progression)
   */
  updateLead: (id, updates) => set((state) => ({
    leads: state.leads.map(lead =>
      lead.id === id ? { ...lead, ...updates, updated_at: new Date().toISOString() } : lead
    )
  })),

  /**
   * Move lead to different stage
   */
  moveLeadToStage: (leadId, stageId) => {
    get().updateLead(leadId, { stage_id: stageId });
  },

  // ===== QUOTE MANAGEMENT =====

  /**
   * Set quotes list
   */
  setQuotes: (quotes) => set({ quotes }),

  /**
   * Add new quote
   */
  addQuote: (quote) => set((state) => ({
    quotes: [...state.quotes, { ...quote, id: quote.id || Date.now() }]
  })),

  /**
   * Update quote status
   */
  updateQuote: (id, updates) => set((state) => ({
    quotes: state.quotes.map(quote =>
      quote.id === id ? { ...quote, ...updates, updated_at: new Date().toISOString() } : quote
    )
  })),

  /**
   * Generate quote from project measurements
   */
  generateQuote: async (projectId, pricePerSqft) => {
    const { projects } = get();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.total_area_sqft) {
      throw new Error('Project has no measured area');
    }

    const totalAmount = project.total_area_sqft * pricePerSqft;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // Valid for 30 days

    const quote = {
      project_id: projectId,
      quote_number: `Q-${Date.now()}`,
      total_amount: totalAmount,
      price_per_sqft: pricePerSqft,
      status: 'draft',
      valid_until: validUntil.toISOString(),
      quote_data: {
        area: project.total_area_sqft,
        rate: pricePerSqft,
        subtotal: totalAmount,
        tax: 0, // Can be calculated later
        total: totalAmount
      },
      created_at: new Date().toISOString()
    };

    get().addQuote(quote);
    return quote;
  },

  // ===== ACTIVITY TRACKING =====

  /**
   * Set activities list
   */
  setActivities: (activities) => set({ activities }),

  /**
   * Add activity log entry
   */
  addActivity: (activity) => set((state) => ({
    activities: [
      { ...activity, id: activity.id || Date.now(), created_at: new Date().toISOString() },
      ...state.activities
    ]
  })),

  // ===== UI STATE ACTIONS =====

  /**
   * Show/hide login modal
   */
  setShowLoginModal: (show) => set({
    showLoginModal: show,
    showRegisterModal: false // Close register if login opens
  }),

  /**
   * Show/hide register modal
   */
  setShowRegisterModal: (show) => set({
    showRegisterModal: show,
    showLoginModal: false // Close login if register opens
  }),

  /**
   * Clear auth error
   */
  clearAuthError: () => set({ authError: null }),

  // ===== PENDING MEASUREMENT ACTIONS =====

  /**
   * Set pending measurement data
   */
  setPendingMeasurement: (measurement) => set({ pendingMeasurement: measurement }),

  /**
   * Clear pending measurement data
   */
  clearPendingMeasurement: () => set({ pendingMeasurement: null }),

  /**
   * Load pending measurement from session storage
   */
  loadPendingMeasurement: () => {
    const existing = get().pendingMeasurement;
    if (existing) {
      try {
        sessionStorage.removeItem('pending-measurement');
      } catch (_) {}
      return existing;
    }
    try {
      const pending = sessionStorage.getItem('pending-measurement');
      if (pending) {
        const measurement = JSON.parse(pending);
        set({ pendingMeasurement: measurement });
        sessionStorage.removeItem('pending-measurement');
        return measurement;
      }
    } catch (error) {
      console.error('Error loading pending measurement:', error);
    }
    return null;
  },

  /**
   * Associate pending measurement with a contact
   */
  associatePendingMeasurement: async (contactId) => {
    const { pendingMeasurement } = get();

    if (!pendingMeasurement) {
      throw new Error('No pending measurement to associate');
    }

    try {
      // Handle both single area and multi-area measurements
      const totalArea = pendingMeasurement.totalArea || pendingMeasurement.area || 0;
      const areaCount = pendingMeasurement.polygonCount || 1;

      // Here we would typically make an API call to create the project
      // For now, we'll just store it locally
      const project = {
        name: `Measurement - ${pendingMeasurement.address}`,
        contact_id: contactId,
        total_area_sqft: totalArea,
        polygon_data: pendingMeasurement.coordinates,
        polygon_count: areaCount,
        individual_areas: pendingMeasurement.areas || [{ area: totalArea, description: pendingMeasurement.description }],
        status: 'completed',
        address: pendingMeasurement.address,
        location: pendingMeasurement.location,
        created_at: new Date().toISOString()
      };

      get().addProject(project);

      // Clear pending measurement
      get().clearPendingMeasurement();

      return project;
    } catch (error) {
      console.error('Error associating measurement:', error);
      throw error;
    }
  }
}));

export default useCRMStore;
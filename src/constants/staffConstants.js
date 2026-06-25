// Staff roles in hierarchy
export const STAFF_ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  PROPERTY_MANAGER: 'property_manager',
  STAFF: 'staff'
};

export const STAFF_ROLES_LABELS = {
  superadmin: 'Super Admin',
  owner: 'Business Owner',
  property_manager: 'Property Manager',
  staff: 'Staff'
};

// Departments
export const DEPARTMENTS = [
  'Front Desk',
  'Housekeeping',
  'Food & Beverage',
  'Maintenance',
  'Management'
];

export const DEPARTMENT_ICONS = {
  'Front Desk': '🏨',
  'Housekeeping': '🧹',
  'Food & Beverage': '🍽️',
  'Maintenance': '🔧',
  'Management': '📋'
};

// Staff states
export const STAFF_STATES = {
  ACTIVE: true,
  INACTIVE: false
};

// Expected Staff object structure
export const STAFF_TEMPLATE = {
  _id: '',
  name: '',
  email: '',
  role: STAFF_ROLES.STAFF,
  department: null,
  business_id: '',
  property_id: '',
  is_active: true,
  created_by: '',
  createdAt: '',
  updatedAt: ''
};

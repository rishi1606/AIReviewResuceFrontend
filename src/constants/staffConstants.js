// Staff roles in hierarchy
export const STAFF_ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  LEAD: 'lead',
  STAFF: 'staff'
};

export const STAFF_ROLES_LABELS = {
  superadmin: 'Super Admin',
  owner: 'Business Owner',
  lead: 'Department Lead',
  staff: 'Staff Member'
};

// Departments
export const DEPARTMENTS = [
  'Front Office',
  'Housekeeping',
  'Food & Beverage',
  'Maintenance',
  'Spa',
  'Management',
  'Facilities'
];

export const DEPARTMENT_ICONS = {
  'Front Office': '🏨',
  'Front Desk': '🏨',
  'Housekeeping': '🧹',
  'Food & Beverage': '🍽️',
  'Maintenance': '🔧',
  'Spa': '💆',
  'Management': '📋',
  'Facilities': '🏢'
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

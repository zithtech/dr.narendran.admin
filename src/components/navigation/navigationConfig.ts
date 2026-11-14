import {
  Boxes,
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  FlaskConical,
  GitBranch,
  Globe,
  HeartPulse,
  History,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  MapPin,
  Package,
  Pill,
  Shield,
  ShoppingBag,
  Star,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react';

export interface NavModule {
  name: string;
  path: string;
  icon: LucideIcon;
  slug: string;
  fallbackSlugs?: string[];
  description?: string;
  aliases?: string[];
}

export interface NavCategory {
  key: string;
  name: string;
  icon: LucideIcon;
  description: string;
  defaultPath: string;
  modules: NavModule[];
}

/**
 * Top Navigation Restructuring:
 * 1. Dashboard: Dashboard
 * 2. Clinical: Doctors, Availability & Slots, Patients, Appointments, Today's Schedule, Ratings & Reviews
 * 3. Network: Hospitals, Branches, Linked Labs, Linked Medicals
 * 4. Operations: Pharmacy, Medicine Inventory, Medicine Package, Prescription, Orders, Lab Services
 * 5. Administration: Client Portals, User Accounts, Staff Management, Roles & Permissions
 * 6. Support: Patient Support, Doctor Support
 */
export const NAVIGATION_CATEGORIES: NavCategory[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    description: 'System-wide analytics, key metrics, and activity overview',
    defaultPath: '/',
    modules: [
      {
        name: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        slug: 'DASHBOARD',
        description: 'Executive overview, stats, and quick actions',
        aliases: ['/dashboard'],
      },
    ],
  },
  {
    key: 'clinical',
    name: 'Clinical',
    icon: Stethoscope,
    description: 'Doctor schedules, patient records, appointments & feedback',
    defaultPath: '/doctors',
    modules: [
      {
        name: 'Doctors',
        path: '/doctors',
        icon: Stethoscope,
        slug: 'DOCTORS',
        description: 'Specialists, profiles, timings & availability',
      },
      {
        name: 'Availability & Slots',
        path: '/availability',
        icon: CalendarClock,
        slug: 'AVAILABILITY',
        description: 'Consultation hours, slot durations & blocked dates',
        aliases: ['/doctor-availability'],
      },
      {
        name: 'Patients',
        path: '/patients',
        icon: HeartPulse,
        slug: 'PATIENTS',
        description: 'Patient registry, medical records & demographic data',
      },
      {
        name: 'Patient Timelines',
        path: '/patient-timelines',
        icon: History,
        slug: 'PATIENTS',
        description: 'Patient timelines, medical history & health records',
      },
      {
        name: 'Medical Records',
        path: '/medical-records',
        icon: HeartPulse,
        slug: 'MEDICAL_RECORDS',
        description: 'Patient health records, medical history & health records',
      },
      {
        name: 'Location Management',
        path: '/locations',
        icon: MapPin,
        slug: 'DOCTORS',
        description: 'Location management, clinics & facilities',
      },
      {
        name: 'Appointments',
        path: '/appointments',
        icon: CalendarDays,
        slug: 'APPOINTMENTS',
        description: 'All patient appointments, bookings & rescheduling',
      },
      {
        name: "Today's Schedule",
        path: '/appointments/today',
        icon: CalendarClock,
        slug: 'TODAYS_SCHEDULE',
        description: 'Doctor day-sheet, live consultation queues & status',
      },
      {
        name: 'Ratings & Reviews',
        path: '/reviews',
        icon: Star,
        slug: 'REVIEWS',
        description: 'Patient feedback, doctor ratings & review approvals',
      },
    ],
  },
  {
    key: 'network',
    name: 'Network',
    icon: Building2,
    description: 'Hospitals, branches, diagnostic labs & medical partners',
    defaultPath: '/hospitals',
    modules: [
      {
        name: 'Hospitals',
        path: '/hospitals',
        icon: Building2,
        slug: 'HOSPITALS',
        description: 'Hospital entities, accreditations & facility details',
      },
      {
        name: 'Branches',
        path: '/branches',
        icon: GitBranch,
        slug: 'BRANCHES',
        description: 'Hospital branch locations, contacts & operation units',
      },
      {
        name: 'Linked Labs',
        path: '/labs',
        icon: FlaskConical,
        slug: 'LABS',
        description: 'Partner pathology & diagnostic laboratory centers',
      },
      {
        name: 'Linked Medicals',
        path: '/linked-medicals',
        icon: Stethoscope,
        slug: 'LINKED_MEDICALS',
        description: 'Affiliated clinics, dispensaries & healthcare hubs',
      },
    ],
  },
  {
    key: 'operations',
    name: 'Operations',
    icon: Boxes,
    description: 'Pharmacy inventory, prescriptions, medicine packaging & orders',
    defaultPath: '/pharmacy',
    modules: [
      {
        name: 'Pharmacy',
        path: '/pharmacy',
        icon: Pill,
        slug: 'PHARMACY',
        description: 'Medicine formulations catalog, dosage & pricing',
      },
      {
        name: 'Medicine Inventory',
        path: '/inventory',
        icon: Boxes,
        slug: 'INVENTORY',
        description: 'Physical stock levels, batch tracking & stock adjustments',
      },
      {
        name: 'Medicine Package',
        path: '/medicine-packages',
        icon: Package,
        slug: 'MEDICINE_PACKAGES',
        description: 'Pre-configured medicine kits & treatment bundles',
        aliases: ['/medicine-package', '/packages'],
      },
      {
        name: 'Prescription',
        path: '/prescriptions',
        icon: FileText,
        slug: 'PRESCRIPTIONS',
        description: 'Doctor prescriptions, clinical templates & PDF exports',
      },
      {
        name: 'Orders',
        path: '/orders',
        icon: ShoppingBag,
        slug: 'ORDERS',
        description: 'Pharmacy orders, fulfilment pipeline & deliveries',
      },
      {
        name: 'Lab Services',
        path: '/lab-services',
        icon: FlaskConical,
        slug: 'LAB_SERVICES',
        description: 'Diagnostic test menu, pricing & test packages',
      },
    ],
  },
  {
    key: 'administration',
    name: 'Administration',
    icon: Shield,
    description: 'System access, staff credentials & role permissions',
    defaultPath: '/users',
    modules: [
      {
        name: 'Client Portals',
        path: '/client-portals',
        icon: Globe,
        slug: 'CLIENT_PORTALS',
        description: 'External partner portals, credentials & invitations',
      },
      {
        name: 'User Accounts',
        path: '/users',
        icon: UserCog,
        slug: 'USERS',
        description: 'System user credentials, access status & logins',
      },
      {
        name: 'Staff Management',
        path: '/staff',
        icon: Users,
        slug: 'STAFF',
        description: 'Hospital staff roster, duties, documents & shift timings',
      },
      {
        name: 'Roles & Permissions',
        path: '/roles',
        icon: Shield,
        slug: 'ROLES',
        description: 'RBAC role definitions, module permissions & access matrices',
      },
    ],
  },
  {
    key: 'support',
    name: 'Support',
    icon: LifeBuoy,
    description: 'Customer service, patient queries & doctor assistance',
    defaultPath: '/support',
    modules: [
      {
        name: 'Patient Support',
        path: '/support',
        icon: LifeBuoy,
        slug: 'PATIENT_SUPPORT',
        fallbackSlugs: ['SUPPORT'],
        description: 'Patient helpdesk, ticketing, chat & issue resolution',
      },
      {
        name: 'Doctor Support',
        path: '/doctor-support',
        icon: Stethoscope,
        slug: 'DOCTOR_SUPPORT',
        fallbackSlugs: ['SUPPORT'],
        description: 'Physician assistance, technical queries & escalation tickets',
      },
    ],
  },
];

/**
 * Matches a URL pathname against navigation modules to find the active category and active module.
 */
export function findActiveNavigation(
  pathname: string,
  categories: NavCategory[],
): {
  activeCategory: NavCategory | null;
  activeModule: NavModule | null;
} {
  // Normalize pathname (remove trailing slash except for root)
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // 1. Exact match against module path
  for (const cat of categories) {
    for (const mod of cat.modules) {
      if (mod.path === cleanPath) {
        return { activeCategory: cat, activeModule: mod };
      }
    }
  }

  // 2. Exact match against aliases
  for (const cat of categories) {
    for (const mod of cat.modules) {
      if (mod.aliases?.includes(cleanPath)) {
        return { activeCategory: cat, activeModule: mod };
      }
    }
  }

  // 3. Prefix match with longest matching path
  let bestMatch: { cat: NavCategory; mod: NavModule; length: number } | null = null;
  for (const cat of categories) {
    for (const mod of cat.modules) {
      if (mod.path !== '/' && cleanPath.startsWith(mod.path)) {
        if (!bestMatch || mod.path.length > bestMatch.length) {
          bestMatch = { cat, mod, length: mod.path.length };
        }
      }
      if (mod.aliases) {
        for (const alias of mod.aliases) {
          if (alias !== '/' && cleanPath.startsWith(alias)) {
            if (!bestMatch || alias.length > bestMatch.length) {
              bestMatch = { cat, mod, length: alias.length };
            }
          }
        }
      }
    }
  }

  if (bestMatch) {
    return { activeCategory: bestMatch.cat, activeModule: bestMatch.mod };
  }

  // 4. Fallback to first category and first module if cleanPath is root or unknown
  if (categories.length > 0 && categories[0]) {
    const firstCat = categories[0];
    const firstMod = firstCat.modules[0] || null;
    return { activeCategory: firstCat, activeModule: firstMod };
  }

  return { activeCategory: null, activeModule: null };
}

/**
 * Filters navigation items according to RBAC permissions.
 */
export function filterNavigationByPermissions(
  categories: NavCategory[],
  allowedSlugs: string[],
  isSystemAdmin: boolean,
): NavCategory[] {
  if (isSystemAdmin) {
    return categories;
  }

  return categories
    .map((cat) => {
      const filteredModules = cat.modules.filter((mod) => {
        if (mod.slug === 'DASHBOARD') return true;
        if (allowedSlugs.includes(mod.slug)) return true;
        if (mod.fallbackSlugs?.some((fb) => allowedSlugs.includes(fb))) return true;
        return false;
      });

      return {
        ...cat,
        modules: filteredModules,
      };
    })
    .filter((cat) => cat.modules.length > 0);
}

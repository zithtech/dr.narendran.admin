import {
  Building2,
  CalendarClock,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  Stethoscope,
  User,
  UserCog,
} from 'lucide-react';

export interface ClientNavModule {
  name: string;
  path: string;
  icon: LucideIcon;
  slug?: string;
  description?: string;
  aliases?: string[];
}

export interface ClientNavCategory {
  key: string;
  name: string;
  icon: LucideIcon;
  defaultPath: string;
  modules: ClientNavModule[];
}

/**
 * Navigation categories & modules for the Lab Client Portal (/client/*)
 */
export const LAB_CLIENT_CATEGORIES: ClientNavCategory[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    defaultPath: '/client/dashboard',
    modules: [
      {
        name: 'Dashboard',
        path: '/client/dashboard',
        icon: LayoutDashboard,
        description: 'Key metrics, profile readiness, and operating schedule',
      },
    ],
  },
  {
    key: 'diagnostics',
    name: 'Diagnostics',
    icon: FlaskConical,
    defaultPath: '/client/upcoming-tests',
    modules: [
      {
        name: 'Upcoming Tests',
        path: '/client/upcoming-tests',
        icon: CalendarClock,
        description: 'Upcoming laboratory tests prescribed by doctors for your lab',
        aliases: ['/client/upcoming'],
      },
      {
        name: 'Test Reports',
        path: '/client/reports',
        icon: FileText,
        description: 'Doctor prescribed test orders and patient medical reports',
      },
      {
        name: 'Services & Tests',
        path: '/client/services',
        icon: FlaskConical,
        description: 'Diagnostic investigation catalog and pricing',
      },
    ],
  },
  {
    key: 'management',
    name: 'Management',
    icon: Building2,
    defaultPath: '/client/profile',
    modules: [
      {
        name: 'Lab Profile',
        path: '/client/profile',
        icon: Building2,
        description: 'Laboratory details, operating timings & facilities',
      },
    ],
  },
  {
    key: 'account',
    name: 'Account',
    icon: UserCog,
    defaultPath: '/client/account',
    modules: [
      {
        name: 'My Account',
        path: '/client/account',
        icon: User,
        description: 'Username and account contact information',
      },
      {
        name: 'Change Password',
        path: '/client/change-password',
        icon: KeyRound,
        description: 'Account security and credential updates',
      },
    ],
  },
];

/**
 * Navigation categories & modules for the Partner Client Portal (/portal/*)
 */
export const PARTNER_PORTAL_CATEGORIES: ClientNavCategory[] = [
  {
    key: 'overview',
    name: 'Overview',
    icon: LayoutDashboard,
    defaultPath: '/portal',
    modules: [
      {
        name: 'Overview',
        path: '/portal',
        icon: LayoutDashboard,
        description: 'Partner analytics and quick actions',
      },
    ],
  },
  {
    key: 'network',
    name: 'Network',
    icon: Building2,
    defaultPath: '/portal/labs',
    modules: [
      {
        name: 'Linked Labs',
        path: '/portal/labs',
        icon: FlaskConical,
        slug: 'LABS',
        description: 'Diagnostic labs and imaging centers',
      },
      {
        name: 'Linked Medicals',
        path: '/portal/linked-medicals',
        icon: Stethoscope,
        slug: 'LABS',
        description: 'Affiliated pharmacies and medical shops',
      },
      {
        name: 'Hospitals',
        path: '/portal/hospitals',
        icon: Building2,
        slug: 'HOSPITALS',
        description: 'Hospital entities and locations',
      },
      {
        name: 'Branches',
        path: '/portal/branches',
        icon: GitBranch,
        slug: 'BRANCHES',
        description: 'Hospital branch facilities',
      },
    ],
  },
  {
    key: 'clinical',
    name: 'Clinical',
    icon: Stethoscope,
    defaultPath: '/portal/doctors',
    modules: [
      {
        name: 'Doctors',
        path: '/portal/doctors',
        icon: Stethoscope,
        slug: 'DOCTORS',
        description: 'Physicians, schedules and availability',
      },
      {
        name: 'Patients',
        path: '/portal/patients',
        icon: HeartPulse,
        slug: 'PATIENTS',
        description: 'Patient registry and health records',
      },
      {
        name: 'Prescription Templates',
        path: '/portal/prescriptions',
        icon: FileText,
        slug: 'PRESCRIPTIONS',
        description: 'Prescription formats and medication plans',
      },
    ],
  },
  {
    key: 'operations',
    name: 'Operations',
    icon: FlaskConical,
    defaultPath: '/portal/lab-services',
    modules: [
      {
        name: 'Lab Services',
        path: '/portal/lab-services',
        icon: FlaskConical,
        slug: 'LAB_SERVICES',
        description: 'Diagnostic test offerings and investigation packages',
      },
    ],
  },
];

/**
 * Filter categories based on client RBAC permissions.
 */
export function filterClientCategoriesByPermissions(
  categories: ClientNavCategory[],
  allowedSlugs: string[],
  isSystemRole: boolean,
): ClientNavCategory[] {
  if (isSystemRole) return categories;

  return categories
    .map((category) => {
      const allowedModules = category.modules.filter((mod) => {
        if (!mod.slug) return true;
        return allowedSlugs.includes(mod.slug);
      });

      return {
        ...category,
        modules: allowedModules,
        defaultPath: allowedModules[0]?.path ?? category.defaultPath,
      };
    })
    .filter((category) => category.modules.length > 0);
}

/**
 * Matches a URL pathname against navigation categories and modules
 */
export function findActiveClientNavigation(
  pathname: string,
  categories: ClientNavCategory[],
): {
  activeCategory: ClientNavCategory | null;
  activeModule: ClientNavModule | null;
} {
  const cleanPath =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

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
  let bestMatch: { cat: ClientNavCategory; mod: ClientNavModule; length: number } | null = null;
  for (const cat of categories) {
    for (const mod of cat.modules) {
      if (
        mod.path !== '/client' &&
        mod.path !== '/portal' &&
        cleanPath.startsWith(mod.path)
      ) {
        if (!bestMatch || mod.path.length > bestMatch.length) {
          bestMatch = { cat, mod, length: mod.path.length };
        }
      }
    }
  }

  if (bestMatch) {
    return { activeCategory: bestMatch.cat, activeModule: bestMatch.mod };
  }

  return {
    activeCategory: categories[0] ?? null,
    activeModule: categories[0]?.modules[0] ?? null,
  };
}

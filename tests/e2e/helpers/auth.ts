import { APIRequestContext, Page } from '@playwright/test';

export type PortalRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'LIBRARIAN'
  | 'TRANSPORT_MANAGER'
  | 'DRIVER'
  | 'HOSTEL_WARDEN'
  | 'LAB_ASSISTANT'
  | 'ACTIVITY_COORDINATOR'
  | 'SECURITY_GUARD'
  | 'PLACEMENT_OFFICER'
  | 'TEACHER'
  | 'PARENT'
  | 'STUDENT';

export const ROLE_CREDENTIALS: Record<PortalRole, { email: string; password: string; route: string }> = {
  SUPER_ADMIN: { email: 'superadmin@skanda.edu.in', password: 'Password@123', route: '/super-admin' },
  ADMIN: { email: 'principal.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  LIBRARIAN: { email: 'librarian.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  TRANSPORT_MANAGER: { email: 'transport.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  DRIVER: { email: 'driver.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  HOSTEL_WARDEN: { email: 'warden.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  LAB_ASSISTANT: { email: 'lab.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  ACTIVITY_COORDINATOR: { email: 'activity.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  SECURITY_GUARD: { email: 'guard.blr@skanda.edu.in', password: 'Password@123', route: '/kiosk/gate' },
  PLACEMENT_OFFICER: { email: 'placement.blr@skanda.edu.in', password: 'Password@123', route: '/branch-admin' },
  TEACHER: { email: 'teacher.blr@skanda.edu.in', password: 'Password@123', route: '/portal' },
  PARENT: { email: 'parent.blr@skanda.edu.in', password: 'Password@123', route: '/portal' },
  STUDENT: { email: 'student1.blr@skanda.edu.in', password: 'Password@123', route: '/portal' }
};

export const API_BASE = process.env.E2E_API_URL || 'http://localhost:5000/api';

export async function apiLoginAsRole(request: APIRequestContext, role: PortalRole) {
  const creds = ROLE_CREDENTIALS[role];
  const res = await request.post(`${API_BASE}/portal-auth/login`, {
    data: { email: creds.email, password: creds.password }
  });
  if (!res.ok()) {
    throw new Error(`Portal API login failed for ${role}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return { token: body.token as string, user: body.user as any, route: creds.route };
}

export async function loginAsRole(page: Page, role: PortalRole) {
  const { token, user, route } = await apiLoginAsRole(page.request, role);

  await page.goto('/');
  await page.evaluate(
    ({ tok, branchId }) => {
      window.localStorage.setItem('skanda_portal_token', tok);
      if (branchId) window.localStorage.setItem('skanda_active_branch_id', branchId);
    },
    { tok: token, branchId: user.branchId || '' }
  );

  await page.goto(route);
  await page.waitForLoadState('networkidle');
  return { token, user, route };
}

export async function loginWithCredentials(page: Page, email: string, password: string, expectedRoute: string) {
  const res = await page.request.post(`${API_BASE}/portal-auth/login`, {
    data: { email, password }
  });
  if (!res.ok()) {
    throw new Error(`Credential login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  await page.goto('/');
  await page.evaluate(
    ({ tok, branchId }) => {
      window.localStorage.setItem('skanda_portal_token', tok);
      if (branchId) window.localStorage.setItem('skanda_active_branch_id', branchId);
    },
    { tok: body.token, branchId: body.user?.branchId || '' }
  );
  await page.goto(expectedRoute);
  await page.waitForLoadState('networkidle');
  return { token: body.token as string, user: body.user as any };
}

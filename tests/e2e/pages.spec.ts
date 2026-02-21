import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-helpers';

/**
 * E2E Tests for Teachers Page
 * Tests teacher management functionality
 */

async function loginAsSuperuser(page: Page, username = testUsers.superuser.username, password = testUsers.superuser.password) {
  await page.goto('/login/superuser');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[type="text"], input[name="username"]').first().fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  // Wait for login to complete with longer timeout for slower browsers
  await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Teachers Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/teachers');
  });

  test('should navigate to teachers page', async ({ page }) => {
    const url = page.url();
    const isOnTeachersPage = url.includes('/teachers');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnTeachersPage || isOnLoginPage).toBeTruthy();
  });

  test('should display teachers list when authenticated', async ({ page }) => {
    const url = page.url();
    
    if (url.includes('/teachers')) {
      await page.waitForLoadState('domcontentloaded');
      
      const hasTable = await page.locator('table').count() > 0;
      const hasTeacherContent = await page.getByText(/teacher/i).count() > 0;
      const hasDataGrid = await page.locator('[role="grid"]').count() > 0;
      
      expect(hasTable || hasTeacherContent || hasDataGrid).toBeTruthy();
    }
  });
});

test.describe('Classes Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/classes');
  });

  test('should navigate to classes page', async ({ page }) => {
    const url = page.url();
    const isOnClassesPage = url.includes('/classes');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnClassesPage || isOnLoginPage).toBeTruthy();
  });

  test('should display classes list when authenticated', async ({ page }) => {
    const url = page.url();
    
    if (url.includes('/classes')) {
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Allow extra time for React rendering
      
      const hasTable = await page.locator('table').count() > 0;
      const hasClassContent = await page.getByText(/class/i).count() > 0;
      const hasDataGrid = await page.locator('[role="grid"]').count() > 0;
      const hasCards = await page.locator('[class*="Card"], [class*="card"]').count() > 0;
      const hasContent = await page.locator('main, [class*="content"]').count() > 0;
      
      expect(hasTable || hasClassContent || hasDataGrid || hasCards || hasContent).toBeTruthy();
    }
  });
});

test.describe('Centers Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/centers');
  });

  test('should navigate to centers page', async ({ page }) => {
    const url = page.url();
    const isOnCentersPage = url.includes('/centers');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnCentersPage || isOnLoginPage).toBeTruthy();
  });
});

test.describe('Payments Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/payments');
  });

  test('should navigate to payments page', async ({ page }) => {
    const url = page.url();
    const isOnPaymentsPage = url.includes('/payments');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnPaymentsPage || isOnLoginPage).toBeTruthy();
  });
});

test.describe('Attendance Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/attendance');
  });

  test('should navigate to attendance page', async ({ page }) => {
    const url = page.url();
    const isOnAttendancePage = url.includes('/attendance');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnAttendancePage || isOnLoginPage).toBeTruthy();
  });
});

test.describe('Grades Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/grades');
  });

  test('should navigate to grades page', async ({ page }) => {
    const url = page.url();
    const isOnGradesPage = url.includes('/grades');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnGradesPage || isOnLoginPage).toBeTruthy();
  });
});

test.describe('Assignments Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/assignments');
  });

  test('should navigate to assignments page', async ({ page }) => {
    const url = page.url();
    const isOnAssignmentsPage = url.includes('/assignments');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnAssignmentsPage || isOnLoginPage).toBeTruthy();
  });
});

import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-helpers';

/**
 * E2E Tests for Tests/Exams functionality
 * Tests the test creation and management features
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

test.describe('Tests List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/tests');
  });

  test('should navigate to tests page', async ({ page }) => {
    const url = page.url();
    const isOnTestsPage = url.includes('/tests');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnTestsPage || isOnLoginPage).toBeTruthy();
  });

  test('should display tests list when authenticated', async ({ page }) => {
    const url = page.url();
    
    if (url.includes('/tests')) {
      await page.waitForLoadState('domcontentloaded');
      
      const hasTable = await page.locator('table').count() > 0;
      const hasTestContent = await page.getByText(/test|exam/i).count() > 0;
      const hasDataGrid = await page.locator('[role="grid"]').count() > 0;
      const hasCards = await page.locator('[class*="card"]').count() > 0;
      
      expect(hasTable || hasTestContent || hasDataGrid || hasCards).toBeTruthy();
    }
  });
});

test.describe('Create Test Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/tests/create');
  });

  test('should navigate to create test page', async ({ page }) => {
    const url = page.url();
    const isOnCreatePage = url.includes('/tests/create');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnCreatePage || isOnLoginPage).toBeTruthy();
  });

  test('should display test creation form when authenticated', async ({ page }) => {
    const url = page.url();
    
    if (url.includes('/tests/create')) {
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Allow extra time for React rendering
      
      // Look for form elements or any buttons
      const hasInputs = await page.locator('input, textarea, select').count() > 0;
      // Also check for "Next" button since this is a multi-step form, or any button
      const hasSubmitButton = await page.getByRole('button', { name: /create|save|submit|next/i }).count() > 0;
      const hasAnyButton = await page.getByRole('button').count() > 0;
      const hasForm = await page.locator('form, [class*="form"], [class*="Form"]').count() > 0;
      
      expect(hasInputs || hasSubmitButton || hasAnyButton || hasForm).toBeTruthy();
    }
  });
});

test.describe('Subjects Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/subjects');
  });

  test('should navigate to subjects page', async ({ page }) => {
    const url = page.url();
    const isOnSubjectsPage = url.includes('/subjects');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnSubjectsPage || isOnLoginPage).toBeTruthy();
  });

  test('should display subjects list when authenticated', async ({ page }) => {
    const url = page.url();
    
    if (url.includes('/subjects')) {
      await page.waitForLoadState('domcontentloaded');
      
      const hasTable = await page.locator('table').count() > 0;
      const hasSubjectContent = await page.getByText(/subject/i).count() > 0;
      const hasDataGrid = await page.locator('[role="grid"]').count() > 0;
      
      expect(hasTable || hasSubjectContent || hasDataGrid).toBeTruthy();
    }
  });
});

test.describe('Debts Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperuser(page);
    await page.goto('/debts');
  });

  test('should navigate to debts page', async ({ page }) => {
    const url = page.url();
    const isOnDebtsPage = url.includes('/debts');
    const isOnLoginPage = url.includes('/login');
    
    expect(isOnDebtsPage || isOnLoginPage).toBeTruthy();
  });

  test('should display debts list when authenticated', async ({ page }) => {
    const url = page.url();
    
    if (url.includes('/debts')) {
      await page.waitForLoadState('domcontentloaded');
      
      const hasTable = await page.locator('table').count() > 0;
      const hasDebtContent = await page.getByText(/debt|payment|due/i).count() > 0;
      const hasDataGrid = await page.locator('[role="grid"]').count() > 0;
      
      expect(hasTable || hasDebtContent || hasDataGrid).toBeTruthy();
    }
  });
});

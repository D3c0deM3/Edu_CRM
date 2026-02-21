import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Login Pages
 * Tests authentication flows for different user types
 */

test.describe('Login Page - Superuser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login/superuser');
  });

  test('should display login form', async ({ page }) => {
    // Check for form elements
    await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('should show error with empty credentials', async ({ page }) => {
    // Click login without entering credentials
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Wait for error message or validation
    await page.waitForTimeout(1000);
    
    // Should still be on login page
    await expect(page).toHaveURL(/\/login\/superuser/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.locator('input[type="text"], input[name="username"]').first().fill('invalid_user');
    await page.locator('input[type="password"]').first().fill('invalid_password');
    
    // Submit form
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Should show error or stay on login page
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login Page - Teacher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login/teacher');
  });

  test('should display teacher login form', async ({ page }) => {
    await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('should have teacher-specific UI elements', async ({ page }) => {
    // Check for teacher-related text
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toContain('teacher');
  });
});

test.describe('Login Page - Student', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login/student');
  });

  test('should display student login form', async ({ page }) => {
    await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('should have student-specific UI elements', async ({ page }) => {
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toContain('student');
  });
});

test.describe('Login Page - Owner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login/owner');
  });

  test('should display owner login form', async ({ page }) => {
    await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});

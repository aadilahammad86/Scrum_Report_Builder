import { test, expect } from '@playwright/test';

test.describe('Scrum Builder UI Verification', () => {

    test.beforeEach(async ({ page }) => {
        // Mock the Electron API bridge
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.addInitScript(() => {
            window.api = {
                exportFile: async (data) => {
                    console.log('MOCK exportFile:', data);
                    return 'C:/Fake/Path/To/Export.txt';
                },
                getHistory: async () => {
                    console.log('MOCK: getHistory called');
                    return [
                        {
                            filename: 'Work_Status_01-01-2025.txt',
                            dateStr: '01-01-2025',
                            path: '/mock/path/1',
                        },
                        {
                            filename: 'Work_Status_02-01-2025.txt',
                            dateStr: '02-01-2025',
                            path: '/mock/path/2',
                        }
                    ];
                },
                readWorklog: async (path) => {
                    if (path === '/mock/path/1') {
                        return `Work Status [01-01-2025]
===================
Yesterday
IN: 09:00 AM
OUT: 06:00 PM
BREAK: 01:00 PM - 02:00 PM
--------------------------------
* Task A
* Task B

Today
--------------------------------
* Task C
* Task D

Total Work Hours: 8h 0m
`;
                    }
                    return null;
                }
            };
        });

        await page.goto('http://localhost:5180');
    });

    test('should display Live Clock and Sidebar', async ({ page }) => {
        await expect(page.getByText('SCRUM BUILDER')).toBeVisible();
        await expect(page.locator('aside')).toBeVisible();
        await expect(page.getByText('History')).toBeVisible();
        // Check for mock history item
        await expect(page.getByText('01-01-2025')).toBeVisible();
    });

    test('should populate fields when history item is clicked', async ({ page }) => {
        // Click history item
        await page.getByText('01-01-2025').click();

        // Verification
        await expect(page.locator('input[type="time"]').first()).toHaveValue('09:00'); // IN time converted
        await expect(page.locator('textarea').first()).toContainText('Task A');
    });

    test('should handle Export - Stay on Current Day', async ({ page }) => {
        // Fill data
        await page.locator('input[type="time"]').first().fill('10:00');

        // Click Export
        await page.getByRole('button', { name: 'Export Report' }).click();

        // Check Modal
        const modal = page.locator('text=Export Work Log');
        await expect(modal).toBeVisible();

        // Click Stay
        await page.getByRole('button', { name: 'Stay on Current Day' }).click();

        // Verify Modal closed and Data remains
        await expect(modal).not.toBeVisible();
        await expect(page.locator('input[type="time"]').first()).toHaveValue('10:00');
    });

    test('should handle Export - Move to Next Day', async ({ page }) => {
        // Fill data
        await page.locator('input[type="time"]').first().fill('10:00');

        // Click Export
        await page.getByRole('button', { name: 'Export Report' }).click();

        // Click Next Day
        await page.getByRole('button', { name: 'Move to Next Day' }).click();

        // Verify Modal closed and Data CLEARED
        await expect(page.locator('text=Export Work Log')).not.toBeVisible();
        await expect(page.locator('input[type="time"]').first()).toHaveValue('');
    });

});

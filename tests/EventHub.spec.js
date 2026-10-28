import {test,expect} from '@playwright/test';
import 'dotenv/config';

const EMAIL = process.env.EVENTHUB_EMAIL?.trim();
const PASSWORD = process.env.EVENTHUB_PASSWORD?.trim();

const BASE_URL = 'https://eventhub.rahulshettyacademy.com';

async function login(page) {
    if (!EMAIL || !PASSWORD) {
        throw new Error('Missing EVENTHUB_EMAIL or EVENTHUB_PASSWORD. Configure both in GitHub repository secrets before running the workflow.');
    }

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('you@email.com').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);

    await page.getByRole('button', { name: 'Sign In' }).click();

    await Promise.race([
        page.waitForURL(/\/(events|$)/, { timeout: 15000 }),
        page.getByRole('link', { name: /Browse Events/i }).waitFor({ timeout: 15000 })
    ]).catch(() => {
        // keep the assertion below so Playwright shows the real UI state
    });

    await expect(page.getByRole('link', { name: /Browse Events/i })).toBeVisible({ timeout: 15000 });
}

test("create event via UI, book it, and verify seat reduction'", async ({ page }) => {
    await login(page);

    await page.goto(`${BASE_URL}/admin/events`);

    const eventTitle = `Test Event ${Date.now()}`;

    await page.locator('#event-title-input').fill(eventTitle);

    await page.getByPlaceholder('Describe the event…').fill('fill with nuts');

    await page.getByLabel('category').selectOption('Sports');
    await page.getByLabel('city').fill('chennai');

    await page.getByLabel('venue').fill('chennai venue');
    await page.getByLabel('Event Date & Time').fill('2028-08-06T10:00');

    await page.getByLabel('Price ($)').fill('5000');

    await page.getByLabel('Total Seats').fill('200');

    await page.getByPlaceholder('https://…').fill('https://eventhub.rahulshettyacademy.com/admin/events');

    await page.getByRole('button', { name: '+ Add Event' }).click();

    await expect(page.getByText('Event Created!')).toBeVisible();

    console.log(`created Event:"${eventTitle}"`);

    await page.goto(`${BASE_URL}/events`);

    const eventcard = await page.getByTestId('event-card');
    await expect(eventcard.first()).toBeVisible();

    const targetcard = eventcard.filter({ hasText: eventTitle }).first();
    await expect(targetcard).toBeVisible({ timeout: 5000 });

    const seatbeforebooking = parseInt(
        await targetcard.getByText('seats ').first().innerText()
    );

    console.log(`beforeseatbooking: ${seatbeforebooking}`);

    await targetcard.getByTestId('book-now-btn').click();

    const ticketcount = await page.locator('#ticket-count');
    await expect(ticketcount).toHaveText('1');

    await page.getByPlaceholder('Your full name').fill('test student');
    await page.getByTestId('customer-email').fill('soral94726@caps7.com');
    await page.getByLabel('Phone Number').fill('8943894348');

    const totalSection = page.getByText('Total', { exact: true }).locator('..');
    const totalPrice = totalSection.getByText('$5,000', { exact: true });

    console.log('Total price:', await totalPrice.innerText());

    await expect(totalPrice).toHaveText('$5,000');
    await page.getByRole('button', { name: 'Confirm Booking' }).click();

    await page.getByRole('button', { name: 'View My Bookings' }).click();

    const firstbooking = page.locator('.booking-ref').first();
    await expect(firstbooking).toBeVisible();
    console.log('Firstbook:', await firstbooking.innerText());

    const bookingid = page.getByTestId('booking-id').first();
    await expect(bookingid).toBeVisible();
    console.log('Bookingid :' + await bookingid.innerText());

    await page.goto(`${BASE_URL}/`);

    const updatedCard = page.getByTestId('event-card').filter({ hasText: eventTitle }).first();
    await expect(updatedCard).toBeVisible();

    const seatAfterBooking = parseInt(
        await updatedCard.getByText('seats ').first().innerText()
    );

    console.log(`Seats after booking: ${seatAfterBooking}`);

    expect(seatAfterBooking).toBe(seatbeforebooking - 1);
});

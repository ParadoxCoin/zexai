export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const data = await req.json();
    const { name, email, phone, address, amount, order } = data;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Resend API key is missing' }), { status: 500 });
    }

    const adminHtmlContent = `
      <h2>New Order Received!</h2>
      <p><strong>Order Type:</strong> ${order}</p>
      <p><strong>Amount Paid:</strong> ${amount}</p>
      <hr />
      <h3>Customer Delivery Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Address:</strong> ${address}</li>
      </ul>
      <p><small>ZexAI Automated System</small></p>
    `;

    const customerHtmlContent = `
      <h2>Order Confirmation - ZexAI</h2>
      <p>Dear ${name},</p>
      <p>Thank you for your purchase! We have successfully received your order and payment.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li><strong>Product:</strong> ${order}</li>
        <li><strong>Amount Paid:</strong> ${amount}</li>
      </ul>
      <p>We are currently processing your order and will contact you with further delivery details shortly.</p>
      <br/>
      <p>Best regards,<br/>The ZexAI Team</p>
    `;

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@zexai.io';

    const adminEmailPromise = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: process.env.ADMIN_EMAIL || 'info@zexai.io',
        subject: `New Order: ${order} - ${name}`,
        html: adminHtmlContent,
      }),
    });

    const customerEmailPromise = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email, // Send to the customer's email from the form
        subject: `Order Confirmation: ${order}`,
        html: customerHtmlContent,
      }),
    });

    // Fire both emails simultaneously
    const [adminRes, customerRes] = await Promise.all([adminEmailPromise, customerEmailPromise]);

    if (!adminRes.ok) {
      const errorText = await adminRes.text();
      throw new Error(`Resend Admin API Error: ${errorText}`);
    }
    if (!customerRes.ok) {
      const errorText = await customerRes.text();
      console.warn(`Resend Customer API Error: ${errorText}`); // Warn but don't fail the whole request
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Resend endpoint error:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

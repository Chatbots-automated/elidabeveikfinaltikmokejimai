import { Order } from './orderService';

interface TransactionRequest {
  amount: number;
  reference: string;
  email: string;
  returnUrl: string;
  cancelUrl: string;
  notificationUrl: string;
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;
}

interface TransactionResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  _links: {
    Pay?: { href: string };
    self?: { href: string };
  };
  payment_methods?: {
    other?: Array<{ name: string; url: string }>;
  };
}

const API_URL = 'https://api.maksekeskus.ee/v1/transactions';

export const createTransaction = async ({
  amount,
  reference,
  email,
  returnUrl,
  cancelUrl,
  notificationUrl,
  orderData
}: TransactionRequest): Promise<string> => {
  try {
    // Get user's IP address
    const ipResponse = await fetch('https://api64.ipify.org?format=json');
    const { ip } = await ipResponse.json();

    // Encode credentials
    const credentials = `${import.meta.env.VITE_MAKECOMMERCE_STORE_ID}:${import.meta.env.VITE_MAKECOMMERCE_SECRET_KEY}`;
    const encodedCredentials = btoa(credentials);

    // Create transaction request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedCredentials}`
      },
      body: JSON.stringify({
        transaction: {
          amount: amount.toFixed(2),
          currency: 'EUR',
          reference,
          merchant_data: `Order ID: ${reference}`,
          recurring_required: false,
          transaction_url: {
            return_url: { 
              url: returnUrl, 
              method: 'GET' 
            },
            cancel_url: { url: cancelUrl, method: 'GET' },
            notification_url: { url: notificationUrl, method: 'POST' },
          },
        },
        customer: {
          email,
          country: 'LT',
          locale: 'LT',
          ip,
          name: orderData.shipping.name,
          phone: orderData.shipping.phone,
          address: orderData.shipping.method === 'shipping' ? {
            street: orderData.shipping.address,
            city: orderData.shipping.city,
            postal_code: orderData.shipping.postalCode,
            country: 'LT'
          } : undefined
        },
        order: {
          reference,
          amount: amount.toFixed(2),
          currency: 'EUR',
          items: orderData.items.map(item => ({
            name: item.name,
            price: item.price.toFixed(2),
            quantity: item.quantity
          }))
        },
        app_info: {
          module: 'ÉLIDA',
          platform: 'React',
          platform_version: '1.0'
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Payment API Error:", errorData);
      throw new Error(errorData.message || "Failed to create transaction.");
    }

    const data: TransactionResponse = await response.json();

    // Extract payment URL
    if (data.payment_methods?.other?.length) {
      const paymentUrl = data.payment_methods.other.find(method => method.name === "redirect")?.url;
      if (paymentUrl) {
        return paymentUrl;
      }
    }

    throw new Error("Payment URL missing in response.");
  } catch (error) {
    console.error("Payment error:", error);
    throw new Error("Failed to create transaction.");
  }
};

export const verifyPayment = async (transactionId: string): Promise<boolean> => {
  try {
    const credentials = `${import.meta.env.VITE_MAKECOMMERCE_STORE_ID}:${import.meta.env.VITE_MAKECOMMERCE_SECRET_KEY}`;
    const encodedCredentials = btoa(credentials);

    const response = await fetch(`${API_URL}/${transactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedCredentials}`
      },
    });

    if (!response.ok) {
      throw new Error("Failed to verify payment.");
    }

    const data = await response.json();
    return data.status === 'completed';
  } catch (error) {
    console.error("Payment verification error:", error);
    throw error;
  }
};
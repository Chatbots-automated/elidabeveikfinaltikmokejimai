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

    // Prepare request data with null checks and defaults
    const requestData = {
      transaction: {
        amount: amount.toFixed(2),
        currency: 'EUR',
        reference,
        merchant_data: `Order ID: ${reference}`,
        recurring_required: false,
        transaction_url: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          notification_url: notificationUrl
        }
      },
      customer: {
        email: email || '',
        country: 'LT',
        locale: 'LT',
        ip,
        name: orderData?.shipping?.name || '',
        phone: orderData?.shipping?.phone || '',
        address: {
          street: orderData?.shipping?.method === 'shipping' ? orderData?.shipping?.address || '' : '',
          city: orderData?.shipping?.method === 'shipping' ? orderData?.shipping?.city || '' : '',
          postal_code: orderData?.shipping?.method === 'shipping' ? orderData?.shipping?.postalCode || '' : '',
          country: 'LT'
        }
      },
      order: {
        reference,
        amount: amount.toFixed(2),
        currency: 'EUR',
        items: (orderData?.items || []).map(item => ({
          name: item.name || 'Unknown Product',
          price: (item.price || 0).toFixed(2),
          quantity: item.quantity || 1
        }))
      },
      app_info: {
        module: 'ÉLIDA',
        platform: 'React',
        platform_version: '1.0'
      }
    };

    // Log request data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Payment Request Data:', JSON.stringify(requestData, null, 2));
    }

    // Make API request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedCredentials}`
      },
      body: JSON.stringify(requestData)
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🚨 Payment API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        requestData
      });
      throw new Error(errorData.message || `Payment request failed: ${response.statusText}`);
    }

    const data: TransactionResponse = await response.json();

    // Log successful response in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Payment Response:', JSON.stringify(data, null, 2));
    }

    // Extract payment URL
    if (data.payment_methods?.other?.length) {
      const paymentUrl = data.payment_methods.other.find(method => method.name === "redirect")?.url;
      if (paymentUrl) {
        return paymentUrl;
      }
    }

    throw new Error("Payment URL missing in response");
  } catch (error) {
    // Enhanced error logging
    console.error('❌ Payment Transaction Error:', {
      error,
      request: {
        amount,
        reference,
        email,
        returnUrl,
        cancelUrl,
        notificationUrl,
        orderData
      }
    });
    
    // Rethrow with more descriptive message
    throw new Error(
      error instanceof Error 
        ? `Payment transaction failed: ${error.message}`
        : 'Payment transaction failed'
    );
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
      const errorData = await response.json().catch(() => ({}));
      console.error('🚨 Payment Verification Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        transactionId
      });
      throw new Error(errorData.message || `Payment verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.status === 'completed';
  } catch (error) {
    console.error('❌ Payment Verification Error:', {
      error,
      transactionId
    });
    throw new Error(
      error instanceof Error 
        ? `Payment verification failed: ${error.message}`
        : 'Payment verification failed'
    );
  }
};
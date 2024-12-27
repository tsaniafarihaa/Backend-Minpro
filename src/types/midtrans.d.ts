declare module "midtrans-client" {
  namespace midtrans {
    class Snap {
      constructor(options: {
        isProduction: boolean;
        serverKey: string;
        clientKey: string;
      });

      createTransaction(
        parameter: SnapTransactionParams
      ): Promise<{ token: string }>;
    }
  }

  export = midtrans;
}

interface SnapTransactionParams {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: {
    first_name?: string;
    email?: string;
  };
  item_details?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
    category?: string;
  }>;
}

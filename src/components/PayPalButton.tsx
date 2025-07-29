import { useEffect } from 'react';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalButtonProps {
  tokenAmount: number;  // Number of tokens to purchase
  onSuccess: (details: any, tokenAmount: number) => void;
  onError: (error: any) => void;
}

const TOKEN_PRICE_USD = 175; // Price per token in USD

const PayPalButton = ({ tokenAmount, onSuccess, onError }: PayPalButtonProps) => {
  const totalAmount = tokenAmount * TOKEN_PRICE_USD;

  useEffect(() => {
    const loadPayPalScript = async () => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=ATtmXNQePpJ_y9VEUk8X0I3XOzq8SdsR83qf87bkBOATfaylIKXaXpdwqKA-bg1J3rzp7JxtA8ceOseH&currency=USD`;
      script.async = true;

      script.onload = () => {
        if (window.paypal) {
          window.paypal.Buttons({
            createOrder: (data: any, actions: any) => {
              // Convert token amount to a string with maximum 5 decimal places
              const formattedTokenAmount = tokenAmount.toFixed(5);
              const formattedTotalAmount = totalAmount.toFixed(2);

              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    description: `Purchase ${formattedTokenAmount} RentCoin Token${tokenAmount !== 1 ? 's' : ''}`,
                    amount: {
                      currency_code: "USD",
                      value: formattedTotalAmount,
                      breakdown: {
                        item_total: {
                          currency_code: "USD",
                          value: formattedTotalAmount
                        }
                      }
                    },
                    items: [
                      {
                        name: "RentCoin Token",
                        description: `${formattedTokenAmount} RentCoin Token${tokenAmount !== 1 ? 's' : ''} @ $175 each`,
                        unit_amount: {
                          currency_code: "USD",
                          value: formattedTotalAmount
                        },
                        quantity: "1"
                      }
                    ]
                  }
                ]
              });
            },
            onApprove: async (data: any, actions: any) => {
              try {
                const details = await actions.order.capture();
                onSuccess(details, tokenAmount);
              } catch (error) {
                console.error("PayPal capture error:", error);
                onError(error);
              }
            },
            onError: (err: any) => {
              console.error("PayPal button error:", err);
              onError(err);
            },
            onCancel: (data: any) => {
              console.log("Payment cancelled by user");
              onError(new Error("Payment cancelled"));
            }
          }).render('#paypal-button-container');
        }
      };

      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    };

    loadPayPalScript();
  }, [tokenAmount, totalAmount, onSuccess, onError]);

  return (
    <div>
      <div className="mb-4 text-gray-400">
        <p>Total Cost: ${totalAmount.toFixed(2)} USD</p>
        <p>You will receive: {tokenAmount.toFixed(5)} Token{tokenAmount !== 1 ? 's' : ''}</p>
      </div>
      <div id="paypal-button-container" className="w-full max-w-md mx-auto"></div>
    </div>
  );
};

export default PayPalButton; 
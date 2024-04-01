
    require('dotenv').config()

    const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_BASEURL } = process.env;
    async function generateAccessToken(){      
      try {
        if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
          throw new Error("MISSING_API_CREDENTIALS");
        }
        const auth = Buffer.from(
          PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
        ).toString("base64");
        const response = await fetch(`${PAYPAL_BASEURL}/v1/oauth2/token`, {
          method: "POST",
          body: "grant_type=client_credentials",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        });
        
        const data = await response.json();
        
        return data.access_token;
      } catch (error) {
        console.error("Failed to generate Access Token:", error);
      }
    }
    async function createOrder(){      
      const accessToken = await generateAccessToken();
      const url = `${PAYPAL_BASEURL}/v2/checkout/orders`;
      const payload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: "1.00",
            },
          },
        ],
      };
      
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
          // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
          // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
          // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
          // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
        },
        method: "POST",
        body: JSON.stringify(payload),
      });      
      return handleResponse(response);
    }

    const captureOrder = async (orderID) => {
        const accessToken = await generateAccessToken();
        const url = `${PAYPAL_BASEURL}/v2/checkout/orders/${orderID}/capture`;      

        
        const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
            // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
            // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
            // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
            // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
        },
        });
        
        return handleResponse(response);
    };

    const refundTransaction = async (transactionId) => {
      console.log(`Requesting paypal API refund for ${transactionId}`)
      
      const accessToken = await generateAccessToken();
      const url = `${PAYPAL_BASEURL}/v2/payments/captures/${transactionId}/refund`;
      console.log(`At url: ${url}`)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,        
        }}
      );
      return handleResponse(response);
    }
    
    
    async function handleResponse(response) {
        try {
          const jsonResponse = await response.json();
          return {
            jsonResponse,
            httpStatusCode: response.status,
          };
        } catch (err) {
          const errorMessage = await response.text();
          throw new Error(errorMessage);
        }
      }
    

module.exports = {generateAccessToken, createOrder, captureOrder, refundTransaction}
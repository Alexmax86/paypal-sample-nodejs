
const ApiCaller = {
    createOrder: async ({productId, quantity}) => {        
                
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            // use the "body" param to optionally pass additional order information
            // like product ids and quantities
            body: JSON.stringify({
              cart: [
                {
                  id: "YOUR_PRODUCT_ID",
                  quantity: "YOUR_PRODUCT_QUANTITY",
                },
              ],
            }),
          });
          
          const orderData = await response.json();
          return orderData
          
    }

    

    
}
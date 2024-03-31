window.paypal
  .Buttons({
    //CREATE ORDER: CREATE ORDER ON PAYPAL'S SIDE. CUSTOMER WILL HAVE TO LOGIN TO CONFIRM
    async createOrder() {
      try {
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
        
        if (orderData.id) {
          return orderData.id;
        } else {
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail
            ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
            : JSON.stringify(orderData);
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      }
    },
    //ONAPPROVE: TRIGGERS WHEN CAPTURE IS CONFIRMED
    async onApprove(data, actions) {
      try {
        const response = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        const orderData = await response.json();
        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message
        
        const errorDetail = orderData?.details?.[0];
        
        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
          return actions.restart();
        } else if (errorDetail) {
          // (2) Other non-recoverable errors -> Show a failure message
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          // (3) Successful transaction -> Show confirmation or thank you message
          // Or go to another URL:  actions.redirect('thank_you.html');
          const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] 
            /*Commenting out this line because this implementation is not design for authorizations
            || orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
            */

            console.log(orderData)
          modalController({
            title:"Thanks for your purchase", 
            caption: `Transaction ${transaction.status}: ${transaction.id}. If you are not happy with this purchase you may refund it using the button below.`,
            transactionID: transaction.id
          })
          console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2),
          );
        }
      } catch (error) {
        console.error(error);
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`,
        );
      }
    },
  })
  .render("#paypal-button-container");
  
// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  container.innerHTML = message;
}


const myModal = new bootstrap.Modal(document.getElementById('myModal'), {
  keyboard: false
})

function modalController({title, caption, transactionID}){  
  //Initialize modal
  refundButton = document.getElementById("refund-button")
  modalTitle = document.getElementById("modal-title")
  modalBody = document.getElementById("modal-body")  
  refundSpinner = document.getElementById("refund-spinner")  
  modalTitle.textContent=title
  modalBody.textContent=caption
  myModal.show()
  
  //If transactionID is provided, refund button is shown
  if (transactionID){
    refundButton.style.display="block"
    refundButton.onclick = async () => {
      refundSpinner.style.display="block"
      refundButton.setAttribute('disabled', 'true')
      refundTransaction(transactionID)
    }
  }
  else {
    refundButton.style.display="none";
    refundButton.onclick= undefined;
  }
}


async function refundTransaction(transactionID){
  console.log(`Requesting paypal refund for transaction ${transactionID}`)
  try {
    const response = await fetch(`/api/refund/${transactionID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const parsedResponse = await response.json()
    return parsedResponse
    console.log(parsedResponse)
  }
  catch(error) {
  console.error(error);
  resultMessage(
    `Sorry, your transaction could not be refunded...<br><br>${error}`,
  );
  }
}

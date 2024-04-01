//********************************************************************************
//This modal confirms successful payments to the user 
//and gives option to refund(or re-try failed refunds)
//******************************************************************************** */
const modalController = {
  //Initialize references to HTML elements
  modal: new bootstrap.Modal(document.getElementById('myModal'), {keyboard: false}),
  refundButton: document.getElementById("refund-button"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body")  ,
  refundSpinner: document.getElementById("refund-spinner"),  
  
  //Functions
  showDialogue: function({title, caption}){        
    this.resetComponents()
    this.modalTitle.textContent=title
    this.modalBody.textContent=caption
    this.refundButton.style.display='none'
    this.modal.show()
  },
  showDialogueRefund: function({title, caption, transactionID}){
    this.resetComponents() 
    this.modalTitle.textContent=title
    this.modalBody.textContent=caption
    this.refundButton.style.display='block'
    this.modal.show()
    
    this.refundButton.onclick = async () => { 
      debugger;          
      this.refundSpinner.style.display="block"
      this.refundButton.setAttribute('disabled', 'true')
      try {
        const response = await refundTransaction(transactionID)
        console.log(response)
        if (response.status === 'COMPLETED'){
          this.showDialogue({title:"Transaction refunded", caption:`The transaction was correctly refunded. Refund ID: ${response.id}`})}
        //Cover the case in which the status is different than COMPLETED 
        else if(response.status !== 'COMPLETED' && response.status_details?.reason) {
          this.showDialogueRefund({
            title:"Error", 
            caption:`The refund may not be complete. STATUS: ${response.status}: ${response.status_details.reason} `,
            transactionID: transactionID
          })
        }
        //Cover the case API returns error (unprocessable entity and the like)
        else if(response.details[0].description){
          this.showDialogueRefund({
            title:"Error", 
            caption:`An error has occurred, you may try the refund again. If the error persists, please contact the merchant. ERROR: ${response.details[0].description} `,
            transactionID: transactionID
          })
        }
        //Cover any other unpredicted error
        else{
          throw new Error(response);
        }
      } catch(e){
        console.log(e);
        this.showDialogue({title:"Error", caption: "An error has occurred. Please contact the merchant for support."})
      }
    }
  },
  resetComponents: function(){
    this.modalTitle.textContent=""
    this.modalBody.textContent=""
    this.refundButton.style.display='none'
    this.refundSpinner.style.display='none'
    this.refundButton.removeAttribute('disabled');
  }
}

//********************************************************************************
//Reference to Paypal SDK to render buttons. Some customization are applied to 
//adapt integrate it to the Website UI
//******************************************************************************** */
window.paypal
  .Buttons({
    //CREATE ORDER: CREATE ORDER ON PAYPAL'S SIDE. CUSTOMER WILL HAVE TO LOGIN TO CONFIRM
    async createOrder() {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          }
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
        debugger;
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
            /*Commenting out this line because this implementation is not designed for authorizations
            || orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
            */

            console.log(orderData)
          modalController.showDialogueRefund({
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
        modalController.showDialogue({
          title:"Error",
          caption:`Sorry, your transaction could not be processed. Error: ${error}`
        })
      }
    },
    onCancel: function (data) {
      // Show a cancel page or return to cart
      modalController.showDialogue({title:"Warning", caption:"The payment was cancelled."})
    },
    style: {
      layout:  'vertical',
      color:   'gold',
      shape:   'rect',
      label:   'paypal'
    }
  })
  .render("#paypal-button-container");
  

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
  }
  catch(error) {  
    throw new Error(error);
  }
}

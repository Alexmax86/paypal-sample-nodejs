const express = require('express')
const PayPalController = require('./paypalcontroller')
const app = express()
require('dotenv').config()

app.use(express.static('static'))
app.use(express.json());

//Endpoint to create orders
app.post("/api/orders", async (req, res) => {
  try {    
    const { jsonResponse, httpStatusCode } = await PayPalController.createOrder();
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

//Endpoint to capture payment
app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {    
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await PayPalController.captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);    
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

//Endpoint to refund transaction
app.post("/api/refund/:transactionID", async(req, res) =>{
  try {
    const {transactionID} = req.params  
    console.log(`Received refund request for order id: ${transactionID}`)
    const { jsonResponse, httpStatusCode } = await PayPalController.refundTransaction(transactionID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
}
)

app.listen(process.env.PORT, () => {
  console.log(`Paypal Sandbox app listening on port ${process.env.PORT}`)
})
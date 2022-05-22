const express = require("express")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config()
const app = express()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_KEY)

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.52sp4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req,res,next){
  const authHeader = req.headers.authorization
  if(!authHeader){
    return res.status(401).send({message:"unAuthorized access"})
  }
  const token = authHeader.split(" ")[1]
  jwt.verify(token,process.env.JSON_KEY,(error,decoded)=>{
    if(error){
      return res.status(403).send({message:"forbidden access"})
    }
    req.decoded = decoded;
    next()
  })

}
async function run() {
  try {
    await client.connect();

    const carShop = client.db("Car_Shop").collection("Parts");
    const carShopUser = client.db("Car_Shop").collection("user");
    const carShopOrder = client.db("Car_Shop").collection("order");

    // payment api
    app.post("/create-payment-intent", verifyJwt,async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
    
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency: "usd",
        "payment_method_types": ["card"]
      
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // payment for booking
    app.get('/payment/:id',verifyJwt,async(req,res)=>{
      const id = req.params.id;
      const filter = {_id:ObjectId(id)}
      const result = await carShopOrder.findOne(filter);
      res.send(result)
    })
    // get order for specific person
    app.get('/orders/:email',verifyJwt,async(req,res)=>{
      const email = req.params.email;
      const filter = {email:email};
      const query = carShopOrder.find(filter);
      const result = await query.toArray();
      res.send(result)
    })
    // order get api
    app.post('/orders',async(req,res)=>{
      const order = req.body;
      const result = await carShopOrder.insertOne(order)
      res.send(result)
    })
    // all parts
    app.get('/parts',async(req,res)=>{
      const result = await carShop.find().toArray()
      res.send(result)
    })

    // get specific user
    app.get('/parts/:id',async(req,res)=>{
      const id = req.params.id;
      console.log(id);
      const filter = {_id:ObjectId(id)};
      const result = await carShop.findOne(filter);
      res.send(result)
    })

    // storage user
    app.put("/users/:email",async (req,res)=>{
      const email = req.params.email;
      const user = req.body
      const filter = {email : email}
      const option = {upsert:true}
      const updateDoc = {
        $set:user
      }
      const result = await carShopUser.updateOne(filter,updateDoc,option)
      const token = jwt.sign({email:email},process.env.JSON_KEY,{
         expiresIn: '1d' 
      })
      res.send({result,token})
    })

  } finally {
    
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send("assignment 12")
})
app.listen(port,()=>{
    console.log(`assignment 12 ${port}`);
})
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_KEY);

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.52sp4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JSON_KEY, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();

    const carShop = client.db("Car_Shop").collection("Parts");
    const carShopUser = client.db("Car_Shop").collection("user");
    const carShopOrder = client.db("Car_Shop").collection("order");
    const carShopPayment = client.db("Car_Shop").collection("paid");
    const carShopReview = client.db("Car_Shop").collection("review");

    const verifyAdmin = async (req,res,next) =>{
      const decoded = req.decoded.email;
      const filter = {email:decoded}
      const admin = await carShopUser.findOne(filter)
      if(admin.role === "admin"){
        next()
      }
      else{
        return res.status(403).send({ message: "forbidden access" });
      }
    }

    // delete single orders api 
    app.delete("/all-orders/:id",async(req,res)=>{
      const id =req.params.id;
      const filter ={_id:ObjectId(id)}
      const result = await carShopOrder.deleteOne(filter)
      res.send(result)
    })
    // updated status all orders api
    app.put("/all-orders/:id",verifyJwt,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const filter={_id:ObjectId(id)}
      const updatedDoc={
        $set:{
          status:true
        }
      }
      const result = await carShopOrder.updateOne(filter,updatedDoc);
      res.send(result)

    })
    // all order api
    app.get("/all-orders",verifyJwt,verifyAdmin,async(req,res)=>{
      const result = await carShopOrder.find().toArray();
      res.send(result)
    })
    // delete api all product
    
    app.delete("/all-products/:id",verifyJwt,verifyAdmin,async (req,res)=>{
      const id = req.params.id
      const filter = {_id:ObjectId(id)}
      const result = await carShop.deleteOne(filter)
      res.send(result)
    })


    // update quantity  all product
    app.put('/all-products/:id',verifyJwt,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const available = req.body;
      const filter = {_id:ObjectId(id)};
      const updatedDoc={
        $set:available
      }
      const result = await carShop.updateOne(filter,updatedDoc);
      res.send(result)
    })
    // get parts api

    app.get("/all-products",verifyJwt,verifyAdmin,async(req,res)=>{
      const result = await carShop.find().toArray();
      res.send(result)
    })
   // post parts api 
   app.post("/parts",verifyJwt,verifyAdmin,async(req,res)=>{
     const service = req.body;
     const result = await carShop.insertOne(service);
     res.send(result)
   })  
    // secure admin page  ,,
    app.get('/admin/:email',verifyJwt,async(req,res)=>{
      const email = req.params.email;
      const admin = await carShopUser.findOne({email:email})
      const isAdmin = admin.role === "admin"
      res.send(isAdmin)
    })
    // make admin api
    app.put('/user/admin/:email',verifyJwt,verifyAdmin,async(req,res) =>{
      const email = req.params.email;
      const filter ={email:email};
      const updatedDoc ={
        $set:{
          role:"admin"
        }
      }
      const result = await carShopUser.updateOne(filter,updatedDoc);
      res.send(result)
    })
    // remove admin 
    app.patch('/user/admin/:email',verifyJwt,verifyAdmin,async(req,res) =>{
      const email = req.params.email;
      const filter ={email:email};
      const updatedDoc ={
        $set:{
          role:""
        }
      }
      const result = await carShopUser.updateOne(filter,updatedDoc);
      res.send(result)
    })
    // all user 
    app.get('/all-user',verifyJwt,async(req,res)=>{
      const result = await carShopUser.find().toArray()
      res.send(result)
    })
    
    // get user information
    app.get("/users/:email", verifyJwt, async (req, res) => {
      const decoded = req.decoded.email;
      const email = req.params.email;
      if (decoded === email) {
        const filter = { email: email };
        const query = await carShopUser.findOne(filter);
        res.send(query);
      }
      else{
        return res.status(403).send({ message: "forbidden access" });
      }
    });
    // user information update
    app.patch("/users/:email",verifyJwt, async (req, res) => {
      const email = req.params.email;
      const updateUser = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: updateUser,
      };
      const result = await carShopUser.updateOne(filter, updatedDoc, options);
      res.send(result);
    });
    // get review
    app.get("/reviews", async (req, res) => {
      const result = (await carShopReview.find().toArray()).reverse();
      res.send(result);
    });
    // post review
    app.post("/reviews", verifyJwt, async (req, res) => {
      const review = req.body;
      const result = await carShopReview.insertOne(review);
      res.send(result);
    });
    // payment api
    app.post("/create-payment-intent", verifyJwt, async (req, res) => {
      const service = req.body;
      const price = service.price;
      if (price) {
        const amount = price * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });

    // payment for booking
    app.get("/payment/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await carShopOrder.findOne(filter);
      res.send(result);
    });
    // update order
    app.patch("/orders/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const payment = req.body;
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const paid = await carShopPayment.insertOne(payment);
      const result = await carShopOrder.updateOne(filter, updatedDoc);
      res.send({ result, paid });
    });
    // order cancel api
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await carShopOrder.deleteOne(filter);
      res.send(result);
    });
    // get order for specific person
    app.get("/orders/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const decoded = req.decoded.email;
      if (decoded === email) {
        const filter = { email: email };
        const query = carShopOrder.find(filter);
        const result = await query.toArray();
        res.send(result);
      }
      else{
        return res.status(403).send({ message: "forbidden access" });
      }
    });
    // order get api
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await carShopOrder.insertOne(order);
      res.send(result);
    });
    // all parts
    app.get("/parts", async (req, res) => {
      const result = await carShop.find().toArray();
      res.send(result);
    });

    // get specific user
    app.get("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await carShop.findOne(filter);
      res.send(result);
    });

    // storage user
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await carShopUser.updateOne(filter, updateDoc, option);
      const token = jwt.sign({ email: email }, process.env.JSON_KEY, {
        expiresIn: "1d",
      });
      res.send({ result, token,message:"hello" });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("assignment 12");
});
app.listen(port, () => {
  console.log(`assignment 12 ${port}`);
});

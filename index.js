const express = require("express")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config()
const app = express()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.52sp4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();

    const carShop = client.db("Car_Shop").collection("Parts");
    const carShopUser = client.db("Car_Shop").collection("user");
    const carShopOrder = client.db("Car_Shop").collection("order");


    // order api
    app.post('/orders',async(req,res)=>{
      const order = req.body;
      console.log(order);
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
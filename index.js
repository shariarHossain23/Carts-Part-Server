const express = require("express")
const cors = require("cors")
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config()
const app = express()
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

    // all parts
    app.get('/parts',async(req,res)=>{
      const result = await carShop.find().toArray()
      res.send(result)
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
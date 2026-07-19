const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.get('/', (req, res) => {
  res.send('Hello World!')
})




const uri = process.env.MONGODB_URL;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();


    const database = client.db("beautyVault");

    const brandCollection = database.collection("brands");
    const productCollection = database.collection("products");

// GET APIS

    app.get('/products', async (req, res) => {
      const query = {};
      if (req.query.createdBy) {
        query.createdBy = req.query.createdBy;
      }
      const cursor = productCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/brands', async (req, res) => {
      try {
        const brands = await brandCollection.find({}).toArray();
        if (brands.length === 0) {
          // Aggregate brands from products if brands collection is empty
          const pipeline = [
            {
              $group: {
                _id: "$brandName",
                totalProducts: { $sum: 1 },
                brandLogo: { $first: "$productImage" }
              }
            }
          ];
          const aggregated = await productCollection.aggregate(pipeline).toArray();
          const formatted = aggregated.map(item => ({
            brandName: item._id || 'Unknown Brand',
            totalProducts: item.totalProducts,
            brandLogo: item.brandLogo || 'https://images.unsplash.com/photo-1522337788-75e7a9f7e8ba?auto=format&fit=crop&q=80&w=200&h=200'
          }));
          res.send(formatted);
        } else {
          res.send(brands);
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
        res.status(500).send({ error: 'Failed to fetch brands' });
      }
    });

    app.get('/single-product/:id', async (req, res) => {
      const { id } = req.params;
      // console.log(req.params)
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // POST APIS

    app.post('/upload-product', async (req, res) => {
      const data = req.body;
      // console.log(data);
      const result = await productCollection.insertOne({
        ...data,
        status: 'pending'
      })
      res.send(result);
    });

    // PATCH APIS


    app.patch('/edit-product/:id',  async (req, res) => {
      const { id } = req.params;
      const updateProduct = req.body;
      // console.log(updateData);
      const result = await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateProduct }
      );
      // console.log(result);
      res.send(result);
    });

    // DELETE APIS

     app.delete('/delete-product/:id',  async (req, res) => {
      const { id } = req.params;
      const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    })




    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
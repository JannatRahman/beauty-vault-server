import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const database = client.db("beautyVault");
const brandCollection = database.collection("brands");
const productCollection = database.collection("products");

const auth = betterAuth({
  database: mongodbAdapter(database),
});

const verifyToken = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });
    if (!session) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    req.session = session;
    next();
  } catch (error) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
};

// GET APIS

app.get('/products', async (req, res) => {
  try {
    const query = {};
    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy;
    }
    const cursor = productCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
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
  try {
    const { id } = req.params;
    const query = { _id: new ObjectId(id) };
    const result = await productCollection.findOne(query);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// POST APIS

app.post('/upload-product', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const result = await productCollection.insertOne({
      ...data,
      status: 'pending'
    });
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// PATCH APIS

app.patch('/edit-product/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateProduct = req.body;
    const result = await productCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateProduct }
    );
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// DELETE APIS

app.delete('/delete-product/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Vercel needs the app to be exported
export default app;

// Only start the server locally (Vercel will manage it automatically)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
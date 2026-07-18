const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient("mongodb://BeautyVault:EPHkTDQ1nR2E1qgw@ac-q3n4nqa-shard-00-00.erd7kb0.mongodb.net:27017,ac-q3n4nqa-shard-00-01.erd7kb0.mongodb.net:27017,ac-q3n4nqa-shard-00-02.erd7kb0.mongodb.net:27017/?ssl=true&replicaSet=atlas-s39w7z-shard-0&authSource=admin&appName=Cluster0");
  try {
    await client.connect();
    const db = client.db("beautyVault");
    const products = await db.collection("products").find({}).limit(3).toArray();
    console.log("SAMPLE PRODUCTS:", JSON.stringify(products, null, 2));
    const brands = await db.collection("brands").find({}).limit(3).toArray();
    console.log("SAMPLE BRANDS:", JSON.stringify(brands, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();

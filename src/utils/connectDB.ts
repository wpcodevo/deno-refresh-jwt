import { MongoClient } from "../deps.ts";

const dbUri = Deno.env.get("MONGODB_URI") as unknown as string;
const dbName = Deno.env.get("MONGO_INITDB_DATABASE") as unknown as string;

const client: MongoClient = new MongoClient();
await client.connect(dbUri);
console.log("🚀 Connected to MongoDB Successfully");

export const db = client.database(dbName);

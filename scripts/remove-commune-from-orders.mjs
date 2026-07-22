import { connectDB } from '../lib/mongodb.js';
import Order from '../lib/models/Order.js';

async function main() {
  await connectDB();
  const result = await Order.updateMany({}, { $unset: { commune: '' } });
  console.log(`Removed commune from ${result.modifiedCount} order document(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

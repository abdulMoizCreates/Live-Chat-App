// creates 3 demo users for the demo / submission.
// run from server/:  npm run seed
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/livechat";
const DEMO = [
  { username: "ali", password: "secret1" },
  { username: "sara", password: "secret1" },
  { username: "bilal", password: "secret1" },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const User = require("./models/User");
  const Conversation = require("./models/Conversation");
  const Message = require("./models/Message");

  for (const { username, password } of DEMO) {
    // rerun-safe: recreate the demo account with its chat data wiped
    const old = await User.findOne({ username });
    if (old) {
      const convIds = await Conversation.find({ participants: old._id }).distinct("_id");
      await Message.deleteMany({ conversation: { $in: convIds } });
      await Conversation.deleteMany({ participants: old._id });
      await User.deleteOne({ _id: old._id });
      console.log("recreated demo user:", username);
    } else {
      console.log("added demo user:", username);
    }

    await User.create({
      username,
      password: await bcrypt.hash(password, 10),
    });
  }

  console.log("done. all demo users use the password: secret1");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err.message);
  process.exit(1);
});

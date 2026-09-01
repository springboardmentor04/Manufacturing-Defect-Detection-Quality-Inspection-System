import mongoose from "mongoose";
import { ENV } from "./_core/env";

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  passwordHash: string | null;
  role: "user" | "admin" | "quality_engineer" | "factory_supervisor" | "production_manager";
  accountStatus: "active" | "disabled";
  credentialSessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export type InsertUser = Partial<Omit<User, 'openId'>> & { openId: string };

const connectionString = ENV.mongodbUri || process.env.MONGODB_URI;

let _connected = false;

export async function getDb() {
  if (!_connected) {
    if (!connectionString) {
      throw new Error("MONGODB_URI is required to connect to MongoDB");
    }
    try {
      await mongoose.connect(connectionString);
      _connected = true;
      console.log("[MongoDB] Connected successfully");
    } catch (error) {
      console.error("[MongoDB] Connection failed:", error);
      throw error;
    }
  }
  return mongoose.connection;
}

// Counter schema for generating sequential numeric user IDs
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

async function getNextSequenceValue(sequenceName: string): Promise<number> {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.seq;
}

// User schema matching original Drizzle structure with explicit String primary key _id
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: Number, unique: true },
  openId: { type: String, required: true, unique: true },
  name: { type: String, default: null },
  email: { type: String, unique: true, sparse: true, default: null },
  loginMethod: { type: String, default: null },
  passwordHash: { type: String, default: null },
  role: {
    type: String,
    enum: ["user", "admin", "quality_engineer", "factory_supervisor", "production_manager"],
    default: "user"
  },
  accountStatus: {
    type: String,
    enum: ["active", "disabled"],
    default: "active"
  },
  credentialSessionVersion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastSignedIn: { type: Date, default: Date.now }
}, { _id: false });

// Pre-save hook to populate sequential numeric ID and default _id to openId on new users
UserSchema.pre("save", async function () {
  const doc = this as any;
  if (!doc._id && doc.openId) {
    doc._id = doc.openId;
  }
  if (doc.isNew && typeof doc.id !== "number") {
    doc.id = await getNextSequenceValue("userId");
  }
  doc.updatedAt = new Date();
});

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

export * from "./models";


export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  await getDb();

  const updateSet: Record<string, any> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      updateSet[field] = user[field] ?? null;
    }
  });

  if (user.lastSignedIn !== undefined) {
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    updateSet.lastSignedIn = new Date();
  }

  if (user.role !== undefined) {
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    updateSet.role = "admin";
  }

  const existingUser = await User.findOne({ openId: user.openId });
  if (existingUser) {
    await User.updateOne({ openId: user.openId }, { $set: updateSet });
  } else {
    const newUser = new User({
      _id: user.openId,
      openId: user.openId,
      ...updateSet
    });
    await newUser.save();
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  await getDb();
  const user = await User.findOne({ openId });
  return user ? (user.toObject() as User) : undefined;
}

export async function getCredentialUserByEmail(email: string): Promise<User | undefined> {
  await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const escapeRegex = (text: string) => text.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const user = await User.findOne({
    email: { $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i") }
  });
  return user ? (user.toObject() as User) : undefined;
}

export async function getCredentialUserById(id: number): Promise<User | undefined> {
  await getDb();
  const user = await User.findOne({ id });
  return user ? (user.toObject() as User) : undefined;
}

export type CredentialRole = "quality_engineer" | "factory_supervisor";

export async function createCredentialUser(input: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: CredentialRole;
}): Promise<User> {
  await getDb();
  const newUser = new User({
    _id: input.openId,
    openId: input.openId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passwordHash,
    loginMethod: "credentials",
    role: input.role,
    accountStatus: "active",
    credentialSessionVersion: 0,
    lastSignedIn: new Date()
  });
  await newUser.save();
  return newUser.toObject() as User;
}

export async function addCredentialPassword(userId: number, passwordHash: string): Promise<User> {
  await getDb();
  const user = await User.findOneAndUpdate(
    { id: userId },
    { $set: { passwordHash } },
    { new: true }
  );
  if (!user) throw new Error("Credential password could not be added");
  return user.toObject() as User;
}

export async function recordCredentialSignIn(userId: number): Promise<void> {
  await getDb();
  await User.updateOne({ id: userId }, { $set: { lastSignedIn: new Date() } });
}

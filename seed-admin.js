import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'riseup4';

async function seedAdminUser() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    // Check if admin user already exists
    const existingAdmin = await usersCollection.findOne({
      email: 'sajag.guitar@gmail.com'
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      return;
    }

    // Hash the password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash('hello123', 10);

    // Create admin user
    const adminUser = {
      name: 'Admin User',
      email: 'sajag.guitar@gmail.com',
      role: 'admin',
      passwordHash: hashedPassword,
      avatarUrl: '',
      subscriptions: [],
      favorites: {
        artists: [],
        songs: [],
        events: []
      },
      playlists: [],
      following: [],
      adPreference: {
        personalized: true,
        categories: []
      },
      plan: {
        type: 'FREE'
      },
      createdAt: new Date(),
      lastLogin: new Date()
    };

    console.log('Creating admin user...');
    const result = await usersCollection.insertOne(adminUser);

    console.log('✅ Admin user created successfully!');
    console.log('User ID:', result.insertedId);
    console.log('Email: sajag.guitar@gmail.com');
    console.log('Password: hello123');
    console.log('Role: admin');

  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

// Run the seeding function
seedAdminUser().catch(console.error);

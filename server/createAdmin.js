const mongoose = require('mongoose');
const User = require('./src/models/User');
const Profile = require('./src/models/Profile');
const dotenv = require('dotenv');

dotenv.config();

const createAdmin = async () => {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/startuphub';
    await mongoose.connect(dbUri);
    console.log('DB Connected successfully to:', dbUri);

    const email = 'admin@test.com';
    let adminUser = await User.findOne({ email });

    if (!adminUser) {
      adminUser = new User({
        email,
        password: 'Password123',
        role: 'admin',
        isEmailVerified: true
      });
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      adminUser.role = 'admin';
      adminUser.password = 'Password123'; // Hashed by userSchema pre-save hook
      await adminUser.save();
      console.log('Admin user role updated to admin');
    }

    let adminProfile = await Profile.findOne({ user: adminUser._id });
    if (!adminProfile) {
      await Profile.create({
        user: adminUser._id,
        fullName: 'System Administrator',
        headline: 'Managing StartupHub AI Platform',
        bio: 'Official administrative profile for StartupHub AI.'
      });
      console.log('Admin profile created successfully');
    }

    console.log('Administrative setup finished!');
    process.exit(0);
  } catch (err) {
    console.error('Setup failure:', err.message);
    process.exit(1);
  }
};

createAdmin();

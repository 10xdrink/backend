require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const logger = require('./utils/logger');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

const updateUsers = async () => {
  try {
    // Find all users without lastActivity field
    const usersToUpdate = await User.find({ lastActivity: { $exists: false } });
    
    console.log(`Found ${usersToUpdate.length} users without lastActivity field`);
    
    // Update each user
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      user.lastActivity = new Date();
      await user.save();
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount} users so far...`);
      }
    }
    
    console.log(`Successfully updated lastActivity for ${updatedCount} users`);
    logger.info(`Successfully updated lastActivity for ${updatedCount} users`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
    
  } catch (error) {
    console.error('Error updating users:', error);
    logger.error(`Error updating users: ${error.message}`);
    process.exit(1);
  }
};

// Run the update function
updateUsers(); 
// fixInfluencerUserLinks.js
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Import required models
const Influencer = require('./models/Influencer');
const InfluencerUser = require('./models/InfluencerUser');

// Function to repair influencer and user links
async function repairInfluencerUserLinks() {
  try {
    // 1. Find all approved influencers
    const approvedInfluencers = await Influencer.find({ status: 'approved' });
    console.log(`Found ${approvedInfluencers.length} approved influencers`);
    
    // 2. Find all influencer users
    const allUsers = await InfluencerUser.find();
    console.log(`Found ${allUsers.length} influencer user accounts`);
    
    // 3. Identify influencers without users
    const influencersWithoutUsers = approvedInfluencers.filter(inf => !inf.user);
    console.log(`Found ${influencersWithoutUsers.length} approved influencers without user references`);
    
    // 4. Identify users without linked influencers
    const usersWithoutInfluencers = [];
    for (const user of allUsers) {
      const linkedInfluencer = approvedInfluencers.find(inf => 
        inf.user && inf.user.toString() === user._id.toString()
      );
      if (!linkedInfluencer) {
        usersWithoutInfluencers.push(user);
      }
    }
    console.log(`Found ${usersWithoutInfluencers.length} users without linked influencers`);
    
    // 5. Try to match users to influencers based on email
    let matchedCount = 0;
    
    // First, link existing users to approved applications
    for (const influencer of influencersWithoutUsers) {
      // Find a user with matching email
      const matchingUser = allUsers.find(user => user.email === influencer.email);
      
      if (matchingUser) {
        console.log(`Matching user found for ${influencer.email}`);
        
        // Update the influencer's user reference
        influencer.user = matchingUser._id;
        await influencer.save();
        
        // Update the user's applicationId if needed
        if (!matchingUser.applicationId) {
          matchingUser.applicationId = influencer._id;
          await matchingUser.save();
        }
        
        matchedCount++;
      } else {
        // No existing user found, create one
        console.log(`Creating new user for approved influencer: ${influencer.email}`);
        try {
          const newUser = await InfluencerUser.create({
            email: influencer.email,
            name: influencer.fullName,
            applicationId: influencer._id,
            role: 'influencer',
            setupCompleted: false,
            setupSteps: {
              password: false,
              socials: false,
              payment: false,
              verification: false
            }
          });
          
          influencer.user = newUser._id;
          await influencer.save();
          matchedCount++;
          
          console.log(`Created and linked new user for ${influencer.email}`);
        } catch (err) {
          console.error(`Error creating user for ${influencer.email}: ${err.message}`);
        }
      }
    }
    
    console.log(`Successfully repaired ${matchedCount} influencer-user links`);
    
    // Final verification
    const remainingInfluencersWithoutUsers = await Influencer.find({ 
      status: 'approved',
      user: { $exists: false }
    });
    
    console.log(`After repair: ${remainingInfluencersWithoutUsers.length} approved influencers still without users`);
    
    const partnersQuery = { 
      status: 'approved',
      user: { $exists: true, $ne: null }
    };
    
    const partners = await Influencer.find(partnersQuery);
    console.log(`Partners list query would now return ${partners.length} records`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
  }
}

// Run the function
repairInfluencerUserLinks(); 
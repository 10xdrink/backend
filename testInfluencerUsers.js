// testInfluencerUsers.js
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

// Function to list all approved influencers and their users
async function listApprovedInfluencers() {
  try {
    // Query for approved influencers
    const approvedInfluencers = await Influencer.find({ 
      status: 'approved'
    }).select('fullName email status user');
    
    console.log(`Found ${approvedInfluencers.length} approved influencers:`);
    
    for (const influencer of approvedInfluencers) {
      console.log(`\nInfluencer: ${influencer.fullName} (${influencer.email})`);
      console.log(`User ID reference: ${influencer.user || 'Not set'}`);
      
      // If there's a user ID, try to find the corresponding user
      if (influencer.user) {
        const user = await InfluencerUser.findById(influencer.user);
        if (user) {
          console.log(`Found user: ${user.name} (${user.email})`);
        } else {
          console.log('User not found even though referenced');
        }
      }
    }
    
    // Now check for all InfluencerUser records
    const allInfluencerUsers = await InfluencerUser.find();
    console.log(`\nFound ${allInfluencerUsers.length} total InfluencerUser records`);
    
    // Check for InfluencerUser records that aren't linked to an Influencer
    for (const user of allInfluencerUsers) {
      const influencer = await Influencer.findOne({ user: user._id });
      if (!influencer) {
        console.log(`\nWarning: User ${user.name} (${user.email}) is not linked to any Influencer application`);
      }
    }
    
    // Check for mismatches in the query used by the partner list page
    const partnersQuery = { 
      status: 'approved',
      user: { $exists: true, $ne: null }
    };
    
    const partners = await Influencer.find(partnersQuery);
    console.log(`\nPartners list query would return ${partners.length} records`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
  }
}

// Run the function
listApprovedInfluencers(); 
const mongoose = require('mongoose');

const PhoneVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationAttempts: {
    type: Number,
    default: 0
  },
  lastAttemptAt: {
    type: Date
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for faster lookups
PhoneVerificationSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });

// Static method to find or create a verification record
PhoneVerificationSchema.statics.findOrCreate = async function(userId, phoneNumber) {
  let verification = await this.findOne({ userId, phoneNumber });
  
  if (!verification) {
    verification = await this.create({
      userId,
      phoneNumber
    });
  }
  
  return verification;
};

module.exports = mongoose.model('PhoneVerification', PhoneVerificationSchema); 
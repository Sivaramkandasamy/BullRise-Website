const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    altPhone: { type: String },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    locality: { type: String },
    state: { type: String, required: true },
    suggestedName: { type: String },
    isDefault: { type: Boolean, default: false }
  },
  { _id: true } // keep subdocument id
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    phone: { type: String },
    googleId: { type: String },
    isAdmin: { type: Boolean, default: false },
    // Added: supports the admin-tier role system (Add Admin form, Users
    // page Role column, super-admin-only create/delete restrictions).
    isSuperAdmin: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['user', 'admin', 'sales', 'staff', 'reporting_manager', 'superadmin'],
      default: 'user'
    },
    avatar: { type: String },
    mobile: { type: String },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: ''
    },
    dateOfBirth: { type: Date },
    whatsappOptIn: { type: Boolean, default: false },
    wishlist: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    ],
    addresses: [addressSchema],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ]
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
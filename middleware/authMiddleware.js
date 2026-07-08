const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies.jwt;

  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

try {

    console.log("TOKEN:", token);
    console.log("Authorization Header:", req.headers.authorization);
console.log("Cookie:", req.cookies.jwt);

const decoded = jwt.verify(token, process.env.JWT_SECRET);

console.log("DECODED:", decoded);

req.user = await User.findById(decoded.userId).select("-password");

console.log("USER:", req.user);

    next();

} catch (err) {

    console.log(err);

    res.status(401);

    throw new Error("Not authorized, token failed");

}
});

const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403);
  throw new Error('Admin access only');
};

module.exports = {
  protect,
  adminOnly
};

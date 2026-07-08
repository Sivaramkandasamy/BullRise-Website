const jwt = require('jsonwebtoken');

const generateToken = (res, userId, isAdmin) => {
  const token = jwt.sign({ userId, isAdmin }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  // httpOnly cookie
  res.cookie('jwt', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

  return token;
};

module.exports = generateToken;

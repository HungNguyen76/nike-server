import jwt from 'jsonwebtoken';

export default {
  createToken: function (data, time) {
    // time(ms)
    try {
      return jwt.sign(
          data
          , process.env.JWT_KEY
          , { expiresIn: `${time}` });
    } catch (err) {
      return false
    }
  },
  verifyToken: function(token) {
    let result;
    jwt.verify(token, process.env.JWT_KEY, function(err, decoded) {
      if(err) {
        result = false
      }else {
        result = decoded
      }
    });
    return result
  }
}
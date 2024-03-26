const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var fetchUser = require("../middleware/fetchUser");

const JWT_SECRET = 'abhishekisagoodb$oy';
// 1. End point 1 - Create a user using POST "/api/auth/createuser". No login required

router.post(
  "/createuser",
  [
    //Validation provided using express validator
    body("name", "Please enter a valid name").isLength({ min: 3 }),
    body("email", "Please enter a valid email").isEmail(),
    body("password", "Password must be atleast 5 characters").isLength({
      min: 3,
    }),
  ],
  async (req, res) => {
    //If there are errors in validation, return bad request and the errors
    const errors = validationResult(req);
    let success=false;
    if (!errors.isEmpty()) {
      success=false;
      return res.status(400).json({ success,errors: errors.array() });
    }
    //Check whether user with this email already exists
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        success=false;
        return res.status(400).json({ success,error: "Email already in exists" });
      }

      //Securing Password
      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.password, salt);
      //Create a new User
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPass,
      });

      //creating session token from jwt json web token
      const data = {
        userId: {
          id: user.id,
        },
      };
      success=true;
      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({ success,authToken });

    } catch (error) {
      success=false;
      console.error(error.message);
      res.status(500).send("Internal Server error occured");
    }
  }
);

//2. End Point 2 - Authenticate User - Using POST "/api/auth/login" - No login required

router.post(
  "/login",
  [
    body("email", "Please enter a valid email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    //destructuring INSTEAD OF WRITING SEPARATELY WE CAN WRITE LIKE THIS
    const { email, password } = req.body; 
    try {
      let success=false;
      //Checking if the user with this email already exists or not
      let user = await User.findOne({ email });
      
      if (!user) {
        success=false;
        return res
          .status(400)
          .json({ error: "Please try to login with correct credentials" });
      }

      //Checking the entered password is correct or not first argument 'password' is the password from client side while the second argument 'user.password' is the password stored in database in the form of hash 

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        success=false;
        return res
          .status(400)
          .json({ error: "Please try to login with correct credentials" });
      }

      // If the credentials are correct the user is given auth token
      const data = {
        userId: {
          id: user.id,
        },
      };

      //jwt sign uses the user id and one secret key which is stored with us to generate an auth token
      const authToken = jwt.sign(data, JWT_SECRET);
      success=true;
      res.json({ success, authToken });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server error occured");
    }
  }
);

//3. End Point 3 - Get logged in User details - Using POST "/api/auth/getUser" - Login required
//TILL HERE THE LOGIN WAS NOT REQUIRED BUT AFTER USER HAS BEEN AUTHENTICATED THE NEXT STEP IS TO GET THE DATA OF USER---->FOR THIS I AM USING A MIDDLEWARE fetchUser (Its basic function is to take auth token which was given to the user after he got authenticated and return the user id)
router.post("/getUser", fetchUser, async (req, res) => {
  try {
    const userId = req.user.id;
    //now i got the id from fetchUser i can get all the user data other than password
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server error occured");
  }
});

module.exports = router;

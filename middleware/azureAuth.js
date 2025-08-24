const passport = require("passport");
const BearerStrategy = require("passport-azure-ad").BearerStrategy;
const { pool } = require("../config/db");

const options = {
  identityMetadata: `https://login.microsoftonline.com/a92cbcff-6e56-42ae-9e7f-742431739e80/v2.0/.well-known/openid-configuration`,
  clientID: "bca262cc-e31e-460e-b9b2-342fac6536ff",
  validateIssuer: true,
  loggingLevel: "info",
  passReqToCallback: false,
};

passport.use(
  new BearerStrategy(options, async (token, done) => {
    try {
      // Check if user exists in MySQL with all necessary fields
      // Query using the exact column names from the database
      const [rows] = await pool.query(
        "SELECT id, azure_id, email, name, role, costCentre, department FROM users WHERE azure_id = ?",
        [token.oid]
      );
      
      if (rows.length === 0) {
        return done(null, false, { message: "User not allowed" });
      }
      
      const user = rows[0];
      console.log("Retrieved user data:", user); // Debug log
      
      // Ensure all necessary fields are included in the user object with proper casing
      const userResponse = {
        id: user.id,
        azure_id: user.azure_id,
        email: user.email,
        name: user.name,
        role: user.role,
        costCentre: user.costCentre || "", // match the exact column name from database
        department: user.department || ""
      };
      
      return done(null, userResponse);
    } catch (err) {
      console.error("Azure auth error:", err);
      return done(err, false);
    }
  })
);

module.exports = passport;

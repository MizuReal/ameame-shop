const User = require("../models/User");

async function createOrUpdateUserFromFirebase(firebaseUser) {
  const normalizedEmail = String(firebaseUser.email || "").trim().toLowerCase();

  let user = await User.findOne({
    $or: [{ firebaseUid: firebaseUser.uid }, { email: normalizedEmail }],
  });

  if (!user) {
    user = new User({
      firebaseUid: firebaseUser.uid,
      email: normalizedEmail,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      role: 0,
      lastLoginAt: new Date(),
    });
  } else {
    user.firebaseUid = firebaseUser.uid;
    user.email = normalizedEmail;
    user.displayName = firebaseUser.displayName || user.displayName;
    user.photoURL = firebaseUser.photoURL || user.photoURL;
    user.emailVerified = firebaseUser.emailVerified;
    if (typeof user.isActive !== "boolean") {
      user.isActive = true;
    }
    user.lastLoginAt = new Date();
  }

  await user.save();

  return user;
}

module.exports = {
  createOrUpdateUserFromFirebase,
};

const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: String,
  mogScore: Number,
  tier: String,
  rank: Number,
});

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);

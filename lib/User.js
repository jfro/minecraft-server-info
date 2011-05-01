// user storage model for mongoose
var Schema = require('mongoose').Schema;

var User = new Schema({
    username  :  { type: String, index: true }
  , name   :  { type: String }
  , last_connect_date   :  { type: Date }
  , last_disconnect_date  :  { type: Date }
  , online : { type: Boolean, default: false, index: true }
  , paid : { type: Boolean, default: false, index: true }
  , first_seen_date : { type: Date }
  , time_played : { type: Number, default: 0 }
});

// a setter
User.virtual('last_action_date').get(function () {
	if(this.online)
		return this.last_connect_date;
	return this.last_disconnect_date;
});

exports.User = User;

// user storage model for mongoose

exports.UserModel = {
	//collection : 'test_beer', // (optional) if not present uses the model name instead.
	properties: ['username', 'name', 'last_connect_date', 'last_disconnect_date', 'online', 'paid', 'first_seen_date', 'time_played'],

	cast: {
		online: Boolean,
		paid: Boolean,
		last_connect_date: Date,
		last_disconnect_date: Date
	},

	indexes : [
		'username',
		'name',
		'online',
		'paid'
//		[['first'],['last']] // compound key indexes
	],

	static : {}, // adds methods onto the Model.
	methods : {}, // adds methods to Model instances.

	setters: { // custom setters
		// first: function(v){
		//   return v.toUpperCase();
		// }
	},

	getters: { // custom getters
		last_action_date: function(v) {
			if(this.online)
				return this.last_connect_date;
			return this.last_disconnect_date;
		},

    // legalDrinkingAge : function(){
    //   return (this.bio.age >= 21) ? true : false;
    // },

    // first_last : function(){ // custom getter that merges two getters together.
    //   return this.first + ' ' + this.last;
    // }
  }
};

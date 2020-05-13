mysql-util
=======

Common utility functions and objects for mysql TABLES 

Model
====

Base
---

```
// Include base 
var Model = require('mysql-util').model.base;


var sampleModel = new Model({
	'name': 'sample',
	'columns': [
		'id',
		'columnA',
		'columnB',
		'columnC'
	]
}, {
	host: 'localhost',
	user:'root',
	password: 'password',
	database: 'dbname1',
	min:2,
	max:20
});

```

Now Listing, insert, update, delete functions are available on sampleModel

```
// Insert
sampleModel.insert({
			columnA: 'A',
			columnB: 'B',
			columnC: 'C'
			},console.log);

// Update
sampleModel.update({
			id: 12
			columnC: 'D'
			},console.log);
// list
sampleModel.insert({ columnA: 'A',columnB: 'B'},console.log);

```
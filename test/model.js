'use strict';

var util = require('util');
var Base = require('../model/base');
var db = = {
	host: 'localhost',
	user:'root',
	password: 'password',
	database: 'world',
	min:2,
	max:20
};

function Model(options, db) {
  Base.apply(this, arguments);
}

Model.prototype = Object.create(Base.prototype);

var schema = {
  'name': 'country',
  'columns': [
    'id',
    'name',
    'capital',
    'status',
    'created_at',
    'updated_at'
  ],
  updatableColumns: [
    'capital',
    'status'
  ],
  updatableFilters: [
    'id',
    'name'
  ],
  disableScan: true,
  normaliseMap: {
    'amount': 1000
  }
};


var model = new Model(schema, db);

model.list({limit: 2}, console.log);
/*
model.insert([{
  name: 'india',
  capital: 'mumbai',
  status: 1
}], console.log);

model.update({
  id: 13,
  capital: 'new delhi'
}, console.log);

model.bulkUpdate({
  status: 1
}, {
  id: 13
}, console.log);
*/


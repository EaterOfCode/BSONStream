BSONStream
==========

A BSON parsing stream for NodeJS

How to use?
===========

It's actually pretty simple, here is an example

```javascript

var BSONStream = require("bsonstream"),
    bsonStream = new BSONStream();
// this function gets called everytime when there 
// is a new element found in the main object
bsonStream.on("data",function(obj){
  // obj is an obj with two values, name and value
  // obj.name is an array with the path to the object
  console.log(obj.name,obj.value);
});
// done is called when the whole document is parsed
bsonStream.on("done",function(obj){
  // obj is the whole parsed document
  console.log("Finished parsing! > ",obj);
});

process.stdin.pipe(bsonStream);

```

Installing is done via `npm i bsonstream`

To do and handicaps
=============

The following types are still not done and are on the to-do:

* Binary data
* ObjectId
* JavaScript code w/ scope
* Min key
* Max key

License
=========

This repo is licensed under MIT etc. blablabla

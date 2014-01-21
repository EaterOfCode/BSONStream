var BSONStream = require('./index'),
    testStream = new BSONStream();
testStream.on("data", function(a) {
    console.log("data", a);
});
testStream.on("done", function(a) {
    console.log("done", a);
});
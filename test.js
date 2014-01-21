var BSONStream = require('./index'),
    BSON = require("bson"),
    testStream = new BSONStream();
testStream.on("data", function(a) {
    console.log("data", a);
});
testStream.on("done", function(a) {
    console.log("done", a);
});
var Pure = (new BSON.pure);
var bin = (new Pure.BSON).serialize({
    d: 'Hey',
    a: 6.7,
    g: 457,
    f: {
        "dope": "HEALING POWERZ",
        strength: null,
        nesting: {
            nesting: {
                nesting: {

                }
            }
        }
    },
    p: true,
    o: false
});
var l = bin.length;
for (var i = 0; i < l; i++) {
    testStream.write(bin.slice(i, i + 1));
}
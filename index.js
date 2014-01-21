var util = require('util');
var Transform = require('stream').Transform;
util.inherits(BSONStream, Transform);

function BSONStream(options) {
    if (!(this instanceof BSONStream))
        return new BSONStream(options);
    Transform.call(this, options);
    this._writableState.objectMode = false;
    this._readableState.objectMode = true;
    this._buffer = new Buffer([]);
    this._state = -1;
    this._stateArgs = {};
    this._tree = {};
    this._father = undefined;
    this._currentDocument = this._tree;
    this._isTree = true;
};
// STATES
BSONStream.PARSELIST = -1;
BSONStream.PARSETYPE = 0;
BSONStream.PARSENAME = 1;
BSONStream.PARSEVALUE = 2;
// TYPES
BSONStream.DOUBLE = 1;
BSONStream.STRING = 2;
BSONStream.OBJECT = 3;
BSONStream.ARRAY = 4;
//BSONStream.BINARY = "\x05";
BSONStream.BOOLEAN = 8;
BSONStream.NULL = 10;
BSONStream.INT = 16;
//BSONStream.INT64 = "\x12";

BSONStream.prototype._transform = function(chunk, encoding, done) {
    var buffer = this._buffer = Buffer.concat([this._buffer, chunk]);
    var cont = true;
    this._cancelLoop = function() {
        cont = false;
    }
    do {
        switch (this._state) {
            case BSONStream.PARSELIST:
                if (buffer.length > 3) {
                    var docLength = buffer.readInt32LE(0);
                    if (this._isTree) {
                        this._tree = {
                            type: 3,
                            isTree: true,
                            children: [],
                            length: docLength,
                            father: {
                                isBasement: true
                            }
                        }
                        this._currentDocument = this._tree;
                        this._isTree = false;
                    } else {
                        this._currentDocument.father = this._currentDocument.father || this._currentDocument,
                        this._currentDocument.length = docLength;
                        this._currentDocument.children = [];
                    }
                    buffer = buffer.slice(4);
                    this._state = BSONStream.PARSETYPE;
                } else cont = false;
                break;
            case BSONStream.PARSETYPE:
                if (buffer.length > 0) {
                    if (buffer[0] == 0) {
                        buffer = buffer.slice(1);
                        this._finishObject();
                    } else {
                        this._currentDocument = {
                            type: buffer[0],
                            father: this._currentDocument
                        };
                        this._currentDocument.father.children.push(this._currentDocument);
                        buffer = buffer.slice(1);
                        this._state = BSONStream.PARSENAME;
                    }
                } else cont = false;
                break;
            case BSONStream.PARSENAME:
                if (buffer.length > 0) {
                    var index = -1;
                    var l = buffer.length;
                    for (var i = 0; i < l; i++) {
                        if (buffer[i] == 0) {
                            index = i;
                            break;
                        }
                    }
                    if (index === -1) {
                        cont = false;
                        break;
                    }
                    var name = buffer.toString('utf-8', 0, i);
                    this._currentDocument.name = name;
                    buffer = buffer.slice(i + 1);
                    this._state = BSONStream.PARSEVALUE;
                } else cont = false;
                break;
            case BSONStream.PARSEVALUE:
                switch (this._currentDocument.type) {
                    case BSONStream.DOUBLE:
                        if (buffer.length > 7) {
                            this._currentDocument.value = buffer.readDoubleLE(0);
                            buffer = buffer.slice(8);
                            this._finishObject();
                        } else cont = false;
                        break;
                    case BSONStream.STRING:
                        var len = -1;
                        if (buffer.length > 3 && buffer.length > ((len = buffer.readInt32LE(0)) + 5)) {
                            this._currentDocument.value = buffer.toString('utf-8', 4, 3 + len);
                            buffer = buffer.slice(4 + len);
                            this._finishObject();
                        } else cont = false;
                        break;
                    case BSONStream.BOOLEAN:
                        if (buffer.length > 0) {
                            this._currentDocument.value = buffer[0] == 1;
                            buffer = buffer.slice(1);
                            this._finishObject();
                        } else cont = false;
                        break;
                    case BSONStream.NULL:
                        this._currentDocument.value = null;
                        this._finishObject();
                        break;
                    case BSONStream.INT:
                        if (buffer.length > 3) {
                            this._currentDocument.value = buffer.readInt32LE(0);
                            buffer = buffer.slice(4);
                            this._finishObject();
                        } else cont = false;
                        break;
                        /* TO DO
                    case BSONStream.INT64:

                        if (buffer.length > 7) {
                            this._currentDocument.value = buffer.readInt64LE(0);
                            buffer = buffer.slice(4);
                            this._finishObject();
                        } else cont = false;
                        break;*/
                    case BSONStream.ARRAY:
                    case BSONStream.OBJECT:
                        this._state = BSONStream.PARSELIST;
                        break;
                    default:
                        throw new Error("BSON Stream: type #" + this._currentDocument.type + " not implemented");
                        cont = false;
                }
                break;
        }
    } while (cont);
    this._buffer = buffer;
    done();
}

BSONStream.prototype._finishObject = function() {
    if (this._currentDocument.father.isBasement) {
        this.emit("done", this._buildObject(this._currentDocument).value);
        this._cancelLoop();
    } else if (this._currentDocument.father.isTree) {
        this.push(this._buildObject(this._currentDocument));
        this._currentDocument = this._currentDocument.father;
        this._state = BSONStream.PARSETYPE;
    } else if (this._currentDocument.father) {
        this._currentDocument = this._currentDocument.father;
        this._state = BSONStream.PARSETYPE;
    }
}

BSONStream.prototype._buildValue = function(document) {
    switch (document.type) {
        case BSONStream.DOUBLE:
        case BSONStream.NULL:
        case BSONStream.STRING:
        case BSONStream.INT:
        case BSONStream.BOOLEAN:
            return document.value;
        case BSONStream.ARRAY:
            var array = new Array(document.children.length);
            var l = array.length;
            for (var i = 0; i < l; i++) {
                var child = document.children[i];
                array[child.name] = this._buildValue(child);
            };
            return array;
        case BSONStream.OBJECT:
            var array = {};
            var l = document.children.length;
            for (var i = 0; i < l; i++) {
                var child = document.children[i];
                array[child.name] = this._buildValue(child);
            };
            return array;
    }
}

BSONStream.prototype._buildObject = function(document) {
    return {
        name: document.name,
        value: this._buildValue(document)
    };
}
module.exports = BSONStream;
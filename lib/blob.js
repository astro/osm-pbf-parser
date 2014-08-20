var parsers = require('./parsers.js');
var Transform = require('readable-stream').Transform;
var inherits = require('inherits');

module.exports = BlobParser;
inherits(BlobParser, Transform);

var SIZE = 0, HEADER = 1, BLOB = 2;

function BlobParser () {
    Transform.call(this);
    this._readableState.objectMode = true;
    this._readableState.highWaterMark = 1;
    this._writableState.objectMode = false;
    this._writableState.highWaterMark = 0;
    this._mode = SIZE;
    this._waiting = 4;
    this._prev = null;
    this._header = null;
    this._blob = null;
    this._offset = 0;
    this._sizeOffset = null;
}

BlobParser.prototype._transform = function(buf, enc, next) {
    if (this._prev) {
        buf = Buffer.concat([ this._prev, buf ]);
        this._prev = null;
    }
    // console.log("blob", this._writableState.buffer.length, "+", this._readableState.buffer.length, buf.length, this._mode, this._waiting);
    if (buf.length < this._waiting) {
        this._prev = buf;
        return next();
    }
    
    if (this._mode === SIZE) {
        this._sizeOffset = this._offset;
        var len = buf.readUInt32BE(0);
        this._mode = HEADER;
        this._offset += this._waiting;
        this._waiting = len;
        this._transform(buf.slice(4), enc, next);
    }
    else if (this._mode === HEADER) {
        this._header = parsers.file.BlobHeader.decode(buf.slice(0, this._waiting));
        this._mode = BLOB;
        var nbuf = buf.slice(this._waiting);
        this._offset += this._waiting;
        this._waiting = this._header.datasize;
        this._transform(nbuf, enc, next);
    }
    else if (this._mode === BLOB) {
        this._blob = parsers.file.Blob.decode(buf.slice(0, this._waiting));
        
        var h = this._header;
        var o = this._offset;

        this._mode = SIZE;
        var nbuf = buf.slice(this._waiting);
        this._offset += this._waiting;
        this._waiting = 4;

        if (!this._blob.zlib_data) {
            throw "No zlib data, possibly unimplemented raw/lzma/bz2 data";
        }
        this.push({
            type: h.type,
            zlib_data: this._blob.zlib_data
        });
            
        this._transform(nbuf, enc, next);
    }
}

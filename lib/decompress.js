var zlib = require('zlib');
var Transform = require('readable-stream').Transform;
var inherits = require('inherits');

module.exports = BlobDecompressor;
inherits(BlobDecompressor, Transform);

function BlobDecompressor () {
    Transform.call(this, { objectMode: true, highWaterMark: 1 });
}

BlobDecompressor.prototype._transform = function(chunk, enc, cb) {
    // console.log("decompress", chunk.zlib_data.length);
    zlib.inflate(chunk.zlib_data, function (err, data) {
        // console.log("decompressed", chunk.zlib_data.length, "into", data.length);
        if (data) {
            chunk.data = data;
            delete chunk.zlib_data;
            this.push(chunk);
        }

        cb(err);
    }.bind(this));
};

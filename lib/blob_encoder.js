var parsers = require('./parsers.js');
var Transform = require('readable-stream').Transform;
var inherits = require('inherits');


module.exports = BlobEncoder;
inherits(BlobEncoder, Transform);

function BlobEncoder () {
    Transform.call(this, { objectMode: true, highWaterMark: 1 });
}

BlobEncoder.prototype._transform = function(blob, enc, next) {
    var blobMessage = parsers.file.Blob.encode({
        zlib_data: blob.zlib_data
    });
    var blobHeader = parsers.file.BlobHeader.encode({
        type: blob.type,
        datasize: blobMessage.length
    })
    var sizeBuf = new Buffer(4);
    sizeBuf.writeUInt32BE(blobHeader.length, 0);
    this.push(sizeBuf);
    this.push(blobHeader);
    this.push(blobMessage);

    next();
};

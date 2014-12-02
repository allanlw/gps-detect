// findEXIFinJPEG is a function that takes an ArrayBuffer of the bytes of a
// JPEG and spits back an object with the relevant GPS/time fields.
// It skips other EXIF fields for performance reasons.

// This is a stripped down version of exif-js available here:
// https://github.com/jseidelin/exif-js
// it is under The MIT License (MIT)
// and Copyright (c) 2008 Jacob Seidelin
// see https://github.com/jseidelin/exif-js/blob/master/LICENSE.md for details

var ExifTags = {
	// version tags
	0x9000 : "ExifVersion",             // EXIF version
	0xA000 : "FlashpixVersion",         // Flashpix format version

	// user information
	0x927C : "MakerNote",               // Any desired information written by the manufacturer
	0x9286 : "UserComment",             // Comments by user

	// date and time
	0x9003 : "DateTimeOriginal",        // Date and time when the original image was generated
	0x9004 : "DateTimeDigitized",       // Date and time when the image was stored digitally
	0x9290 : "SubsecTime",              // Fractions of seconds for DateTime
	0x9291 : "SubsecTimeOriginal",      // Fractions of seconds for DateTimeOriginal
	0x9292 : "SubsecTimeDigitized",     // Fractions of seconds for DateTimeDigitized

};

var TiffTags = {
	0x8769 : "ExifIFDPointer",
	0x8825 : "GPSInfoIFDPointer",
};

var GPSTags = {
	0x0000 : "GPSVersionID",
	0x0001 : "GPSLatitudeRef",
	0x0002 : "GPSLatitude",
	0x0003 : "GPSLongitudeRef",
	0x0004 : "GPSLongitude",
	0x0005 : "GPSAltitudeRef",
	0x0006 : "GPSAltitude",
	0x0007 : "GPSTimeStamp",
	0x0008 : "GPSSatellites",
	0x0009 : "GPSStatus",
	0x000A : "GPSMeasureMode",
	0x000B : "GPSDOP",
	0x000C : "GPSSpeedRef",
	0x000D : "GPSSpeed",
	0x000E : "GPSTrackRef",
	0x000F : "GPSTrack",
	0x0010 : "GPSImgDirectionRef",
	0x0011 : "GPSImgDirection",
	0x0012 : "GPSMapDatum",
	0x0013 : "GPSDestLatitudeRef",
	0x0014 : "GPSDestLatitude",
	0x0015 : "GPSDestLongitudeRef",
	0x0016 : "GPSDestLongitude",
	0x0017 : "GPSDestBearingRef",
	0x0018 : "GPSDestBearing",
	0x0019 : "GPSDestDistanceRef",
	0x001A : "GPSDestDistance",
	0x001B : "GPSProcessingMethod",
	0x001C : "GPSAreaInformation",
	0x001D : "GPSDateStamp",
	0x001E : "GPSDifferential"
};

function readTagValue(file, entryOffset, tiffStart, bigEnd) {
	var type = file.getUint16(entryOffset+2, !bigEnd),
		numValues = file.getUint32(entryOffset+4, !bigEnd),
		valueOffset = file.getUint32(entryOffset+8, !bigEnd) + tiffStart,
		offset,
		vals, val, n,
		numerator, denominator;

	switch (type) {
		case 1: // byte, 8-bit unsigned int
		case 7: // undefined, 8-bit byte, value depending on field
			if (numValues == 1) {
				return file.getUint8(entryOffset + 8, !bigEnd);
			} else {
				offset = numValues > 4 ? valueOffset : (entryOffset + 8);
				vals = [];
				for (n=0;n<numValues;n++) {
					vals[n] = file.getUint8(offset + n);
				}
				return vals;
			}

		case 2: // ascii, 8-bit byte
			offset = numValues > 4 ? valueOffset : (entryOffset + 8);
			return getStringFromDB(file, offset, numValues-1);

		case 3: // short, 16 bit int
			if (numValues == 1) {
				return file.getUint16(entryOffset + 8, !bigEnd);
			} else {
				offset = numValues > 2 ? valueOffset : (entryOffset + 8);
				vals = [];
				for (n=0;n<numValues;n++) {
					vals[n] = file.getUint16(offset + 2*n, !bigEnd);
				}
				return vals;
			}

		case 4: // long, 32 bit int
			if (numValues == 1) {
				return file.getUint32(entryOffset + 8, !bigEnd);
			} else {
				vals = [];
				for (n=0;n<numValues;n++) {
					vals[n] = file.getUint32(valueOffset + 4*n, !bigEnd);
				}
				return vals;
			}

		case 5:    // rational = two long values, first is numerator, second is denominator
			if (numValues == 1) {
				numerator = file.getUint32(valueOffset, !bigEnd);
				denominator = file.getUint32(valueOffset+4, !bigEnd);
				val = new Number(numerator / denominator);
				val.numerator = numerator;
				val.denominator = denominator;
				return val;
			} else {
				vals = [];
				for (n=0;n<numValues;n++) {
					numerator = file.getUint32(valueOffset + 8*n, !bigEnd);
					denominator = file.getUint32(valueOffset+4 + 8*n, !bigEnd);
					vals[n] = new Number(numerator / denominator);
					vals[n].numerator = numerator;
					vals[n].denominator = denominator;
				}
				return vals;
			}

		case 9: // slong, 32 bit signed int
			if (numValues == 1) {
				return file.getInt32(entryOffset + 8, !bigEnd);
			} else {
				vals = [];
				for (n=0;n<numValues;n++) {
					vals[n] = file.getInt32(valueOffset + 4*n, !bigEnd);
				}
				return vals;
			}

		case 10: // signed rational, two slongs, first is numerator, second is denominator
			if (numValues == 1) {
				return file.getInt32(valueOffset, !bigEnd) / file.getInt32(valueOffset+4, !bigEnd);
			} else {
				vals = [];
				for (n=0;n<numValues;n++) {
					vals[n] = file.getInt32(valueOffset + 8*n, !bigEnd) / file.getInt32(valueOffset+4 + 8*n, !bigEnd);
				}
				return vals;
			}
	}
}

function readTags(file, tiffStart, dirStart, strings, bigEnd) {
	var entries = file.getUint16(dirStart, !bigEnd),
		tags = {},
		entryOffset, tag,
		i;

	for (i=0;i<entries;i++) {
		entryOffset = dirStart + i*12 + 2;
		tag = strings[file.getUint16(entryOffset, !bigEnd)];
		if (tag) { // only both reading value for expected tags
			tags[tag] = readTagValue(file, entryOffset, tiffStart, bigEnd);
		}
	}
	return tags;
}

function getStringFromDB(buffer, start, length) {
	var outstr = "", n;
	for (n = start; n < start+length; n++) {
		outstr += String.fromCharCode(buffer.getUint8(n));
	}
	return outstr;
}

// File is an arraybuffer
function readEXIFData(file, start) {
	if (getStringFromDB(file, start, 4) != "Exif") {
		throw "Not valid EXIF data! " + getStringFromDB(file, start, 4);
	}

	var bigEnd,
		tags, tag,
		exifData, gpsData,
		tiffOffset = start + 6;

	// test for TIFF validity and endianness
	if (file.getUint16(tiffOffset) == 0x4949) {
		bigEnd = false;
	} else if (file.getUint16(tiffOffset) == 0x4D4D) {
		bigEnd = true;
	} else {
		throw "Not valid TIFF data! (no 0x4949 or 0x4D4D)";
	}

	if (file.getUint16(tiffOffset+2, !bigEnd) != 0x002A) {
		throw "Not valid TIFF data! (no 0x002A)";
	}

	var firstIFDOffset = file.getUint32(tiffOffset+4, !bigEnd);

	if (firstIFDOffset < 0x00000008) {
		throw "Not valid TIFF data! (First offset less than 8)" + file.getUint32(tiffOffset+4, !bigEnd);
	}

	tags = readTags(file, tiffOffset, tiffOffset + firstIFDOffset, TiffTags, bigEnd);

	if (tags.ExifIFDPointer) {
		exifData = readTags(file, tiffOffset, tiffOffset + tags.ExifIFDPointer, ExifTags, bigEnd);
		for (tag in exifData) {
			switch (tag) {
				case "ExifVersion" :
				case "FlashpixVersion" :
					exifData[tag] = String.fromCharCode(exifData[tag][0], exifData[tag][1], exifData[tag][2], exifData[tag][3]);
					break;
			}
			tags[tag] = exifData[tag];
		}
	}

	if (tags.GPSInfoIFDPointer) {
		gpsData = readTags(file, tiffOffset, tiffOffset + tags.GPSInfoIFDPointer, GPSTags, bigEnd);
		for (tag in gpsData) {
			switch (tag) {
				case "GPSVersionID" :
					gpsData[tag] = gpsData[tag][0] +
						"." + gpsData[tag][1] +
						"." + gpsData[tag][2] +
						"." + gpsData[tag][3];
					break;
			}
			tags[tag] = gpsData[tag];
		}
	}

	return tags;
}


// Wants an ArrayBuffer
function findEXIFinJPEG(file) {
	var dataView = new DataView(file);

	if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
		throw "Not a valid JPEG";
	}

	var offset = 2,
		length = file.byteLength,
		marker;

	while (offset < length) {
		if (dataView.getUint8(offset) != 0xFF) {
			throw "Not a valid marker at offset " + offset + ", found: " + dataView.getUint8(offset);
		}

		marker = dataView.getUint8(offset + 1);

		// we could implement handling for other markers here,
		// but we're only looking for 0xFFE1 for EXIF data
		if (marker == 0xE1) {
			return readEXIFData(dataView, offset + 4, dataView.getUint16(offset + 2) - 2);
		} else if (marker === 0x01 || marker >= 0xD0 && marker <= 0xD9) { // markers which do NOT have a two-byte size
			offset += 2;
		} else {
			offset += 2 + dataView.getUint16(offset+2);
		}
	}
	
	return null;
}

exports.findEXIFinJPEG = findEXIFinJPEG;
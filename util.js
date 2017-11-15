function prettyGPS(data) {
	var longitude = data.GPSLongitude[0]+data.GPSLongitudeRef+" "+data.GPSLongitude[1]+"' "+data.GPSLongitude[2]+"\"";
	var latitude = data.GPSLatitude[0]+data.GPSLatitudeRef+" "+data.GPSLatitude[1]+"' "+data.GPSLatitude[2]+"\"";
	return "Latitude: "+latitude + " Longitude: "+longitude;
}

// Takes a data uri for an image, and scales it to fit in size x size
// cb() is called with the result, or the original uri on failure
function ThumbnailDataURI(datauri, size, cb) {
  var img = document.createElement("img");
  img.onload = function() {
    var longest_side = Math.max(this.width, this.height);

    var scale = size / longest_side;

    var canvas = document.createElement("canvas");
    canvas.width = this.width * scale;
    canvas.height = this.height * scale;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

    cb(canvas.toDataURL("image/jpeg"));
  }
  img.onerror = function() {
    cb(datauri);
  }
  img.src = datauri;
}

function hasGPS(data){
	if (!data) { return false; }
	return ("GPSLatitude" in data &&
		  "GPSLatitudeRef" in data &&
		  "GPSLongitude" in data &&
		  "GPSLongitudeRef" in data);
}

function geohackParams(data) {
	if (!hasGPS(data)) {
		return null;
	}
	var parts = data.GPSLatitude.slice();
	parts.push(data.GPSLatitudeRef);
	parts = parts.concat(data.GPSLongitude);
	parts.push(data.GPSLongitudeRef);
	return parts.join("_");
}

function geohackUrl(data) {
	var params = geohackParams(data);
	if (params === null) { return null; }
	return "https://tools.wmflabs.org/geohack/geohack.php?params=" + params;
}


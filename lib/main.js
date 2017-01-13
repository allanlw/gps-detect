var history = [];

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

function prettyGPS(data) {
	var longitude = data.GPSLongitude[0]+data.GPSLongitudeRef+" "+data.GPSLongitude[1]+"' "+data.GPSLongitude[2]+"\"";
	var latitude = data.GPSLatitude[0]+data.GPSLatitudeRef+" "+data.GPSLatitude[1]+"' "+data.GPSLatitude[2]+"\"";
	return "Latitude: "+latitude + " Longitude: "+longitude;
}

function isInHistory(uri) {
	for (var i = 0; i < history.length; i++) {
		if (history[i].uri.equalsExceptRef(uri)) {
			return true;
		}
	}
	return false;
}

function addHistory(uri, data, buf) {
    var thumb = require('./buf_util').dataURIFromArrayBuf("image/jpeg", buf);
	history.push({uri: uri, exif: data});

    myPanel.port.emit("add-history", {
      	originalURI: uri.asciiSpec,
		thumbURI: thumb,
		coords: prettyGPS(data),
		links: [
			{"text": "geohack", "href": geohackUrl(data)}
		]
	});
}

// This callback handles the thumbnail result from the panel page
function doAlert(params) {
	// update the thumbnail in the history
	for (var i = 0; i < history.length; i++) {
		if (history[i].uri.asciiSpec == params.originalURI) {
			history[i].thumb = params.thumbURI;
		}
	}

    require("sdk/notifications").notify({
		title: "GPS Location detected",
		text: params.coords,
		iconURL: params.thumbURI,
		onClick: function() {
			require("sdk/tabs").open(params.links[0].href);
		},
	});
}

// buf is an ArrayBuffer with the image contents
// uri is an nsiURI
function handleGPS(uri, buf) {
	if (isInHistory(uri)) {
		return;
	}

	var { findEXIFinJPEG } = require("./gps");

	var exif_gps_data = null;
	try {
		exif_gps_data = findEXIFinJPEG(buf);
	} catch(err) {
		console.log("gps-detect(" + uri.asciiSpec + "): " + err);
	}
	if (!hasGPS(exif_gps_data)) {
		return;
	}

	addHistory(uri, exif_gps_data, buf);
}

var observer = require('./tracing').ContentTypeObserver("image/jpeg", handleGPS);
observer.register();

function toggleObserver() {
  if (observer.registered) {
	observer.unregister()
  } else {
	observer.register();
  }
}

var button = require("sdk/ui").ToggleButton({
  id: "gps-detect-link",
  label: "GPSDetect",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onChange: function(state) {
	if (state.checked) {
		myPanel.show({
			position: this
		});
	}
  }
});

this.myPanel = require("sdk/panel").Panel({
	contentURL: "./panel.html",
	onHide: function() {
		button.state('window', {checked: false});
	}
});

this.myPanel.port.on('thumbnail-result', doAlert);

exports.onUnload = function(reason) {
	observer.unregister();
};

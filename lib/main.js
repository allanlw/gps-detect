var tabs = require("sdk/tabs");
var notifications = require("sdk/notifications");
var self = require("sdk/self");
var ui = require("sdk/ui");
var panel = require("sdk/panel");

var { findEXIFinJPEG } = require("./gps");
var { ContentTypeObserver } = require('./tracing');
var { dataURIFromArrayBuf } = require('./buf_util');

var history = [];

function hasGPS(data){
	return ("GPSLatitude" in data &&
		  "GPSLatitudeRef" in data &&
		  "GPSLongitude" in data &&
		  "GPSLongitudeRef" in data);
}

function geohackParams(data) {
	if (!hasGPS(data)) {
		return null;
	}
	var parts = data.GPSLatitude;
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
    var thumb = dataURIFromArrayBuf("image/jpeg", buf);
	history.push({uri: uri, exif: data, thumb: thumb});

    panel.port.emit("add-history", {
      	originalURI: uri.asciiSpec,
		thumbURI: thumb,
		coords: prettyGPS(data),
		links: [
			{"text": "geohack", "href": geohackUrl(data)}
		]
	});
}
	
// buf is an ArrayBuffer with the image contents
// uri is an nsiURI
function handleGPS(uri, buf) {
	if (isInHistory(uri)) {
		return;
	}

	var exif_gps_data = null;
	try {
		exif_gps_data = findEXIFinJPEG(buf);
	} catch(err) {
		console.log(err);
	}
	if (!hasGPS(exif_gps_data)) {
		return;
	}
	console.log(exif_gps_data);
    notifications.notify({
		title: "GPS Location detected",
		text: prettyGPS(exif_gps_data),
		iconURL: dataURIFromArrayBuf("image/jpeg", buf),
		onClick: function() {
			tabs.open(geohackUrl(exif_gps_data));
		},
	});

	addHistory(uri, exif_gps_data, buf);
}

var observer = ContentTypeObserver("image/jpeg", handleGPS);
observer.register();

function toggleObserver() {
  if (observer.registered) {
	observer.unregister()
	console.log("Observers unregistered");
  } else {
	observer.register();
	console.log("Observers registered");
  }
}

var button = ui.ToggleButton({
  id: "mozilla-link",
  label: "Visit Mozilla",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onChange: function(state) {
	if (state.checked) {
		panel.show({
			position: this
		});
	}
  }
});

var panel = panel.Panel({
	contentURL: self.data.url("panel.html"),
	onHide: function() {
		button.state('window', {checked: false});
	}
});

exports.onUnload = function(reason) {
	observer.unregister();
};
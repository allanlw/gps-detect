# GPSDetect
GPSDetect is a simple Firefox addon that monitors Firefox network traffic and
automatically alerts the user whenever a JPEG file loads that contains
embedded EXIF GPS coordinates.

When an image is detected that contains GPS data, the user is alerted, and
given a link to the offending image as well as the GPS information and a link
to the location on a map.

Note that most major social networking sites strip EXIF information (including
GPS locations). This includes Facebook, Twitter and imgur.

You can install GPS detect from the mozilla addon store: 
https://addons.mozilla.org/en-US/firefox/addon/gpsdetect/

## Usage
GPSDetect uses the [Firefox Add-on SDK][1], which is required to build and
install it, for now. To build a copy of GPSDetect, see the
[Add-on SDK installation instructions][2] to activate the SDK's
virtualenv, and then simply run `cfx xpi` in the GPSDetect root directory.
You will get an unsigned XPI that can be installed into Firefox as usual.

## License
The actual exif detection code is from Jacob Seidelin's [exif-js] project and
is licensed under the MIT license. The version used here is a stripped down
version, but the core functionality is the same.

Everything else is under the Mozilla Public License v2.0 and copyright
Allan Wirth 2014.

## TODO
The following improvements could be made (roughly in order of priority):

- Testing for robustness, especially against images that are already cached.
- Provide alerts/detection for other privacy compromising exif information,
  such as timestamp, lens serial number, etc.
- Add support for IPTC and/or XMP data. Note that XMP can contain EXIF data,
  so XMP can also contain GPS information. IPTC cannot contain GPS information,
  but could contain other sensitive information.
- Links to google maps, bing maps and openstreetmaps in addition to just
  geohack.
- Add support for clearing history / possible integration into the history
  clearing dialog (Integration is really messy, and involves registering XUL
  overlays: see [how DownThemAll does it][dta-sanatize]). Probably better to
  just have a link at the bottom of the frame for 'clear history'.
- Add support for actually creating real thumbnails of the images, instead of
  creating data uris with the entire content of the image (use page-worker
  addon sdk api along with a canvas to do this easily).
- There is a memory leak from the notifications. Is this my fault or firefox's?
- An icon that doesn't suck.
- (Probably not going to ever happen) Add an option for auto-loading/sniffing
  thumbnail links.

[1]: https://developer.mozilla.org/en-US/Add-ons/SDK
[2]: https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation
[exif-js]: https://github.com/jseidelin/exif-js
[dta-sanatize]: https://github.com/downthemall/downthemall-mirror/blob/c8fd56c464b2af6b8dc7ddee1f9bbe6e9f6e8382/modules/main.js#L513

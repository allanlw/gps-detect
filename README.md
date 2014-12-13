# GPSDetect
GPSDetect is a simple Firefox addon that monitors Firefox network traffic and
automatically alerts the user whenever a JPEG file loads that contains
embedded EXIF GPS coordinates.

When an image is detected that contains GPS data, the user is alerted, and
given a link to the offending image as well as the GPS information and a link
to the location on a map.

Note that most major social networking sites strip EXIF information (including
GPS locations). This includes Facebook, Twitter and imgur.

## License
The actual exif detection code is from Jacob Seidelin's
[exif-js](https://github.com/jseidelin/exif-js) project and is licensed under
the MIT license. The version used here is a stripped down version, but the core
functionality is the same.

The plugin currently depends on jQuery because I'm really lazy. jQuery is under
the MIT license too and copyright the jQuery Foundation, Inc.

Everything else is under the Mozilla Public License v2.0 and copyright
Allan Wirth 2014.

## TODO
The following improvements could be made:

- Provide alerts for other privacy compromising exif information, such as
  timestamp, lens serial number, etc.
- Add support for IPTC and/or XMP data. Note that XMP can contain EXIF data,
  so XMP can also contain GPS information. IPTC cannot contain GPS information,
  but could contain other sensative information.
- Add an option for auto-loading/sniffing thumbnail links.
- Testing, especially against images that are already cached.
- Remove jQuery dependency because it's really stupid and is most of the code.
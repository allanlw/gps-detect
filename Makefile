.PHONY: clean

gps-detect.xpi:
	zip -r $@ . -x .git\* test\* Makefile

clean:
	rm -f gps-detect.xpi

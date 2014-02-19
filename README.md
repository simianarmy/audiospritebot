audiospritebot
==============

A node app for creating audio spritesheets.

Requirements
===
* Python 2.7.x or higher
* pydub Python module
* ffmpeg

ffmpeg
===
If you want to support certain formats such as m4a, aac, ogg, etc. you will need those codecs compiled in to your ffmpeg binary.  You can find out which codecs are supported by running

    ffmpeg

I support mp3, ogg/vorbis, m4a with the following ffmpeg configuration:

    --prefix=/usr/local --enable-gpl --enable-nonfree --enable-libfdk-aac --enable-libfreetype --enable-libmp3lame --enable-libtheora --enable-libvorbis --enable-libvpx --enable-libx264 --enable-libxvid --enable-libfaac
  
For installation/configuration on OS X, this is a helpful guide
* https://trac.ffmpeg.org/wiki/MacOSXCompilationGuide

Installation
====
To run locally:

  > git clone --recursive https://github.com/simianarmy/audiospritebot
  
  > cd audiospritebot
  
  > npm install
  
  > node app.js



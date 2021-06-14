# trilaud
Gifted sub farmer for Twitch TriHard :handshake: VisLaud
## Features ##
* Synchronous channel join vadiChad
* play a sound when you get a gift (planned feature: also when you get pinged), if enabled
* add new channels without restarting. Just add the new channels to channels.txt and send the program a SIGUSR1
* Free software under the GNU GPL. Bug reports and feature requests are welcome.
* Designed for unattended use. Set it up and forget about it (kinda Okayeg)
* No need to register a dedicated Twitch application for it
* Should run just fine on Windows, OSX and GNU/Linux. Should run, but no sound playback on BSDs (TBI).
## What does this do? ##
This simple nodejs program joins a bunch of Twitch channels for ya, so you can yoink gifted subs and event emotes WideHardo
## What doesn't this program do ##
It will not say anything under your name. You are just another name in the viewer list that nobody checks anyway pepeLaugh
## How to use? FeelsDankMan ##
1. Download or clone the repo
2. Copy config.js.example to config.js
3. Open config.js in a text editor and fill out the config. Instruction are inside
4. create a file called "channels.txt" and fill it with channels you want to be in, one channel per line. Empty and too short lines are ignored
5. Download and install node.js. I develop it on Node 12.xLTS and run it on 10.xLTS, so I recommend using 12.xLTS if you don't use it otherwise
6. Run npm install in the project's folder to install the required modules
7. Run the program with "node triLaud.js"
8. optional: Install the pm2 process manager (https://pm2.keymetrics.io/) and run the program with "pm2 triLaud.js". pm2 will automatically restart it on case of crashes and errors I can only handle with terminating the application
## Acknowledgements ##
This program was inspired by https://github.com/zneix/trihard-kkona

Twitch is trademark of Twitch Interactive Inc.

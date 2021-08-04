# trilaud
Gifted sub farmer for Twitch TriHard :handshake: VisLaud
## Features ##
* Synchronous channel join, respects the [recently enforced ratelimits](https://dev.twitch.tv/docs/irc/guide#authentication-and-join-rate-limits). Join more than 20 channels without issues.
* Optional: play a sound when you get a gift
* Optional: monitor pings (mentions), play a sound in addition if enabled
* Add new channels without restarting. Just add the new channels to channels.txt and send the program a SIGUSR1
* [Free software](https://www.gnu.org/philosophy/free-sw.html) under the [GNU GPL](https://www.gnu.org/licenses/gpl-3.0.html). Bug reports and feature requests are welcome.
* Designed for unattended use. Set it up and forget about it (kinda Okayeg)
* No need to register a dedicated Twitch application for it
* Should run just fine on Windows, OSX and GNU/Linux. On Free and Dragonfly BSD you'll need the alsa utils compatibility package to hear sounds
* Shoult run on other platforms supported by node.js, but without sound playback for now.
* No architecture specifc code I know of. You can run it on your Raspberry PI 24/7! (this is how I use it akshually 🤓)

## What does this do? ##
This simple nodejs program joins a bunch of Twitch channels for ya, so you can yoink gifted subs and event emotes WideHardo
## What doesn't this program do ##
It will not say anything under your name. You are just another name in the viewer list that nobody checks anyway pepeLaugh
## Why does it join channels so slow? forsenY ##
As mentioned before [Twitch limits the rate of how many channels you can join under a given time](https://dev.twitch.tv/docs/irc/guide#authentication-and-join-rate-limits). For non-"verified bot" accounts this is 20 channel joins per 10 seconds. The program joins one channel once per at least 580ms, a safe value (roughly 17 joins per 10 seconds). From my experience with twitch ratelimits it's best to play safe. To reduce the impact of this (as also mentioned) you can add more channels without restarting. Just add the new channels to channels.txt and send SIGUSR1 to the program.
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

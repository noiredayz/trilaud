# trilaud
Any homies? WideHardo

## Upgrade notification ##
In the 2023-02-12 upgrade I converted parts of the project from "Common JS" to "JS modules" BAAAAAAAAAT
This means you'll need to reformat your config file! Check the example as always on how to.
This was required because dependencies used by this program and many others no longer provice cjs exports, 
only mjs meaning if you stay on cjs, you stay on bugs and security issues the devs only fix in the maintained, mjs versions.

In the 2022-11-26 release I changed how some thing with authentication and self-identity works.
In the config the "username" setting is no longer used. The program will use the oauth code + a required
client ID to determine who the oauth belongs to. See config.js.example for explanation.


## Wadu hek? ##
triLaud is a simple yet feature rich application that joins a bunch of
Twitch channels using supplied credentials and collects publicly available
information about gifted subs and -depending on how you configured it- alerts
you that you got a gifted sub. It also features an extremely light, Internet Explorer 5.0
compatible web interface to view stats about gifts.

## Features ##
* Designed for unattended use, best used with pm2 process manager
* Respects the channel join ratelimits, join -theoretically- any amount of channels
* Join new channels without restart
* Simple configuration via plaintext. No database service required.
* OS and hardware independent
* Reasonably few dependencies. SSD friendly :)
* Low hardware requirements. You can run it on your dusty PI1, decomissioned smartphone or tablet with broken screen
* Sends you an audible alert when you get a gift or get pinged (both configurable)
* Reload channels (and add new channels) using an UNIX signal (Unix-like OS') or web interface (any OS)
* Supa minimal, no bullshit web interface w/ JSON API
* [Free software](https://www.gnu.org/philosophy/free-sw.en.html) under the GNU GPL version 3
 
## System requirements ##
* NodeJS 16.x LTS
* any OS that can run node 10
* any hardware that can run an OS that can run node 10. Tested and used on 32bit hardfloat ARM and x86
* Internet connection
* 60MB free RAM and 11MB free space (additional free space is required for node and log files of PM2 if used)
* sound playback requires Windows 7+, Linux, OpenBSD, FreeBSD or DragonfyBSD. Additional OS' may be supported once I add them to [node-wav-player](https://github.com/noiredayz/node-wav-player)

## How to use? ##
1. Download or clone the repo 
2. Copy config.js.example to config.js
3. Open config.js in a text editor and fill out the config. Instruction are inside
4. create a file called "channels.txt" and fill it with channels you want to be in, one channel per line. Empty and too short lines are ignored
5. Download and install node.js. I recommend using Note 16LTS if you don't use node yourself.
6. Run **npm si** in the project's folder to install the required modules. Of course you can use **npm install** too, however **si** installs the same verisons of packages I have on my dev pc and also in the packages-lock.json, minimizing the chance of incompatibility errors.
7. Run the program with "node triLaud.js"
8. optional: Install the [pm2 process manager](https://pm2.keymetrics.io/) and run the program with "pm2 start triLaud.js". pm2 will automatically restart it on case of crashes and errors I can only handle with terminating the application
9. On updates: check the console or config.js.example for added new options that require setup

## http interface ##
triLaud has an integrated web server (nodejs http server based, no additional bloat) for stats and reload option (for Windows users this is the only way reload works). 
If you don't need/don't want this functionality set http port to 0 in the config (or remove the setting).

**On systems that are accessible by other on the network I recommend setting the web server IP address to localhost or setting up firewall rules to prevent unauthorized access**

HTML Endpoints (for humans like us):
* / : stats in html
* /reload : issue a reload command, reply in html
* /stats/channel : Channel stats in html (how many gifts per channel)
* /stats/oilers : Individual gifter stats in html (anons are grouped into one)
* /teapot: Okayga TeaTime


JSON Endpoints (for machines, not for us humans):
* /api/reload : issue a reload command, reply in JSON
* /stats/json: basic stats in json (mem usage is in bytes. Rest speaks for themselves)
* /stats/channel/json: Channel stats in json
* /stats/oilers/json: Individual gifter stats in json (anons are grouped into one)
* /teapot/json: Okayga TeaTime (in JSON, robots like tea too)

## Running multiple instances ##
1. Create a directory in the programs main dir. The subdirectory "alts" will be ignored by git, I suggest creating alts' directories there
2. Put a config.js and channels.txt inside that dir. Make sure you set up different credentials and if you use http a different port set a different one
3. start the program with the parameters **-d [cfgdir]** 
4. A pid file you can use to send a SIGUSR2 to the new process will be created inside that directory

I didn't really test it, but alts joining channels might affects each others ratelimits. I suggest you start alts after each other and not parallel.

## Changelog ##
* **2025-03-09** updated dependencies
* **2023-02-12** Conversion to MJS
* **2022-11-26** Now uses Helix to confirm own identity
* **2022-01-02** New year, new and upaded deps
* **2021-12-19** VIET_ _ _ ?
* **2021-10-01** I confirmed with high confidence that you cannot farm subs this way. It was a fun ride bois.
* **2021-09-14** Added another JSON endpoint for general stats
* **2021-08-29** Added JSON endpoints for statistics pages.
* **2021-08-25** Fixed an issue where pidfile writing threw a TypeError on node 14+
* **2021-08-23** Added support for running multiple instances
* **2021-08-16** Added donk stats pages (WIP, planned features: better looks, options to order then)
* **2021-08-14** Now counts gifts detected per session, added stats to web interface. Added high quality OC favicon.
* **2021-08-13** Added httpHost variable so integrated server can listen on network.
* **2021-08-12** Added a JSON endpoint (/api/reload) to http server, because we need JSON API in gifted sub farmer NaM
* **2021-08-12** v0.1.2 - PagMan new option and function: http server. Add the new httpPort variable to config then navigate to http://localhost:*port* for a supa simple page for channel stats and reload option for Winfriends. More stats coming soon!
* **2021-08-12** v0.1.1 - Changed reload signal for Unix like OS' from USR1 to USR2, as USR1 is reserved (kinda) by node for the debugger and listening to it may cause issues when ran with the debugger.
* **2021-08-09** New option: colorful output. New dependency: [chalk](https://github.com/chalk/chalk) Report JoinError's only at one place.
* **2021-08-09** Started tracking changes FeelsOkayMan. Version 0.0.1 -> 0.1.1

## Contact ##
You can find me with questions etc. over at https://twitch.tv/noiredayz

## Acknowledgements ##
This program was inspired by https://github.com/zneix/trihard-kkona

Twitch is trademark of Twitch Interactive Inc.

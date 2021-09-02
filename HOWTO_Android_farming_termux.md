# Android setup
triLaud can be run on your smartphone (you guys have phones, right? monkaLaugh ), giving you a cost
effective way to farm, especially since most people have at least one decomissioned phone laying around.

Knowledge of terminal and android FS is required. No promises or warranties of any kind.

## Method 1 ##
1. Download the program to your desktop
2. Set up config.js according to the README
3. Create channels.txt with channels inside or download someone else's
4. Transfer the program directory with config files to your Android device
5. See the "second part" below on further steps

## Method 2 ##
1. Download the program on your phone
2. unpack the zip file to somewhere, you'll need an unpacker
3. Set up config.js, there are plenty of free code editors in the play store to edit it
4. Create a channels.txt or download someone else's. Copy it to the programs directory
5. See below on how to resume

## Second part ##
1. Install termux from [the Play store](https://play.google.com/store/apps/details?id=com.termux) or from [F-Droid](https://f-droid.org/en/packages/com.termux/)
2. Open termux FDM
3. install node.js: apt install nodejs
4. install pm2 process manager: npm install -g pm2
5. change directory to where you put trilaud to, for example: cd /storage/emulated/0/Download/trilaud/
6. start it with pm2 start triLaud.js --attach
7. Enjoy your gifted subs (max 10 random gifts/mo). Sound play may not work, playing sounds form android chroots/terminals was always a hassle.

Thanks for dogesobaka for writing a draft for this guide and trying out this method.

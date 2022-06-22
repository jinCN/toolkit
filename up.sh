git pull | grep package-lock && npm i
pm2 delete all; pm2 start pm2.config.js && pm2 log

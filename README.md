# Rinnovatore connessione Praticelli
Applicazione desktop che rinnova automaticamente il login necessario per utilizzare la connessione a internet nella residenza universitaria Praticelli del DSU di Pisa. Realizzata in Electron e NodeJS, facendo uso di Puppeteer per comandare un'istanza headless di Chromium.

## Come si installa
Scaricare l'installer:
* Windows
* Mac
* Linux

## Istruzioni per compilare i sorgenti (sistemi Linux)
Installare npm (saltare se è già installato nel sistema):
`sudo apt install npm`

Installare NodeJS (saltare se è già installato nel sistema):
``` Shell Session
sudo snap install curl
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Scaricare i sorgenti ed compilarli:

``` Shell Session
git clone https://github.com/alessandro-antonelli/RinnovatoreConnessionePraticelli
cd RinnovatoreConnessionePraticelli
npm install --save-dev @electron-forge/cli

#per eseguire il programma
npm start

#per creare la build
npm update
sudo apt-get install rpm
npm run make
```

Nel caso non dovesse farlo da solo, installare manualmente le dipendenze:
``` Shell Session
npm i --save-dev electron
npm install electron-store
npm i puppeteer
npm i ping
```

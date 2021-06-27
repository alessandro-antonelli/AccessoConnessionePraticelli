const { app, BrowserWindow } = require('electron');
const rinnovatore = require('./rinnovatore.js');
const StoreProvider = require('electron-store');
const config = new StoreProvider({name: 'config', encryptionKey: '9YiBu5#lHygy' });
const { ipcMain } = require('electron');
const path = require('path');
var FinestraPrincipale;

app.whenReady().then(() =>
{
	AvviaFinestraPrincipale();
	if(config.get('attivo') == true && config.has('username') && config.has('password')) rinnovatore.AvviaMonitoraggio(FinestraPrincipale);

	ipcMain.on('attivato', (event, arg) => { rinnovatore.AvviaMonitoraggio(FinestraPrincipale); })
	ipcMain.on('disattivato', (event, arg) => { rinnovatore.SpegniMonitoraggio(); })
})

function AvviaFinestraPrincipale()
{
	FinestraPrincipale = new BrowserWindow(
		{
			show: false,
			title: 'Accesso connessione Praticelli',
			width: 350,
			height: 500,
			resizable: false,
			webPreferences: {
				preload: path.join(__dirname, 'index.js')
			}
		})
	FinestraPrincipale.setMenuBarVisibility(false);
	FinestraPrincipale.setIcon(path.join(__dirname, 'icona-app.png'));
	FinestraPrincipale.loadFile('index.html');

	FinestraPrincipale.webContents.on('did-finish-load', function()
	{
		FinestraPrincipale.show();
	})
}
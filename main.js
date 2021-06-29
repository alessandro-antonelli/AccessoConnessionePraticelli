const { app, BrowserWindow, electron, Tray, dialog } = require('electron');
const rinnovatore = require('./rinnovatore.js');
const StoreProvider = require('electron-store');
const config = new StoreProvider({name: 'config', encryptionKey: '9YiBu5#lHygy' });
const { ipcMain } = require('electron');
const path = require('path');

var FinestraPrincipale;
var tray;

if(require('electron-squirrel-startup')) return app.quit();

app.on('window-all-closed', e => e.preventDefault() )

app.whenReady().then(() =>
{
	if (process.platform === 'win32') app.setAppUserModelId(app.name);
	config.delete('log');

	tray = new Tray(path.join(__dirname, 'icon_small.png'));
	tray.setToolTip('Accesso connessione Praticelli');
	tray.on('click', ToggleFinestraPrincipale);
	tray.on('right-click', ToggleFinestraPrincipale);

	if(config.get('AutoStartup') != true) AvviaFinestraPrincipale();
	if(config.get('attivo') == true && config.has('username') && config.has('password')) rinnovatore.AvviaMonitoraggio();

	ipcMain.on('attivato', (event, arg) => { rinnovatore.AvviaMonitoraggio(); })
	ipcMain.on('disattivato', (event, arg) => { rinnovatore.SpegniMonitoraggio(); })

	ipcMain.on('quit', ChiudiApp.bind(null, FinestraPrincipale));

	ipcMain.on('AttivaStartup', (event, arg) =>
		{
			app.setLoginItemSettings({
				openAtLogin: true,
				path: app.getPath("exe")
			});
		})
	ipcMain.on('DisattivaStartup', (event, arg) =>
		{
			app.setLoginItemSettings({
				openAtLogin: false,
				path: app.getPath("exe")
			});
		})
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
			minimizable: false,
			webPreferences: {
				preload: path.join(__dirname, 'index.js')
			}
		})
	FinestraPrincipale.setMenuBarVisibility(false);
	FinestraPrincipale.setIcon(path.join(__dirname, 'icon_small.png'));
	FinestraPrincipale.loadFile('index.html');

	FinestraPrincipale.webContents.on('did-finish-load', function()
	{
		FinestraPrincipale.show();
		FinestraPrincipale.webContents.send('versione', app.getVersion());
	})

	rinnovatore.AggiornaFinestraUI(FinestraPrincipale);
}

function ToggleFinestraPrincipale()
{
	if(FinestraPrincipale == null || FinestraPrincipale.isDestroyed() ) AvviaFinestraPrincipale();
	else { FinestraPrincipale.close(); FinestraPrincipale = null; rinnovatore.AggiornaFinestraUI(null); }
}

function ChiudiApp(FinestraPrincipale)
{
	const risposta = dialog.showMessageBoxSync(FinestraPrincipale,
	{
		title: "Uscire?",
		message: "Vuoi davvero chiudere il programma? Il rinnovo automatico del login sarà interrotto.",
		type: "question",
		defaultId: 1,
		cancelId: 1,
		buttons: ["Si", "No"],
		noLink: true
	});
	
	if(risposta == 0)
	{
		if(FinestraPrincipale != null && !FinestraPrincipale.isDestroyed() ) FinestraPrincipale.destroy();
		app.quit();
	}
}
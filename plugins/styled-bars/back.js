const { injectCSS } = require("../utils");
const { Menu } = require("electron");
const path = require("path");
const electronLocalshortcut = require("electron-localshortcut");
const config = require("../../config");
var { mainMenuTemplate } = require("../../menu");

//override menu template for custom menu
const originTemplate = mainMenuTemplate;
mainMenuTemplate = function (winHook) {
	//get template
	let template = originTemplate(winHook, false, (item) => {
		checkCheckbox(item);
	});
	//return as normal
	return template;
};
//win hook for fixing menu
let win;

//check that menu doesn't get created twice
let done = false;

module.exports = (winImport) => {
	win = winImport;
	// css for custom scrollbar + disable drag area(was causing bugs)
	injectCSS(win.webContents, path.join(__dirname, "style.css"));
	win.on("ready-to-show", () => {
		// (apparently ready-to-show is called twice)
		if (done) {
			return;
		}
		done = true;
		let template = mainMenuTemplate(win);
		let menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);

		//register keyboard shortcut && hide menu if hideMenu is enabled
		if (config.get("options.hideMenu")) {
			switchMenuVisibility();
			electronLocalshortcut.register(win, "Esc", () => {
				switchMenuVisibility();
			});
		}
	});
};

let visible = true;
function switchMenuVisibility() {
	visible = !visible;
	win.webContents.send("updateMenu", visible);
}

function checkCheckbox(item) {
	//check item
	item.checked = !item.checked;
	//update menu (closes it)
	win.webContents.send("updateMenu", true);
}

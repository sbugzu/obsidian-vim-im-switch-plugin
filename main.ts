import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, Workspace } from 'obsidian';
import { exec } from "child_process";
import { promisify } from "util";

interface VimIMSwitchSettings {
    config_cmdPath: string;
    config_defaultInput: string;
    config_CJKVInput: string;
}

const DEFAULT_SETTINGS: VimIMSwitchSettings = {
    config_cmdPath: '/usr/local/bin/macism',
    config_defaultInput: 'com.apple.keylayout.ABC',
    config_CJKVInput: 'im.rime.inputmethod.Squirrel.Rime',
}

const pexec = promisify(exec);

enum IMStatus {
	None,
	Activate,
	Deactivate,
}

export default class VimIMSwitchPlugin extends Plugin {
	settings: VimIMSwitchSettings;
	imStatus = IMStatus.None;
    cmdPath = "";
    defaultInput = "";
    CJKVInput = "";

	async onload() {
		console.log('loading plugin VimIMSwitchPlugin.');

		await this.loadSettings();

		// this.addStatusBarItem().setText('Vim IM Swith Enabled');

		this.addSettingTab(new IMSwitchSettingTab(this.app, this));

		this.registerCodeMirror((cmEditor: CodeMirror.Editor) => {
			// {mode: string, ?subMode: string} object. Modes: "insert", "normal", "replace", "visual". Visual sub-modes: "linewise", "blockwise"}
			cmEditor.on("vim-mode-change", this.onVimModeChange);
		});
	}

	onVimModeChange = async (cm: any) => {
		if (cm.mode == "normal" || cm.mode == "visual") {
			// await this.getFcitxRemoteStatus();
			if (this.imStatus == IMStatus.Activate) {
				await this.deactivateIM();
			}
		} else if (cm.mode == "insert" || cm.mode == "replace") {
			if (this.imStatus == IMStatus.Deactivate || this.imStatus == IMStatus.None) {
				await this.activateIM();
			}
		}
	}

	async runCmd(cmd: string, args: string[] = []) : Promise<string>{
		const output = await pexec(`${cmd} ${args.join(" ")}`);
		return output.stdout;
	}

	/* async getFcitxRemoteStatus() {
	 *     if (this.cmdPath == "") {
	 *         console.log("VIM-IM-Switch-pugin: cannot get fcitx-remote path, please set it correctly.");
	 *         return;
	 *     }
	 *     let fcitxRemoteOutput = await this.runCmd(this.cmdPath);
	 *     fcitxRemoteOutput = fcitxRemoteOutput.trimRight();
	 *     if (fcitxRemoteOutput == "1") {
	 *         this.imStatus = IMStatus.Deactivate;
	 *     } else if (fcitxRemoteOutput == "2") {
	 *         this.imStatus = IMStatus.Activate;
	 *     } else {
	 *         this.imStatus = IMStatus.None;
	 *     }
	 *     console.log("Vim-IM-Swith-plugin: IM status " + this.imStatus.toString());
	 * } */

	async activateIM() {
		if (this.cmdPath == "") {
			console.log("VIM-IM-Switch-pugin: cannot get fcitx-remote path, please set it correctly.");
			return;
		}
		const output = await this.runCmd(this.cmdPath, this.CJKVInput);
        this.imStatus = IMStatus.Activate;
		console.log("Vim-IM-Swith-plugin: activate IM " + output);
	}
	async deactivateIM() {
		if (this.cmdPath == "") {
			console.log("VIM-IM-Switch-pugin: cannot get fcitx-remote path, please set it correctly.");
			return;
		}
		const output = await this.runCmd(this.cmdPath, this.defaultInput);
        this.imStatus = IMStatus.Deactivate;
		console.log("Vim-IM-Swith-plugin: deactivate IM " + output);
	}

	onunload() {
		this.app.workspace.iterateCodeMirrors((cm: CodeMirror.Editor) => {
			cm.off("vim-mode-change", this.onVimModeChange);
		});
		console.log('unloading plugin VimIMSwitchPlugin.');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.updateCurrentConfig();
	}

	async updateCurrentConfig() {
        this.cmdPath = this.settings.config_cmdPath;
        this.defaultInput = this.settings.config_defaultInput;
        this.CJKVInput = this.settings.config_CJKVInput;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class IMSwitchSettingTab extends PluginSettingTab {
	plugin: VimIMSwitchPlugin;

	constructor(app: App, plugin: VimIMSwitchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Vim IM Switch plugin.'});

		new Setting(containerEl)
			.setName('Command Path')
			.setDesc('The absolute path to bin file, such as: fcitx-remote, im-select, macism .etc')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.config_cmdPath)
				.setValue(this.plugin.settings.config_cmdPath)
				.onChange(async (value) => {
					this.plugin.settings.config_cmdPath = value;
					this.plugin.updateCurrentConfig();
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Switching Default Input')
			.setDesc('Default input name or argument, such as: com.apple.keylayout.ABC or -c')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.config_defaultInput)
				.setValue(this.plugin.settings.config_defaultInput)
				.onChange(async (value) => {
					this.plugin.settings.config_defaultInput = value;
					this.plugin.updateCurrentConfig();
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Switching CJKV Input')
			.setDesc('CJKV Input name or argument, such as: im.rime.inputmethod.Squirrel.Rime or -t')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.config_CJKVInput)
				.setValue(this.plugin.settings.config_CJKVInput)
				.onChange(async (value) => {
					this.plugin.settings.config_CJKVInput = value;
					this.plugin.updateCurrentConfig();
					await this.plugin.saveSettings();
				}));
	}
}

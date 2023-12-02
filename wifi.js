import {Shell as _Shell} from 'xeue-shell';
import os from 'os';

export default class WiFi {
	constructor(Logs, sudo = false) {
		this.Logs = Logs;
		this.Shell = new _Shell(this.Logs, 'NETWRK', 'D', 'bash');
		this.sudo = sudo ? 'sudo ' : '';
	}

	/*
	* [
	*   {
	*     interface: 'wlan0',
	*     access_point: '00:0b:81:95:12:21',
	*     frequency: 2.437,
	*     ieee: '802.11bg',
	*     mode: 'master',
	*     noise: 0,
	*     quality: 77,
	*     sensitivity: 0,
	*     signal: 50,
	*     ssid: 'RaspberryPi'
	*   },
	*   {
	*     interface: 'wlan1',
	*     frequency: 2.412,
	*     mode: 'auto',
	*     noise: 0,
	*     quality: 0,
	*     sensitivity: 0,
	*     signal: 0,
	*     unassociated: true
	*   }
	* ]
	*/
	async status(iface = '') {
		if (os.platform() !== 'linux') return {};
		const command =  iface == '' ? 'iwconfig' : `iwconfig ${iface}`;
		const {stdout} = await this.Shell.run(this.sudo+command, false);
		if (iface == '') return this.#parse_status(stdout[0]);
		else return [this.#parse_status_block(stdout[0].trim())];
	}

	/*
	* [
	*	{
	*     address: '00:0b:81:ab:14:22',
	*     ssid: 'BlueberryPi',
	*     mode: 'master',
	*     frequency: 2.437,
	*     channel: 6,
	*     security: 'wpa',
	*     quality: 48,
	*     signal: 87
	*   },
	*   {
	*     address: '00:0b:81:95:12:21',
	*     ssid: 'RaspberryPi',
	*     mode: 'master',
	*     frequency: 2.437,
	*     channel: 6,
	*     security: 'wpa2',
	*     quality: 58,
	*     signal: 83
	*   }
	* ]
	*/
	async scan(iface = '', show_hidden = false, ssid) {
		if (os.platform() !== 'linux') return {};
		const extra_params = ssid ? ' essid ' + ssid : '';
		const {stdout} = await this.Shell.run(this.sudo+`iwlist ${iface} scan${extra_params}`, false);
		return this.#parse_scan(stdout[0], show_hidden)
	}

	#has_ssid(network) {
		return network.ssid;
	}
  
	#has_keys(network) {
		return Object.keys(network).length !== 0;
	}
  
	#by_signal(a, b) {
		return b.signal - a.signal;
	}
  
	#parse_cell(cell) {
		var parsed = { };
		var match;
	
		if ((match = cell.match(/Address\s*[:|=]\s*([A-Fa-f0-9:]{17})/))) {
			parsed.address = match[1].toLowerCase();
		}
	
		if ((match = cell.match(/Channel\s*([0-9]+)/))) {
			parsed.channel = parseInt(match[1], 10);
		}
	
		if ((match = cell.match(/Frequency\s*[:|=]\s*([0-9\.]+)\s*GHz/))) {
			parsed.frequency = parseFloat(match[1]);
		}
	
		if ((match = cell.match(/Mode\s*[:|=]\s*([^\s]+)/))) {
			parsed.mode = match[1].toLowerCase();
		}
	
		if ((match = cell.match(/Quality\s*[:|=]\s*([0-9]+)/))) {
			parsed.quality = parseInt(match[1], 10);
		}
	
		if ((match = cell.match(/Signal level\s*[:|=]\s*(-?[0-9]+)/))) {
			parsed.signal = parseInt(match[1], 10);
		}
	
		if ((match = cell.match(/Noise level\s*[:|=]\s*(-?[0-9]+)/))) {
			parsed.noise = parseInt(match[1], 10);
		}
	
		if ((match = cell.match(/ESSID\s*[:|=]\s*"([^"]+)"/))) {
			parsed.ssid = match[1];
		}
	
		if ((match = cell.match(/WPA2\s+Version/))) {
			parsed.security = 'wpa2';
		}
		else if ((match = cell.match(/WPA\s+Version/))) {
			parsed.security = 'wpa';
		}
		else if ((match = cell.match(/Encryption key\s*[:|=]\s*on/))) {
			parsed.security = 'wep';
		}
		else if ((match = cell.match(/Encryption key\s*[:|=]\s*off/))) {
			parsed.security = 'open';
		}
	
		return parsed;
	}
  
	#parse_scan(stdout, show_hidden) {
		if (show_hidden) {
			return stdout
				.split(/Cell [0-9]+ -/)
				.map(this.#parse_cell)
				.filter(this.#has_keys)
				.sort(this.#by_signal);
		} else {
			return stdout
				.split(/Cell [0-9]+ -/)
				.map(this.#parse_cell)
				.filter(this.#has_ssid)
				.sort(this.#by_signal);
		}
	}

	#parse_status_block(block) {
		var match;

		// Skip out of the block is invalid
		if (!block) return;

		var parsed = {
			interface: block.match(/^([^\s]+)/)[1]
		};

		if ((match = block.match(/Access Point:\s*([A-Fa-f0-9:]{17})/))) {
			parsed.access_point = match[1].toLowerCase();
		}

		if ((match = block.match(/Frequency[:|=]\s*([0-9\.]+)/))) {
			parsed.frequency = parseFloat(match[1]);
		}

		if ((match = block.match(/IEEE\s*([^\s]+)/))) {
			parsed.ieee = match[1].toLowerCase();
		}

		if ((match = block.match(/Mode[:|=]\s*([^\s]+)/))) {
			parsed.mode = match[1].toLowerCase();
		}

		if ((match = block.match(/Noise level[:|=]\s*(-?[0-9]+)/))) {
			parsed.noise = parseInt(match[1], 10);
		}

		if ((match = block.match(/Link Quality[:|=]\s*([0-9]+)/))) {
			parsed.quality = parseInt(match[1], 10);
		}

		if ((match = block.match(/Sensitivity[:|=]\s*([0-9]+)/))) {
			parsed.sensitivity = parseInt(match[1], 10);
		}

		if ((match = block.match(/Signal level[:|=]\s*(-?[0-9]+)/))) {
			parsed.signal = parseInt(match[1], 10);
		}

		if ((match = block.match(/ESSID[:|=]\s*"([^"]+)"/))) {
			parsed.ssid = match[1];
		}

		if ((match = block.match(/unassociated/))) {
			parsed.unassociated = true;
		}

		return parsed;
	}
  
	#parse_status(stdout) {
		return stdout.trim().replace(/ {10,}/g, '').split('\n\n').map(this.#parse_status_block).filter(function(i) { return !! i });
	}
}
